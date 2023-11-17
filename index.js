const express = require("express");
const socketIO = require("socket.io");
const http = require('http');
const cors = require('cors');
const redis = require('redis');
const { log } = require("console");

const PORT = 3000;
const app = express();
app.use(cors())

const server = http.createServer(app)
const io = socketIO(server, {
    cors: {
        origin: '*',
    }
});

(async () => {

    // Connecting to Redis
    const client = redis.createClient({ socket: { host: 'redis-msgbroker-service', port: 6379 } });
    await client.connect();

    const subscriber = client.duplicate();
    await subscriber.connect();

    await subscriber.subscribe('socketio', (json) => {
        const message = JSON.parse(json)
        if (message.action === "viewUpdate") {
            emitToRooms(message)
        } else if (message.action === "likeUpdate") {
            emitToRooms(message)
        } else if (message.action === "commentUpdate") {
            emitToRooms(message)
        } else if (message.action === "notifUpdate") {
            emitToRooms(message)
        }
    });

})();


function emitToRooms(message) {
    console.log(message.rooms);
    console.log(message.rooms[1]);
    for (const room of message.rooms[1]) {
        console.log("emitting to room: " + room);
        if ("data" in message) {
            console.log(message.data);
            io.to(room).emit(message.action, message.data);
        } else {
            io.to(room).emit(message.action);
        }
    }
}






server.listen(PORT, function () {
    console.log(`Listening on port ${PORT}`);
});


// Handling new socketIO connections
io.on("connection", (socket) => {

    console.log("Client connected");

    socket.on("disconnect", async () => {
        console.log("Client disconnected");
    });

    socket.on('joinRoom', (roomName) => {
        console.log("Joined room " + roomName);
        socket.join(roomName);
    });

    socket.on('leaveRoom', (roomName) => {
        console.log("Left room " + roomName);
        socket.leave(roomName);
    });

});
