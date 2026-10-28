const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Designate Admin accounts
const ADMIN_EMAILS = ["vvibha935@gmail.com", "svandana6361@gmail.com"];

function isAdmin(email) {
    if (!email || typeof email !== "string") return false;
    return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// Data persistence paths
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ACTIVITY_FILE = path.join(DATA_DIR, "activity.json");

if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

function getUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) return [];
        const raw = fs.readFileSync(USERS_FILE, "utf-8");
        return JSON.parse(raw) || [];
    } catch (e) {
        console.error("Error reading users.json:", e);
        return [];
    }
}

function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    } catch (e) {
        console.error("Error saving users.json:", e);
    }
}

function getActivityLogs() {
    try {
        if (!fs.existsSync(ACTIVITY_FILE)) return [];
        const raw = fs.readFileSync(ACTIVITY_FILE, "utf-8");
        return JSON.parse(raw) || [];
    } catch (e) {
        console.error("Error reading activity.json:", e);
        return [];
    }
}

function logActivity({ userEmail, userName, action, details, ip }) {
    try {
        const logs = getActivityLogs();
        const record = {
            id: "act_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
            timestamp: new Date().toISOString(),
            userEmail: userEmail || "Anonymous",
            userName: userName || (userEmail ? userEmail.split("@")[0] : "Guest"),
            action: action || "GENERAL",
            details: details || "",
            ip: ip || "127.0.0.1"
        };
        logs.unshift(record);
        // Keep last 1500 logs to prevent unbounded file growth
        if (logs.length > 1500) logs.length = 1500;
        fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(logs, null, 2), "utf-8");
        return record;
    } catch (e) {
        console.error("Error writing activity.json:", e);
        return null;
    }
}

// Ensure admin accounts are pre-seeded
(function ensureAdminAccounts() {
    const users = getUsers();
    let modified = false;

    ADMIN_EMAILS.forEach(email => {
        let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
            users.push({
                id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
                name: email.split("@")[0] + " (Admin)",
                email: email,
                password: "admin",
                role: "admin",
                isVip: true,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                loginCount: 1
            });
            modified = true;
        } else {
            if (user.role !== "admin" || !user.isVip) {
                user.role = "admin";
                user.isVip = true;
                modified = true;
            }
        }
    });

    if (modified) {
        saveUsers(users);
        console.log("Admin accounts verified and ensured in data/users.json");
    }
})();

// Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// JSON and URL-encoded body parser for API endpoints (with support for base64 photo payloads)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Protect sensitive / binary files from direct static serving
app.use((req, res, next) => {
    const blockedFiles = [
        "/cloudflared-windows-amd64.exe",
        "/package.json",
        "/package-lock.json",
        "/.gitignore"
    ];
    const lowerPath = req.path.toLowerCase();
    if (
        blockedFiles.includes(lowerPath) ||
        lowerPath.startsWith("/.vscode") ||
        lowerPath.startsWith("/data")
    ) {
        return res.status(403).send("Forbidden");
    }
    next();
});

// Redirect legacy /shared_booth.html to the unified booth studio
app.get("/shared_booth.html", (req, res) => {
    const query = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
    res.redirect("/booth.html?mode=shared" + (query ? "&" + query.replace("?", "") : ""));
});

// Serve static assets from current directory
app.use(express.static(__dirname));

// Open home.html when visiting /
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});

// ==========================================
// REST API ENDPOINTS FOR AUTH & ADMIN
// ==========================================

