const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Game state
const players = {};
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

// World objects
const worldObjects = {
    trees: [],
    rocks: [],
    bushes: [],
    houses: []
};

// Generate world objects
function generateWorldObjects() {
    const WORLD_WIDTH = 3000;
    const WORLD_HEIGHT = 3000;

    // Generate trees
    for (let i = 0; i < 80; i++) {
        worldObjects.trees.push({
            x: Math.random() * (WORLD_WIDTH - 200) + 100,
            y: Math.random() * (WORLD_HEIGHT - 200) + 100,
            size: Math.random() * 30 + 50
        });
    }

    // Generate rocks
    for (let i = 0; i < 50; i++) {
        worldObjects.rocks.push({
            x: Math.random() * (WORLD_WIDTH - 200) + 100,
            y: Math.random() * (WORLD_HEIGHT - 200) + 100,
            size: Math.random() * 20 + 25
        });
    }

    // Generate bushes
    for (let i = 0; i < 60; i++) {
        worldObjects.bushes.push({
            x: Math.random() * (WORLD_WIDTH - 200) + 100,
            y: Math.random() * (WORLD_HEIGHT - 200) + 100,
            size: Math.random() * 15 + 30
        });
    }

    // Generate houses
    for (let i = 0; i < 8; i++) {
        worldObjects.houses.push({
            x: Math.random() * (WORLD_WIDTH - 400) + 200,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200,
            size: Math.random() * 20 + 70
        });
    }

    console.log('World objects generated:', {
        trees: worldObjects.trees.length,
        rocks: worldObjects.rocks.length,
        bushes: worldObjects.bushes.length,
        houses: worldObjects.houses.length
    });
}

// Initialize world
generateWorldObjects();

// Get random spawn position
function getRandomSpawnPosition() {
    return {
        x: Math.random() * 2800 + 100,
        y: Math.random() * 2800 + 100
    };
}

// Get random color
function getRandomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    // Handle player join
    socket.on('join', (data) => {
        const spawnPos = getRandomSpawnPosition();
        
        players[socket.id] = {
            id: socket.id,
            username: data.username,
            x: spawnPos.x,
            y: spawnPos.y,
            color: getRandomColor()
        };

        // Send init data to the new player
        socket.emit('init', {
            id: socket.id,
            players: players
        });

        // Notify other players
        socket.broadcast.emit('playerJoined', players[socket.id]);

        console.log(`Player joined: ${data.username} (${socket.id})`);
        console.log(`Total players: ${Object.keys(players).length}`);
    });

    // Handle request for world objects
    socket.on('getWorldObjects', () => {
        socket.emit('worldObjects', worldObjects);
    });

    // Handle player movement
    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;

            // Broadcast to other players
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: data.x,
                y: data.y
            });
        }
    });

    // Handle chat messages
    socket.on('chat', (message) => {
        if (players[socket.id]) {
            const chatData = {
                username: players[socket.id].username,
                message: message,
                timestamp: Date.now()
            };

            // Broadcast to all players including sender
            io.emit('chatMessage', chatData);

            console.log(`Chat - ${chatData.username}: ${message}`);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        if (players[socket.id]) {
            console.log(`Player left: ${players[socket.id].username} (${socket.id})`);
            
            // Notify other players
            socket.broadcast.emit('playerLeft', {
                id: socket.id
            });

            delete players[socket.id];
            console.log(`Total players: ${Object.keys(players).length}`);
        }
    });
});

// Start server
server.listen(PORT, () => {
    console.log('=================================');
    console.log('🎮 Topia.io Clone Server');
    console.log('=================================');
    console.log(`Server running on port ${PORT}`);
    console.log(`Open: http://localhost:${PORT}`);
    console.log('=================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
