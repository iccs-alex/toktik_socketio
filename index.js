const express = require("express");
const socketIO = require("socket.io");
const http = require('http');
const cors = require('cors');
const redis = require('redis');

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
        console.log(message.action);
        console.log(message['action']);
        if(message['action'] === "viewUpdate") {
            io.to(message['room']).emit('viewUpdate', message['viewCount']);
        } else if(message.action === "likeUpdate") {
            io.to(message['room']).emit('likeUpdate', message['likeCount']);
        } else if(message.action === "commentUpdate") {
            io.to(message['room']).emit('commentUpdate');
        } else if(message.action === "notifUpdate") {
            io.to(message['room']).emit('notifUpdate');
        }
    });

})();

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