// 1. LOGIN API
app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email) {
        return res.status(400).json({ ok: false, message: "Email is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = getUsers();
    let user = users.find(u => u.email.toLowerCase() === cleanEmail);
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

    if (user) {
        if (password && user.password && user.password !== password) {
            logActivity({
                userEmail: cleanEmail,
                userName: user.name,
                action: "LOGIN_FAILED",
                details: "Failed login attempt (password mismatch)",
                ip: clientIp
            });
            return res.status(401).json({ ok: false, message: "Incorrect password." });
        }

        user.loginCount = (user.loginCount || 0) + 1;
        user.lastLogin = new Date().toISOString();
        if (isAdmin(cleanEmail)) {
            user.role = "admin";
            user.isVip = true;
        }
        saveUsers(users);

        logActivity({
            userEmail: cleanEmail,
            userName: user.name,
            action: "LOGIN",
            details: `User logged in successfully (${user.role === "admin" ? "ADMIN" : "Standard"})`,
            ip: clientIp
        });

        return res.json({
            ok: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVip: !!user.isVip
            }
        });
    }

    // New user logging in for the first time
    const userRole = isAdmin(cleanEmail) ? "admin" : "user";
    const newUser = {
        id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        name: cleanEmail.split("@")[0],
        email: cleanEmail,
        password: password || "password123",
        role: userRole,
        isVip: userRole === "admin",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        loginCount: 1
    };
    users.push(newUser);
    saveUsers(users);

    logActivity({
        userEmail: cleanEmail,
        userName: newUser.name,
        action: "SIGNUP_AND_LOGIN",
        details: `New account registered and logged in (${userRole === "admin" ? "ADMIN" : "Standard"})`,
        ip: clientIp
    });

    res.json({
        ok: true,
        user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            isVip: !!newUser.isVip
        }
    });
});

// 2. SIGNUP API
app.post("/api/auth/signup", (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ ok: false, message: "Email and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = getUsers();
    let existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userRole = isAdmin(cleanEmail) ? "admin" : "user";

    if (existing) {
        existing.name = name || existing.name;
        existing.password = password;
        if (isAdmin(cleanEmail)) {
            existing.role = "admin";
            existing.isVip = true;
        }
        saveUsers(users);
        logActivity({
            userEmail: cleanEmail,
            userName: existing.name,
            action: "SIGNUP_UPDATE",
            details: "Updated existing account credentials during signup",
            ip: clientIp
        });
        return res.json({
            ok: true,
            user: {
                id: existing.id,
                name: existing.name,
                email: existing.email,
                role: existing.role,
                isVip: !!existing.isVip
            }
        });
    }

    const newUser = {
        id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        name: name || cleanEmail.split("@")[0],
        email: cleanEmail,
        password: password,
        role: userRole,
        isVip: userRole === "admin",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        loginCount: 1
    };
    users.push(newUser);
    saveUsers(users);

    logActivity({
        userEmail: cleanEmail,
        userName: newUser.name,
        action: "SIGNUP",
        details: `Created new account (${userRole === "admin" ? "ADMIN" : "Standard"})`,
        ip: clientIp
    });

    res.json({
        ok: true,
        user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            isVip: !!newUser.isVip
        }
    });
});

