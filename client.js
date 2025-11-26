// Game Client
const socket = io();

// Game State
const gameState = {
    players: {},
    myId: null,
    myPlayer: null,
    canvas: null,
    ctx: null,
    keys: {},
    chatOpen: false,
    trees: [],
    rocks: [],
    bushes: [],
    houses: [],
    animationFrame: 0,
    particles: []
};

// Configuration
const CONFIG = {
    PLAYER_SIZE: 40,
    PLAYER_SPEED: 5,
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 3000,
    COLORS: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']
};

// Initialize game
function init() {
    setupLoginScreen();
}

// Setup login screen
function setupLoginScreen() {
    const joinBtn = document.getElementById('join-btn');
    const usernameInput = document.getElementById('username-input');

    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinGame();
        }
    });

    joinBtn.addEventListener('click', joinGame);
}

// Join game
function joinGame() {
    const username = document.getElementById('username-input').value.trim();
    
    if (username.length < 2) {
        alert('Nama minimal 2 karakter!');
        return;
    }

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('player-name').textContent = username;

    setupGame(username);
}

// Setup game canvas and events
function setupGame(username) {
    gameState.canvas = document.getElementById('game-canvas');
    gameState.ctx = gameState.canvas.getContext('2d');

    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Setup controls
    setupControls();

    // Setup chat
    setupChat();

    // Connect to server
    socket.emit('join', { username });

    // Request world objects
    socket.emit('getWorldObjects');

    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Resize canvas
function resizeCanvas() {
    gameState.canvas.width = window.innerWidth;
    gameState.canvas.height = window.innerHeight - 100;
}

// Setup controls
function setupControls() {
    document.addEventListener('keydown', (e) => {
        if (gameState.chatOpen) return;
        
        gameState.keys[e.key.toLowerCase()] = true;
        
        if (e.key === 'Enter') {
            openChat();
        }
    });

    document.addEventListener('keyup', (e) => {
        gameState.keys[e.key.toLowerCase()] = false;
    });
}

// Setup chat
function setupChat() {
    const chatInput = document.getElementById('chat-input');

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        } else if (e.key === 'Escape') {
            closeChat();
        }
    });

    chatInput.addEventListener('blur', () => {
        setTimeout(closeChat, 100);
    });
}

// Open chat
function openChat() {
    gameState.chatOpen = true;
    const chatInput = document.getElementById('chat-input');
    chatInput.style.display = 'block';
    chatInput.focus();
}

// Close chat
function closeChat() {
    gameState.chatOpen = false;
    const chatInput = document.getElementById('chat-input');
    chatInput.style.display = 'none';
    chatInput.value = '';
}

// Send chat message
function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();

    if (message.length > 0) {
        socket.emit('chat', message);
    }

    closeChat();
}

// Add chat message to UI
function addChatMessage(username, message, isSystem = false) {
    const chatMessages = document.getElementById('chat-messages');
    const msgElement = document.createElement('div');
    msgElement.className = isSystem ? 'chat-message system' : 'chat-message';
    
    if (isSystem) {
        msgElement.textContent = message;
    } else {
        msgElement.innerHTML = `<strong>${username}:</strong> ${message}`;
    }

    chatMessages.appendChild(msgElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Remove old messages
    if (chatMessages.children.length > 50) {
        chatMessages.removeChild(chatMessages.firstChild);
    }

    // Auto hide after 10 seconds
    setTimeout(() => {
        msgElement.style.opacity = '0.3';
    }, 10000);
}

// Check collision with objects
function checkCollision(x, y, radius) {
    // Check world boundaries
    if (x - radius < 0 || x + radius > CONFIG.WORLD_WIDTH ||
        y - radius < 0 || y + radius > CONFIG.WORLD_HEIGHT) {
        return true;
    }

    // Check collision with trees
    for (const tree of gameState.trees) {
        const dx = x - tree.x;
        const dy = y - tree.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < radius + tree.size / 2.5) {
            return true;
        }
    }

    // Check collision with rocks
    for (const rock of gameState.rocks) {
        const dx = x - rock.x;
        const dy = y - rock.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < radius + rock.size / 2) {
            return true;
        }
    }

    // Check collision with houses
    for (const house of gameState.houses) {
        const houseWidth = house.size;
        const houseHeight = house.size / 1.5;
        
        // Rectangle collision
        if (x + radius > house.x - houseWidth / 2 &&
            x - radius < house.x + houseWidth / 2 &&
            y + radius > house.y - houseHeight / 2 &&
            y - radius < house.y + houseHeight / 2) {
            return true;
        }
    }

    return false;
}

