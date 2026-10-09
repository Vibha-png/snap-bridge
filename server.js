const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// Protect sensitive / binary files from direct static serving
app.use((req, res, next) => {
    const blockedFiles = [
        "/cloudflared-windows-amd64.exe",
        "/package.json",
        "/package-lock.json",
        "/.gitignore"
    ];
    if (blockedFiles.includes(req.path.toLowerCase()) || req.path.startsWith("/.vscode")) {
        return res.status(403).send("Forbidden");
    }
    next();
});

// Serve static assets from current directory
app.use(express.static(__dirname));

// Open home.html when visiting /
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "home.html"));
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
            room.players.splice(playerIndex, 1);
            socketInstance.leave(code);

            console.log(`User ${socketInstance.id} left room ${code}`);

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
        console.log(`Room created: ${roomCode} by ${socket.id}`);

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
        console.log(`User ${socket.id} (${userName}) joined room ${roomCode}`);

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
});