// 3. RESET PASSWORD API
app.post("/api/auth/reset-password", (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        return res.status(400).json({ ok: false, message: "Email and new password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = getUsers();
    let user = users.find(u => u.email.toLowerCase() === cleanEmail);
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

    if (user) {
        user.password = newPassword;
        saveUsers(users);
    } else {
        const userRole = isAdmin(cleanEmail) ? "admin" : "user";
        users.push({
            id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            name: cleanEmail.split("@")[0],
            email: cleanEmail,
            password: newPassword,
            role: userRole,
            isVip: userRole === "admin",
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            loginCount: 1
        });
        saveUsers(users);
    }

    logActivity({
        userEmail: cleanEmail,
        userName: cleanEmail.split("@")[0],
        action: "PASSWORD_RESET",
        details: "Password reset completed successfully",
        ip: clientIp
    });

    res.json({ ok: true, message: "Password updated successfully." });
});

// 4. ACTIVITY LOG API
app.post("/api/activity/log", (req, res) => {
    const { email, name, action, details } = req.body;
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    logActivity({
        userEmail: email,
        userName: name,
        action: action || "INTERACTION",
        details: details || "",
        ip: clientIp
    });
    res.json({ ok: true });
});

// 5. ADMIN OVERVIEW API (Protected for vvibha935@gmail.com and svandana6361@gmail.com)
app.get("/api/admin/overview", (req, res) => {
    const requesterEmail = (req.query.email || req.headers["x-admin-email"] || "").toString().trim().toLowerCase();
    if (!isAdmin(requesterEmail)) {
        return res.status(403).json({
            ok: false,
            message: "Access denied. Only registered project administrators (vvibha935@gmail.com, svandana6361@gmail.com) can access this data."
        });
    }

    const users = getUsers();
    const logs = getActivityLogs();

    // Calculate active rooms overview
    const activeRoomsList = [];
    for (const [code, room] of rooms.entries()) {
        activeRoomsList.push({
            code: code,
            host: room.host,
            playerCount: room.players.length,
            players: room.players.map(p => ({ id: p.id, name: p.name }))
        });
    }

    // Calculate metrics
    const totalLogins = users.reduce((acc, u) => acc + (u.loginCount || 1), 0);
    const photosSnappedCount = logs.filter(l => l.action === "PHOTO_SNAPPED").length;
    const downloadsCount = logs.filter(l => l.action === "FRAME_DOWNLOADED").length;

    // Sanitize user list for admin view
    const safeUsers = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || (isAdmin(u.email) ? "admin" : "user"),
        isVip: !!u.isVip,
        createdAt: u.createdAt || "N/A",
        lastLogin: u.lastLogin || "N/A",
        loginCount: u.loginCount || 1
    }));

    res.json({
        ok: true,
        stats: {
            totalUsers: users.length,
            totalLogins: totalLogins,
            totalPhotosSnapped: photosSnappedCount,
            totalDownloads: downloadsCount,
            activeRoomsCount: activeRoomsList.length,
            activePlayersCount: activeRoomsList.reduce((acc, r) => acc + r.playerCount, 0),
            adminEmails: ADMIN_EMAILS
        },
        users: safeUsers,
        activeRooms: activeRoomsList,
        recentActivity: logs.slice(0, 200)
    });
});

// 6. CLEAR LOGS API (Admin only)
app.post("/api/admin/clear-logs", (req, res) => {
    const { email } = req.body;
    if (!isAdmin(email)) {
        return res.status(403).json({ ok: false, message: "Unauthorized." });
    }
    const initialLog = [{
        id: "act_" + Date.now(),
        timestamp: new Date().toISOString(),
        userEmail: email,
        userName: email.split("@")[0],
        action: "LOGS_CLEARED",
        details: `Activity logs reset by admin ${email}`,
        ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1"
    }];
    try {
        fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(initialLog, null, 2), "utf-8");
        res.json({ ok: true, message: "Activity logs reset successfully." });
    } catch (e) {
        res.status(500).json({ ok: false, message: "Failed to reset logs." });
    }
});

// 7. DELETE USER API (Admin only)
app.post("/api/admin/delete-user", (req, res) => {
    const { email, targetEmail } = req.body;
    if (!isAdmin(email)) {
        return res.status(403).json({ ok: false, message: "Unauthorized." });
    }
    if (isAdmin(targetEmail)) {
        return res.status(400).json({ ok: false, message: "Cannot delete a primary administrator account." });
    }
    let users = getUsers();
    users = users.filter(u => u.email.toLowerCase() !== targetEmail.toLowerCase());
    saveUsers(users);

    logActivity({
        userEmail: email,
        userName: email.split("@")[0],
        action: "USER_DELETED",
        details: `Deleted user account ${targetEmail}`,
        ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1"
    });

    res.json({ ok: true, message: `User ${targetEmail} removed successfully.` });
});

// Store rooms in memory
const rooms = new Map();