// Handle player movement
function handleMovement() {
    if (!gameState.myPlayer || gameState.chatOpen) return;

    let dx = 0;
    let dy = 0;

    if (gameState.keys['w'] || gameState.keys['arrowup']) dy -= 1;
    if (gameState.keys['s'] || gameState.keys['arrowdown']) dy += 1;
    if (gameState.keys['a'] || gameState.keys['arrowleft']) dx -= 1;
    if (gameState.keys['d'] || gameState.keys['arrowright']) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    if (dx !== 0 || dy !== 0) {
        const newX = gameState.myPlayer.x + dx * CONFIG.PLAYER_SPEED;
        const newY = gameState.myPlayer.y + dy * CONFIG.PLAYER_SPEED;

        // Check collision before moving
        const playerRadius = CONFIG.PLAYER_SIZE / 2;
        
        // Try moving in both axes
        let finalX = gameState.myPlayer.x;
        let finalY = gameState.myPlayer.y;

        // Try X movement
        if (!checkCollision(newX, gameState.myPlayer.y, playerRadius)) {
            finalX = newX;
        }

        // Try Y movement
        if (!checkCollision(gameState.myPlayer.x, newY, playerRadius)) {
            finalY = newY;
        }

        // Try both together if individual movements succeeded
        if (finalX !== gameState.myPlayer.x && finalY !== gameState.myPlayer.y) {
            if (checkCollision(finalX, finalY, playerRadius)) {
                // If diagonal movement causes collision, keep only one axis
                if (Math.abs(dx) > Math.abs(dy)) {
                    finalY = gameState.myPlayer.y;
                } else {
                    finalX = gameState.myPlayer.x;
                }
            }
        }

        // Update position
        gameState.myPlayer.x = finalX;
        gameState.myPlayer.y = finalY;

        // Send position to server
        socket.emit('move', {
            x: gameState.myPlayer.x,
            y: gameState.myPlayer.y
        });
    }
}

// Game loop
function gameLoop() {
    gameState.animationFrame++;
    handleMovement();
    render();
    requestAnimationFrame(gameLoop);
}

// Render game
function render() {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#90EE90');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameState.myPlayer) return;

    // Calculate camera offset (center on player)
    const offsetX = canvas.width / 2 - gameState.myPlayer.x;
    const offsetY = canvas.height / 2 - gameState.myPlayer.y;

    // Apply pixel art rendering
    ctx.imageSmoothingEnabled = false;

    // Draw grass texture
    drawGrassTexture(offsetX, offsetY);

    // Draw grid
    drawGrid(offsetX, offsetY);

    // Draw world objects (sorted by Y position for depth)
    const allObjects = [
        ...gameState.rocks.map(r => ({...r, type: 'rock'})),
        ...gameState.bushes.map(b => ({...b, type: 'bush'})),
        ...gameState.trees.map(t => ({...t, type: 'tree'})),
        ...gameState.houses.map(h => ({...h, type: 'house'})),
        ...Object.values(gameState.players).map(p => ({...p, type: 'player'}))
    ].sort((a, b) => a.y - b.y);

    allObjects.forEach(obj => {
        switch(obj.type) {
            case 'rock':
                drawRock(obj, offsetX, offsetY);
                break;
            case 'bush':
                drawBush(obj, offsetX, offsetY);
                break;
            case 'tree':
                drawTree(obj, offsetX, offsetY);
                break;
            case 'house':
                drawHouse(obj, offsetX, offsetY);
                break;
            case 'player':
                drawPlayer(obj, offsetX, offsetY);
                break;
        }
    });

    // Draw world boundary
    drawWorldBoundary(offsetX, offsetY);

    // Draw minimap
    drawMinimap();

    // Draw particles
    updateAndDrawParticles(offsetX, offsetY);
}

