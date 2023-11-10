const express = require("express");
const socket = require("socket.io");
var cors = require('cors');

const PORT = 3000;
const app = express();
app.use(cors())

const server = app.listen(PORT, function () {
    console.log(`Listening on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});


app.use(express.static("public"));

// Socket setup
const io = socket(server);
let activeUsers = [];
let sessions = {};

io.use((socket, next) => {
    const sessionID = socket.handshake.auth.sessionID;
    if (sessionID) {
        // find existing session
        const session = sessions[sessionID];
        if (session) {
            socket.sessionID = sessionID;
            socket.userID = session.userID;
            socket.username = session.username;
            return next();
        }
    }
    const username = socket.handshake.auth.username;
    if (!username) {
        return next(new Error("invalid username"));
    }
    // create new session
    socket.sessionID = Math.random();
    socket.userID = Math.random();
    socket.username = username;
    sessions[sessionID] = socket;
    next();
});

io.on("connection", (socket) => {
    addActiveUser();
    socket.emit("users", Array.from(activeUsers));

    console.log("User connected: " + socket.id + " " + socket.username);
    // notify existing users
    socket.broadcast.emit("user connected", {
        userID: socket.id,
        username: socket.username,
    });

    socket.on("disconnect", async () => {
        const matchingSockets = await io.in(socket.userID).allSockets();
        const isDisconnected = matchingSockets.size === 0;
        if (isDisconnected) {
            // notify other users
            socket.broadcast.emit("user disconnected", socket.userID);
            // update the connection status of the session
            sessions[socket.sessionID] = {
                userID: socket.userID,
                username: socket.username,
                connected: false,
            };
        }
    });
});

function addActiveUser() {
    for (let [id_, socket_] of io.of("/").sockets) {
        let skipUser = false;
        for(let user_ of activeUsers) {
            if(user_.userID === id_) skipUser = true;
        }
        if(skipUser) continue;

        activeUsers.push({
            userID: id_,
            username: socket_.username,
        });
    }
}
