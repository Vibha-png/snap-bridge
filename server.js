const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve all files from the plan c folder
app.use(express.static(__dirname));

// Open room.html when visiting /
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "room.html"));
});

// Store active rooms
const rooms = new Map();

io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    // CREATE ROOM
    socket.on("create-room", (roomCode) => {

        socket.join(roomCode);

        rooms.set(roomCode, {
            host: socket.id,
            players: [socket.id]
        });

        socket.roomCode = roomCode;

        console.log(
            `Room ${roomCode} created by ${socket.id}`
        );

        socket.emit("room-created", {
            roomCode: roomCode,
            players: 1
        });
    });


    // JOIN ROOM
    socket.on("join-room", (roomCode) => {

        const room = rooms.get(roomCode);

        if (!room) {

            socket.emit(
                "room-error",
                "Room not found. Please check the room code."
            );

            return;
        }

        if (room.players.length >= 3) {

            socket.emit(
                "room-error",
                "This Snap Bridge room is full."
            );

            return;
        }

        socket.join(roomCode);

        room.players.push(socket.id);

        socket.roomCode = roomCode;

        console.log(
            `${socket.id} joined room ${roomCode}`
        );


        // Tell the person who joined
        socket.emit("room-joined", {
            roomCode: roomCode,
            players: room.players.length
        });


        // Tell everyone in the room
        io.to(roomCode).emit("players-updated", {
            players: room.players.length
        });

    });


    // DISCONNECT
    socket.on("disconnect", () => {

        console.log(
            "User disconnected:",
            socket.id
        );

        const roomCode = socket.roomCode;

        if (!roomCode) return;

        const room = rooms.get(roomCode);

        if (!room) return;

        room.players =
            room.players.filter(
                id => id !== socket.id
            );


        if (room.players.length === 0) {

            rooms.delete(roomCode);

            console.log(
                `Room ${roomCode} deleted`
            );

        } else {

            io.to(roomCode).emit(
                "players-updated",
                {
                    players: room.players.length
                }
            );

        }

    });

});


server.listen(PORT, "0.0.0.0",() =>{

    console.log(
        `Snap Bridge server running on port${PORT}`
    );

});