// Draw grass texture
function drawGrassTexture(offsetX, offsetY) {
    const ctx = gameState.ctx;
    const tileSize = 40;
    
    ctx.fillStyle = '#7CFC00';
    
    for (let x = Math.floor(-offsetX / tileSize) - 2; x < Math.floor((gameState.canvas.width - offsetX) / tileSize) + 2; x++) {
        for (let y = Math.floor(-offsetY / tileSize) - 2; y < Math.floor((gameState.canvas.height - offsetY) / tileSize) + 2; y++) {
            const screenX = x * tileSize + offsetX;
            const screenY = y * tileSize + offsetY;
            
            // Alternate grass shades
            if ((x + y) % 2 === 0) {
                ctx.fillStyle = '#7CFC00';
            } else {
                ctx.fillStyle = '#90EE90';
            }
            
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
            
            // Add grass details
            ctx.fillStyle = '#228B22';
            const grassCount = 3;
            for (let i = 0; i < grassCount; i++) {
                const gx = screenX + (i * tileSize / grassCount) + 5;
                const gy = screenY + ((x + y + i) % 3) * 10 + 10;
                ctx.fillRect(gx, gy, 2, 4);
            }
        }
    }
}

// Draw grid
function drawGrid(offsetX, offsetY) {
    const ctx = gameState.ctx;
    const gridSize = 100;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= CONFIG.WORLD_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + offsetX, offsetY);
        ctx.lineTo(x + offsetX, CONFIG.WORLD_HEIGHT + offsetY);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= CONFIG.WORLD_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(offsetX, y + offsetY);
        ctx.lineTo(CONFIG.WORLD_WIDTH + offsetX, y + offsetY);
        ctx.stroke();
    }
}

// Draw world boundary
function drawWorldBoundary(offsetX, offsetY) {
    const ctx = gameState.ctx;
    ctx.strokeStyle = '#E74C3C';
    ctx.lineWidth = 4;
    ctx.strokeRect(offsetX, offsetY, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
}

// Draw player with avatar
function drawPlayer(player, offsetX, offsetY) {
    const ctx = gameState.ctx;
    const screenX = player.x + offsetX;
    const screenY = player.y + offsetY;

    // Check if moving
    const isMoving = player.id === gameState.myId && 
        (gameState.keys['w'] || gameState.keys['s'] || gameState.keys['a'] || gameState.keys['d'] ||
         gameState.keys['arrowup'] || gameState.keys['arrowdown'] || gameState.keys['arrowleft'] || gameState.keys['arrowright']);

    // Create walking particles
    if (isMoving && gameState.animationFrame % 5 === 0) {
        createParticle(player.x, player.y + CONFIG.PLAYER_SIZE / 3, 'dust');
    }

    // Draw shadow with pixel style
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    const shadowSize = CONFIG.PLAYER_SIZE / 2;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + CONFIG.PLAYER_SIZE / 2 + 5, shadowSize, shadowSize / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bobbing animation
    const bobOffset = isMoving ? Math.sin(gameState.animationFrame * 0.15) * 3 : Math.sin(gameState.animationFrame * 0.05) * 1;

    // Draw body with pixel art style
    const bodySize = CONFIG.PLAYER_SIZE / 2.5;
    
    // Body outline (black)
    ctx.fillStyle = '#000';
    ctx.fillRect(screenX - bodySize - 1, screenY - bodySize + bobOffset - 1, bodySize * 2 + 2, bodySize * 2 + 2);
    
    // Body fill
    ctx.fillStyle = player.color;
    ctx.fillRect(screenX - bodySize, screenY - bodySize + bobOffset, bodySize * 2, bodySize * 2);

    // Body shading
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(screenX - bodySize, screenY + bobOffset, bodySize * 2, bodySize);

    // Draw head with pixel style
    const headSize = CONFIG.PLAYER_SIZE / 3;
    
    // Head outline
    ctx.fillStyle = '#000';
    ctx.fillRect(screenX - headSize - 1, screenY - headSize * 3 + bobOffset - 1, headSize * 2 + 2, headSize * 2 + 2);
    
    // Head fill
    ctx.fillStyle = '#FFD1A3';
    ctx.fillRect(screenX - headSize, screenY - headSize * 3 + bobOffset, headSize * 2, headSize * 2);

    // Draw eyes (pixel style)
    ctx.fillStyle = '#000';
    const eyeSize = 3;
    ctx.fillRect(screenX - headSize / 2, screenY - headSize * 2.5 + bobOffset, eyeSize, eyeSize);
    ctx.fillRect(screenX + headSize / 2 - eyeSize, screenY - headSize * 2.5 + bobOffset, eyeSize, eyeSize);

    // Draw smile (pixel style)
    ctx.fillStyle = '#000';
    ctx.fillRect(screenX - headSize / 2, screenY - headSize * 1.8 + bobOffset, headSize, 2);

    // Glow effect for current player
    if (player.id === gameState.myId) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + Math.sin(gameState.animationFrame * 0.1) * 0.2;
        ctx.strokeRect(screenX - bodySize - 5, screenY - bodySize + bobOffset - 5, bodySize * 2 + 10, bodySize * 2 + 10);
        ctx.globalAlpha = 1;
    }

    // Draw player name with pixel font style
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Name background (pixel style)
    const nameWidth = ctx.measureText(player.username).width;
    ctx.fillStyle = '#000';
    ctx.fillRect(screenX - nameWidth / 2 - 6, screenY - CONFIG.PLAYER_SIZE - 12, nameWidth + 12, 20);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(screenX - nameWidth / 2 - 5, screenY - CONFIG.PLAYER_SIZE - 11, nameWidth + 10, 18);
    
    // Name text
    ctx.fillStyle = player.id === gameState.myId ? '#FFD700' : '#FFF';
    ctx.fillText(player.username, screenX, screenY - CONFIG.PLAYER_SIZE - 2);
}