/**
 * Generate a friendly room code in SB-ABC123 format
 */
function generateRoomCode() {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const digits = "23456789";
    let code = "SB-";
    for (let i = 0; i < 3; i++) {
        code += letters[Math.floor(Math.random() * letters.length)];
    }
    for (let i = 0; i < 3; i++) {
        code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
}

/**
 * Cleanly remove a socket from a room or all rooms
 */
function handleLeave(socketInstance, targetRoomCode) {
    for (const [code, room] of rooms.entries()) {
        if (targetRoomCode && code !== targetRoomCode) continue;

        const playerIndex = room.players.findIndex(p => p.id === socketInstance.id);
        if (playerIndex !== -1) {
            const leavingUser = room.players[playerIndex];
            room.players.splice(playerIndex, 1);
            socketInstance.leave(code);

            console.log(`User ${socketInstance.id} (${leavingUser?.name || "User"}) left room ${code}`);

            // Notify remaining peers for WebRTC and room count updates
            io.to(code).emit("user-left", { id: socketInstance.id });
            io.to(code).emit("player-joined", { players: room.players.length });
            io.to(code).emit("players-updated", { players: room.players.length });

            if (room.players.length === 0) {
                rooms.delete(code);
                console.log(`Room ${code} removed (empty)`);
            }
        }
    }
}

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ==========================================
    // CREATE ROOM
    // ==========================================
    socket.on("create-room", (payload, maybeCallback) => {
        const callback = typeof payload === "function" ? payload : maybeCallback;
        const userName = (payload && typeof payload === "object" && payload.name) || "Host";

        let roomCode = generateRoomCode();
        while (rooms.has(roomCode)) {
            roomCode = generateRoomCode();
        }

        rooms.set(roomCode, {
            host: socket.id,
            players: [{ id: socket.id, name: userName }]
        });

        socket.join(roomCode);
        console.log(`Room created: ${roomCode} by ${socket.id} (${userName})`);

        logActivity({
            userEmail: userName,
            userName: userName,
            action: "ROOM_CREATED",
            details: `Created Shared Booth room ${roomCode}`,
            ip: socket.handshake.address
        });

        const response = {
            ok: true,
            success: true,
            roomCode: roomCode,
            players: 1,
            users: [{ id: socket.id, name: userName }]
        };

        if (typeof callback === "function") {
            callback(response);
        }

        socket.emit("room-created", response);
    });

    // ==========================================
    // JOIN ROOM
    // ==========================================
    socket.on("join-room", (data, maybeCallback) => {
        const callback = typeof data === "function" ? data : maybeCallback;
        let roomCode = "";
        let userName = "Friend";

        if (typeof data === "string") {
            roomCode = data.trim().toUpperCase();
        } else if (data && typeof data === "object") {
            roomCode = (data.roomCode || "").toString().trim().toUpperCase();
            userName = (data.name || "Friend").toString().trim();
        }

        if (!roomCode) {
            const errResponse = {
                ok: false,
                success: false,
                message: "Please enter a valid room code.",
                error: "Please enter a valid room code."
            };
            if (typeof callback === "function") callback(errResponse);
            socket.emit("room-error", errResponse.message);
            return;
        }

        let room = rooms.get(roomCode);

        // Auto-create room if it does not exist yet (e.g. shared link created on frontend)
        if (!room) {
            room = {
                host: socket.id,
                players: []
            };
            rooms.set(roomCode, room);
            console.log(`Initialized room ${roomCode} for host ${socket.id}`);
        }

        // Enforce max 3 players per room
        const alreadyInRoom = room.players.some(p => p.id === socket.id);
        if (!alreadyInRoom && room.players.length >= 3) {
            const fullResponse = {
                ok: false,
                success: false,
                message: "Room is full (max 3 players).",
                error: "Room is full (max 3 players)."
            };
            if (typeof callback === "function") callback(fullResponse);
            socket.emit("room-error", fullResponse.message);
            return;
        }

        if (!alreadyInRoom) {
            room.players.push({ id: socket.id, name: userName });
        }

        socket.join(roomCode);
        console.log(`User ${socket.id} (${userName}) joined room ${roomCode} (Total: ${room.players.length}/3)`);

        logActivity({
            userEmail: userName,
            userName: userName,
            action: "ROOM_JOINED",
            details: `Joined Shared Booth room ${roomCode} (${room.players.length}/3 people)`,
            ip: socket.handshake.address
        });

        const usersList = room.players.map(p => ({ id: p.id, name: p.name }));
        const successResponse = {
            ok: true,
            success: true,
            roomCode: roomCode,
            players: room.players.length,
            users: usersList
        };

        if (typeof callback === "function") {
            callback(successResponse);
        }

        // Emit events for all client variants
        socket.emit("room-joined", successResponse);
        socket.to(roomCode).emit("user-joined", { id: socket.id, name: userName });
        io.to(roomCode).emit("player-joined", { players: room.players.length, users: usersList });
        io.to(roomCode).emit("players-updated", { players: room.players.length, users: usersList });
    });

    // ==========================================
    // WEBRTC SIGNALING RELAY & ROOM SYNC
    // ==========================================
    socket.on("signal", ({ to, data, roomCode }) => {
        if (to && data) {
            io.to(to).emit("signal", {
                from: socket.id,
                data: data
            });
        } else if (roomCode && data) {
            socket.to(roomCode).emit("signal", {
                from: socket.id,
                data: data
            });
        }
    });

    socket.on("change-filter", ({ roomCode, filter, css }) => {
        if (roomCode) {
            socket.to(roomCode).emit("filter-changed", { from: socket.id, filter, css });
        }
    });

    // ==========================================
    // SHARED BOOTH REAL-TIME PHOTO & TEMPLATE SYNC
    // ==========================================
    socket.on("sync-snap", ({ roomCode, slotIndex, photoDataUrl, userName }) => {
        if (roomCode) {
            // Broadcast the captured photo to ALL participants in the room so the photo comes together for everyone
            io.to(roomCode).emit("photo-synced", {
                slotIndex: slotIndex,
                photoDataUrl: photoDataUrl,
                from: socket.id,
                userName: userName || "Friend"
            });

            logActivity({
                userEmail: userName || "Participant",
                userName: userName || "Participant",
                action: "PHOTO_SNAPPED",
                details: `Photo snapped into Slot ${slotIndex + 1} in Room ${roomCode}`,
                ip: socket.handshake.address
            });
        }
    });

    socket.on("sync-countdown", ({ roomCode, seconds }) => {
        if (roomCode) {
            io.to(roomCode).emit("countdown-synced", {
                seconds: seconds || 3,
                from: socket.id
            });
        }
    });

    socket.on("sync-template", ({ roomCode, template }) => {
        if (roomCode) {
            socket.to(roomCode).emit("template-synced", {
                template: template,
                from: socket.id
            });
        }
    });

    socket.on("sync-clear-slot", ({ roomCode, slotIndex }) => {
        if (roomCode) {
            io.to(roomCode).emit("slot-cleared-synced", {
                slotIndex: slotIndex,
                from: socket.id
            });
        }
    });

    socket.on("sync-clear-all", ({ roomCode }) => {
        if (roomCode) {
            io.to(roomCode).emit("all-cleared-synced", {
                from: socket.id
            });
        }
    });

    // ==========================================
    // LEAVE ROOM
    // ==========================================
    socket.on("leave-room", (roomCode) => {
        handleLeave(socket, roomCode);
    });

    // ==========================================
    // DISCONNECT
    // ==========================================
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        handleLeave(socket);
    });
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Snap Bridge server running at: http://localhost:${PORT}`);
    console.log(`Registered Admins: ${ADMIN_EMAILS.join(", ")}`);
});