// Draw tree
function drawTree(tree, offsetX, offsetY) {
    const ctx = gameState.ctx;
    const screenX = tree.x + offsetX;
    const screenY = tree.y + offsetY;
    const size = tree.size || 60;

    // Shadow (pixel style)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(screenX - size / 3, screenY + size / 2, size / 1.5, size / 8);

    // Trunk (pixel art style)
    const trunkWidth = size / 4;
    const trunkHeight = size / 2;
    
    ctx.fillStyle = '#654321';
    ctx.fillRect(screenX - trunkWidth / 2, screenY + size / 4, trunkWidth, trunkHeight);
    
    // Trunk outline
    ctx.strokeStyle = '#4A3319';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX - trunkWidth / 2, screenY + size / 4, trunkWidth, trunkHeight);
    
    // Trunk texture
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(screenX - trunkWidth / 4, screenY + size / 3, trunkWidth / 2, trunkHeight / 3);

    // Foliage (pixelated circles)
    const sway = Math.sin(gameState.animationFrame * 0.02 + tree.x) * 2;
    
    // Dark green base
    ctx.fillStyle = '#1B5E20';
    drawPixelCircle(ctx, screenX + sway, screenY - size / 3, size / 3);
    
    // Medium green
    ctx.fillStyle = '#2E7D32';
    drawPixelCircle(ctx, screenX - size / 4 + sway, screenY - size / 6, size / 3.5);
    drawPixelCircle(ctx, screenX + size / 4 + sway, screenY - size / 6, size / 3.5);

    // Light green highlights
    ctx.fillStyle = '#4CAF50';
    drawPixelCircle(ctx, screenX - size / 8 + sway, screenY - size / 2.5, size / 6);
    
    // Bright highlight
    ctx.fillStyle = '#81C784';
    drawPixelCircle(ctx, screenX - size / 6 + sway, screenY - size / 2.2, size / 10);
}

// Draw pixel circle helper
function drawPixelCircle(ctx, x, y, radius) {
    const pixelSize = 4;
    for (let px = -radius; px <= radius; px += pixelSize) {
        for (let py = -radius; py <= radius; py += pixelSize) {
            if (px * px + py * py <= radius * radius) {
                ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
            }
        }
    }
}

// Draw rock
function drawRock(rock, offsetX, offsetY) {
    const ctx = gameState.ctx;
    const screenX = rock.x + offsetX;
    const screenY = rock.y + offsetY;
    const size = rock.size || 30;

    // Shadow (pixel style)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(screenX - size / 1.5, screenY + size / 2, size * 1.2, size / 6);

    // Rock body (pixel art)
    ctx.fillStyle = '#696969';
    const rockWidth = size * 1.2;
    const rockHeight = size * 0.8;
    ctx.fillRect(screenX - rockWidth / 2, screenY - rockHeight / 2, rockWidth, rockHeight);

    // Rock outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX - rockWidth / 2, screenY - rockHeight / 2, rockWidth, rockHeight);

    // Rock details/cracks
    ctx.fillStyle = '#A9A9A9';
    ctx.fillRect(screenX - rockWidth / 4, screenY - rockHeight / 4, rockWidth / 2, rockHeight / 3);
    
    ctx.fillStyle = '#808080';
    ctx.fillRect(screenX, screenY, rockWidth / 3, rockHeight / 4);

    // Highlights (pixel style)
    ctx.fillStyle = '#D3D3D3';
    ctx.fillRect(screenX - rockWidth / 3, screenY - rockHeight / 3, size / 4, size / 5);
}

// Draw bush
function drawBush(bush, offsetX, offsetY) {
    const ctx = gameState.ctx;
    const screenX = bush.x + offsetX;
    const screenY = bush.y + offsetY;
    const size = bush.size || 35;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(screenX - size / 2, screenY + size / 3, size, size / 8);

    // Bush body (pixel clusters)
    const pixelSize = 6;
    const colors = ['#2E7D32', '#388E3C', '#43A047', '#4CAF50'];
    
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 * i) / 15;
        const distance = (size / 3) * (0.8 + Math.random() * 0.4);
        const px = screenX + Math.cos(angle) * distance;
        const py = screenY + Math.sin(angle) * distance * 0.6;
        
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillRect(
            Math.floor(px / pixelSize) * pixelSize,
            Math.floor(py / pixelSize) * pixelSize,
            pixelSize,
            pixelSize
        );
    }

    // Center cluster
    ctx.fillStyle = '#66BB6A';
    ctx.fillRect(screenX - pixelSize, screenY - pixelSize, pixelSize * 2, pixelSize * 2);
}

// Draw house
function drawHouse(house, offsetX, offsetY) {
    const ctx = gameState.ctx;
    const screenX = house.x + offsetX;
    const screenY = house.y + offsetY;
    const size = house.size || 80;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(screenX - size / 2, screenY + size / 2, size, size / 8);

    // House body (pixel style)
    const houseWidth = size;
    const houseHeight = size / 1.5;
    
    // Main wall
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(screenX - houseWidth / 2, screenY - houseHeight / 2, houseWidth, houseHeight);
    
    // Wall outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(screenX - houseWidth / 2, screenY - houseHeight / 2, houseWidth, houseHeight);
    
    // Wall texture (bricks)
    ctx.fillStyle = '#8B4513';
    const brickSize = 8;
    for (let bx = 0; bx < houseWidth; bx += brickSize * 2) {
        for (let by = 0; by < houseHeight; by += brickSize) {
            const offsetBrick = (by / brickSize) % 2 === 0 ? 0 : brickSize;
            ctx.fillRect(
                screenX - houseWidth / 2 + bx + offsetBrick,
                screenY - houseHeight / 2 + by,
                brickSize - 1,
                brickSize - 1
            );
        }
    }

    // Roof (pixel style)
    ctx.fillStyle = '#8B0000';
    const roofPoints = [
        [screenX - houseWidth / 1.5, screenY - houseHeight / 2],
        [screenX, screenY - houseHeight * 1.2],
        [screenX + houseWidth / 1.5, screenY - houseHeight / 2]
    ];
    
    ctx.beginPath();
    ctx.moveTo(roofPoints[0][0], roofPoints[0][1]);
    ctx.lineTo(roofPoints[1][0], roofPoints[1][1]);
    ctx.lineTo(roofPoints[2][0], roofPoints[2][1]);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Roof tiles
    ctx.fillStyle = '#A52A2A';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(screenX - houseWidth / 4 + i * 12, screenY - houseHeight / 2 - 10, 10, 4);
    }

    // Door
    const doorWidth = houseWidth / 4;
    const doorHeight = houseHeight / 2.5;
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(screenX - doorWidth / 2, screenY + houseHeight / 6, doorWidth, doorHeight);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX - doorWidth / 2, screenY + houseHeight / 6, doorWidth, doorHeight);
    
    // Door handle
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(screenX + doorWidth / 4, screenY + houseHeight / 3, 3, 3);

    // Window
    const windowSize = houseWidth / 5;
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(screenX + houseWidth / 6, screenY, windowSize, windowSize);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX + houseWidth / 6, screenY, windowSize, windowSize);

    // Window cross
    ctx.beginPath();
    ctx.moveTo(screenX + houseWidth / 6, screenY + windowSize / 2);
    ctx.lineTo(screenX + houseWidth / 6 + windowSize, screenY + windowSize / 2);
    ctx.moveTo(screenX + houseWidth / 6 + windowSize / 2, screenY);
    ctx.lineTo(screenX + houseWidth / 6 + windowSize / 2, screenY + windowSize);
    ctx.stroke();
    
    // Window reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(screenX + houseWidth / 6 + 2, screenY + 2, windowSize / 3, windowSize / 3);
}

// Draw minimap
function drawMinimap() {
    if (!gameState.myPlayer) return;
    
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    const mapSize = 150;
    const mapX = canvas.width - mapSize - 20;
    const mapY = 20;
    const scale = mapSize / CONFIG.WORLD_WIDTH;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);

    // Draw players on minimap
    Object.values(gameState.players).forEach(player => {
        const dotX = mapX + player.x * scale;
        const dotY = mapY + player.y * scale;
        
        ctx.fillStyle = player.id === gameState.myId ? '#FFD700' : player.color;
        ctx.beginPath();
        ctx.arc(dotX, dotY, player.id === gameState.myId ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // Minimap label
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MAP', mapX + mapSize / 2, mapY + mapSize + 15);
}

// Particle system
function createParticle(x, y, type) {
    const particle = {
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2 - 1,
        life: 30,
        maxLife: 30,
        size: Math.random() * 3 + 2,
        type: type
    };
    gameState.particles.push(particle);
}

function updateAndDrawParticles(offsetX, offsetY) {
    const ctx = gameState.ctx;
    
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        
        // Update
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.life--;
        
        // Remove dead particles
        if (p.life <= 0) {
            gameState.particles.splice(i, 1);
            continue;
        }
        
        // Draw
        const screenX = p.x + offsetX;
        const screenY = p.y + offsetY;
        const alpha = p.life / p.maxLife;
        
        ctx.globalAlpha = alpha;
        
        if (p.type === 'dust') {
            ctx.fillStyle = '#D2B48C';
            ctx.fillRect(screenX, screenY, p.size, p.size);
        }
        
        ctx.globalAlpha = 1;
    }
}

// Socket events
socket.on('init', (data) => {
    gameState.myId = data.id;
    gameState.players = data.players;
    gameState.myPlayer = gameState.players[gameState.myId];
});

socket.on('playerJoined', (player) => {
    gameState.players[player.id] = player;
    addChatMessage('', `${player.username} bergabung!`, true);
    updateOnlineCount();
});

socket.on('playerMoved', (data) => {
    if (gameState.players[data.id]) {
        gameState.players[data.id].x = data.x;
        gameState.players[data.id].y = data.y;
    }
});

socket.on('playerLeft', (data) => {
    if (gameState.players[data.id]) {
        addChatMessage('', `${gameState.players[data.id].username} keluar`, true);
        delete gameState.players[data.id];
        updateOnlineCount();
    }
});

socket.on('chatMessage', (data) => {
    addChatMessage(data.username, data.message);
});

socket.on('updatePlayers', (players) => {
    gameState.players = players;
    if (gameState.myId) {
        gameState.myPlayer = gameState.players[gameState.myId];
    }
    updateOnlineCount();
});

socket.on('worldObjects', (data) => {
    gameState.trees = data.trees || [];
    gameState.rocks = data.rocks || [];
    gameState.bushes = data.bushes || [];
    gameState.houses = data.houses || [];
    console.log('World objects loaded:', {
        trees: gameState.trees.length,
        rocks: gameState.rocks.length,
        bushes: gameState.bushes.length,
        houses: gameState.houses.length
    });
});

// Update online count
function updateOnlineCount() {
    const count = Object.keys(gameState.players).length;
    document.getElementById('online-count').textContent = `👥 ${count} online`;
}

// Start game
init();
