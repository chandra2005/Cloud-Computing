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
    particles: [],
    chatBubbles: {},
    nearbyHouse: null,
    inGame: false,
    currentGame: null,
    selectedCharacter: {
        color: '#4A90E2',
        name: 'Blue Slime'
    }
};

// Configuration
const CONFIG = {
    PLAYER_SIZE: 45,
    PLAYER_SPEED: 5,
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 3000,
    COLORS: ['#4A90E2', '#50C878', '#FF6B9D', '#FFB84D', '#9B59B6', '#1ABC9C', '#E74C3C', '#F39C12'],
    CHAT_BUBBLE_DURATION: 5000,
    HOUSE_INTERACTION_DISTANCE: 80
};

// Initialize game
function init() {
    setupLoginScreen();
}

// Setup login screen
function setupLoginScreen() {
    const characterOptions = document.querySelectorAll('.character-option');
    const characterSelection = document.getElementById('character-selection');
    const nameInput = document.getElementById('name-input');
    const backBtn = document.getElementById('back-btn');
    const joinBtn = document.getElementById('join-btn');
    const usernameInput = document.getElementById('username-input');

    // Character selection
    characterOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all
            characterOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked
            option.classList.add('selected');
            
            // Save selected character
            gameState.selectedCharacter.color = option.dataset.color;
            gameState.selectedCharacter.name = option.dataset.name;
            
            // Show name input step
            characterSelection.style.display = 'none';
            nameInput.style.display = 'block';
            
            // Update preview
            const preview = document.getElementById('selected-character-preview');
            const previewName = document.getElementById('selected-character-name');
            preview.style.background = option.querySelector('.character-preview').style.background;
            previewName.textContent = gameState.selectedCharacter.name;
            
            // Focus on username input
            usernameInput.focus();
        });
    });

    // Back button
    backBtn.addEventListener('click', () => {
        nameInput.style.display = 'none';
        characterSelection.style.display = 'block';
    });

    // Username input enter key
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinGame();
        }
    });

    // Join button
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
    
    // Make canvas focusable and focus it
    gameState.canvas.tabIndex = 1;
    gameState.canvas.focus();

    // Setup controls
    setupControls();

    // Setup chat
    setupChat();

    // Connect to server with selected character
    socket.emit('join', { 
        username: username,
        color: gameState.selectedCharacter.color
    });

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
        
        // Press E to interact with house
        if (e.key === 'e' || e.key === 'E') {
            if (gameState.nearbyHouse) {
                enterHouseGame(gameState.nearbyHouse);
            }
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
            e.preventDefault();
            sendChatMessage();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeChat();
        }
    });

    chatInput.addEventListener('blur', () => {
        // Small delay to allow click events to process
        setTimeout(() => {
            if (gameState.chatOpen) {
                closeChat();
            }
        }, 100);
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
    chatInput.blur();
    
    // Ensure canvas has focus for keyboard controls
    if (gameState.canvas) {
        gameState.canvas.focus();
    }
}

// Send chat message
function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();

    if (message.length > 0) {
        socket.emit('chat', message);
        
        // Add chat bubble for self
        addChatBubble(gameState.myId, message);
    }

    closeChat();
    
    // Focus back to canvas to ensure keyboard events work
    gameState.canvas.focus();
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
    checkNearbyHouses();
    updateChatBubbles();
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

    // Enable smooth rendering (no pixel art)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

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
    
    // Draw interaction hint
    if (gameState.nearbyHouse) {
        drawInteractionHint();
    }
}

// Draw grass texture
function drawGrassTexture(offsetX, offsetY) {
    const ctx = gameState.ctx;
    const tileSize = 50;
    
    for (let x = Math.floor(-offsetX / tileSize) - 2; x < Math.floor((gameState.canvas.width - offsetX) / tileSize) + 2; x++) {
        for (let y = Math.floor(-offsetY / tileSize) - 2; y < Math.floor((gameState.canvas.height - offsetY) / tileSize) + 2; y++) {
            const screenX = x * tileSize + offsetX;
            const screenY = y * tileSize + offsetY;
            
            // Grass base with subtle variation
            const variation = ((x + y) % 3) * 0.05;
            ctx.fillStyle = `hsl(120, 60%, ${40 + variation * 100}%)`;
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
            
            // Add grass blades
            ctx.fillStyle = 'rgba(34, 139, 34, 0.3)';
            for (let i = 0; i < 5; i++) {
                const gx = screenX + (i * tileSize / 5) + 5;
                const gy = screenY + ((x + y + i) % 4) * 12 + 10;
                ctx.beginPath();
                ctx.moveTo(gx, gy + 8);
                ctx.lineTo(gx - 2, gy + 2);
                ctx.lineTo(gx, gy);
                ctx.lineTo(gx + 2, gy + 2);
                ctx.closePath();
                ctx.fill();
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

// Draw player with Rimuru slime style
function drawPlayer(player, offsetX, offsetY) {
    const ctx = gameState.ctx;
    const screenX = player.x + offsetX;
    const screenY = player.y + offsetY;

    // Check if moving
    const isMoving = player.id === gameState.myId && 
        (gameState.keys['w'] || gameState.keys['s'] || gameState.keys['a'] || gameState.keys['d'] ||
         gameState.keys['arrowup'] || gameState.keys['arrowdown'] || gameState.keys['arrowleft'] || gameState.keys['arrowright']);

    // Bouncy animation (like slime)
    const bounceAmount = isMoving ? 8 : 4;
    const bounceSpeed = isMoving ? 0.2 : 0.08;
    const bobOffset = Math.sin(gameState.animationFrame * bounceSpeed) * bounceAmount;
    const squishFactor = isMoving ? 0.15 : 0.08;
    const squish = Math.cos(gameState.animationFrame * bounceSpeed * 2) * squishFactor;

    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + CONFIG.PLAYER_SIZE / 2 + 8, 
        CONFIG.PLAYER_SIZE / 2 * (1.2 - squish), 
        CONFIG.PLAYER_SIZE / 6, 
        0, 0, Math.PI * 2);
    ctx.fill();

    // Slime body (glossy gel effect)
    const slimeRadius = CONFIG.PLAYER_SIZE / 2;
    
    // Main slime body with gradient
    const gradient = ctx.createRadialGradient(
        screenX - slimeRadius / 3, 
        screenY + bobOffset - slimeRadius / 3, 
        0,
        screenX, 
        screenY + bobOffset, 
        slimeRadius
    );
    
    // Create glossy slime effect
    const baseColor = player.color;
    gradient.addColorStop(0, lightenColor(baseColor, 60));
    gradient.addColorStop(0.5, baseColor);
    gradient.addColorStop(1, darkenColor(baseColor, 30));
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + bobOffset, 
        slimeRadius * (1 + squish), 
        slimeRadius * (1 - squish), 
        0, 0, Math.PI * 2);
    ctx.fill();

    // Outer glow/shine
    ctx.strokeStyle = lightenColor(baseColor, 40);
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Glossy highlight (make it look wet/gel-like)
    const highlightGradient = ctx.createRadialGradient(
        screenX - slimeRadius / 3,
        screenY + bobOffset - slimeRadius / 3,
        0,
        screenX - slimeRadius / 3,
        screenY + bobOffset - slimeRadius / 3,
        slimeRadius / 2
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.arc(screenX - slimeRadius / 3, screenY + bobOffset - slimeRadius / 3, slimeRadius / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw cute eyes (like Rimuru)
    const eyeY = screenY + bobOffset - slimeRadius / 4;
    const eyeSpacing = slimeRadius / 2.5;
    
    // Eye whites
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(screenX - eyeSpacing, eyeY, 6, 0, Math.PI * 2);
    ctx.arc(screenX + eyeSpacing, eyeY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye pupils (with slight animation)
    const blinkOffset = Math.sin(gameState.animationFrame * 0.05) > 0.95 ? 3 : 0;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(screenX - eyeSpacing, eyeY, 4 - blinkOffset, 0, Math.PI * 2);
    ctx.arc(screenX + eyeSpacing, eyeY, 4 - blinkOffset, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye shine
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(screenX - eyeSpacing + 1.5, eyeY - 1.5, 2, 0, Math.PI * 2);
    ctx.arc(screenX + eyeSpacing + 1.5, eyeY - 1.5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Cute smile
    if (!isMoving || Math.sin(gameState.animationFrame * 0.1) > 0) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(screenX, eyeY + 8, slimeRadius / 3, 0.3, Math.PI - 0.3);
        ctx.stroke();
    }

    // Glow effect for current player
    if (player.id === gameState.myId) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.6 + Math.sin(gameState.animationFrame * 0.1) * 0.2;
        ctx.beginPath();
        ctx.arc(screenX, screenY + bobOffset, slimeRadius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Draw chat bubble if exists
    if (gameState.chatBubbles[player.id]) {
        drawChatBubble(screenX, screenY + bobOffset, gameState.chatBubbles[player.id], slimeRadius);
    }

    // Draw player name
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    
    // Name background
    const nameWidth = ctx.measureText(player.username).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 0;
    const nameY = screenY - slimeRadius - 15;
    ctx.fillRect(screenX - nameWidth / 2 - 6, nameY - 10, nameWidth + 12, 20);
    
    // Name text
    ctx.shadowBlur = 4;
    ctx.fillStyle = player.id === gameState.myId ? '#FFD700' : '#FFF';
    ctx.fillText(player.username, screenX, nameY);
    ctx.shadowBlur = 0;
}

// Helper functions for color manipulation
function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Draw tree
function drawTree(tree, offsetX, offsetY) {
    const ctx = gameState.ctx;
    const screenX = tree.x + offsetX;
    const screenY = tree.y + offsetY;
    const size = tree.size || 60;

    // Shadow (smooth)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + size / 2, size / 2.5, size / 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk with gradient
    const trunkGradient = ctx.createLinearGradient(
        screenX - size / 8, screenY + size / 4,
        screenX + size / 8, screenY + size / 4
    );
    trunkGradient.addColorStop(0, '#5D4037');
    trunkGradient.addColorStop(0.5, '#8B4513');
    trunkGradient.addColorStop(1, '#5D4037');
    
    ctx.fillStyle = trunkGradient;
    ctx.beginPath();
    ctx.roundRect(screenX - size / 8, screenY + size / 4, size / 4, size / 2, 5);
    ctx.fill();
    
    ctx.strokeStyle = '#4A3319';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Foliage with sway animation
    const sway = Math.sin(gameState.animationFrame * 0.02 + tree.x) * 3;
    
    // Draw foliage as layered circles
    const foliageGradient = ctx.createRadialGradient(
        screenX + sway - size / 6, screenY - size / 3 - size / 6,
        0,
        screenX + sway, screenY - size / 3,
        size / 2.5
    );
    foliageGradient.addColorStop(0, '#66BB6A');
    foliageGradient.addColorStop(0.7, '#43A047');
    foliageGradient.addColorStop(1, '#2E7D32');
    
    ctx.fillStyle = foliageGradient;
    ctx.beginPath();
    ctx.arc(screenX + sway, screenY - size / 3, size / 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#388E3C';
    ctx.beginPath();
    ctx.arc(screenX - size / 4 + sway, screenY - size / 6, size / 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(screenX + size / 4 + sway, screenY - size / 6, size / 3, 0, Math.PI * 2);
    ctx.fill();

    // Bright highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(screenX - size / 8 + sway, screenY - size / 2.3, size / 8, 0, Math.PI * 2);
    ctx.fill();
}

// Helper for rounded rectangles
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
    };
}

// Draw rock
function drawRock(rock, offsetX, offsetY) {
    const ctx = gameState.ctx;
    const screenX = rock.x + offsetX;
    const screenY = rock.y + offsetY;
    const size = rock.size || 30;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + size / 2, size / 1.3, size / 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rock body with gradient
    const rockGradient = ctx.createRadialGradient(
        screenX - size / 4, screenY - size / 4,
        0,
        screenX, screenY,
        size / 1.3
    );
    rockGradient.addColorStop(0, '#A9A9A9');
    rockGradient.addColorStop(0.6, '#808080');
    rockGradient.addColorStop(1, '#696969');
    
    ctx.fillStyle = rockGradient;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY, size / 1.3, size / 1.8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Rock details/cracks
    ctx.strokeStyle = '#5A5A5A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenX - size / 4, screenY);
    ctx.lineTo(screenX + size / 6, screenY - size / 8);
    ctx.stroke();

    // Highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(screenX - size / 3, screenY - size / 4, size / 6, 0, Math.PI * 2);
    ctx.fill();
}

// Draw bush
function drawBush(bush, offsetX, offsetY) {
    const ctx = gameState.ctx;
    const screenX = bush.x + offsetX;
    const screenY = bush.y + offsetY;
    const size = bush.size || 35;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + size / 3, size / 1.8, size / 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bush body (overlapping circles with gradients)
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5;
        const offsetDist = size / 4;
        const bx = screenX + Math.cos(angle) * offsetDist;
        const by = screenY + Math.sin(angle) * offsetDist / 2;
        
        const bushGradient = ctx.createRadialGradient(
            bx - size / 12, by - size / 12,
            0,
            bx, by,
            size / 3
        );
        bushGradient.addColorStop(0, '#66BB6A');
        bushGradient.addColorStop(0.7, '#43A047');
        bushGradient.addColorStop(1, '#2E7D32');
        
        ctx.fillStyle = bushGradient;
        ctx.beginPath();
        ctx.arc(bx, by, size / 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Center cluster
    const centerGradient = ctx.createRadialGradient(
        screenX - size / 10, screenY - size / 10,
        0,
        screenX, screenY,
        size / 3.5
    );
    centerGradient.addColorStop(0, '#81C784');
    centerGradient.addColorStop(1, '#4CAF50');
    
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, size / 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(screenX - size / 8, screenY - size / 8, size / 10, 0, Math.PI * 2);
    ctx.fill();
}

// Draw house
function drawHouse(house, offsetX, offsetY) {
    const ctx = gameState.ctx;
    const screenX = house.x + offsetX;
    const screenY = house.y + offsetY;
    const size = house.size || 80;
    
    // Debug log only once for first house
    if (house.gameName === '🎮 Sky Jumper' && gameState.animationFrame % 300 === 0) {
        console.log('🏠 Drawing Sky Jumper house:', {
            gameName: house.gameName,
            gameType: house.gameType,
            position: `(${house.x}, ${house.y})`,
            screenPosition: `(${screenX}, ${screenY})`,
            size: size
        });
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + size / 2, size / 1.8, size / 10, 0, 0, Math.PI * 2);
    ctx.fill();

    const houseWidth = size;
    const houseHeight = size / 1.5;
    
    // Main wall with gradient
    const wallGradient = ctx.createLinearGradient(
        screenX - houseWidth / 2, screenY - houseHeight / 2,
        screenX + houseWidth / 2, screenY - houseHeight / 2
    );
    wallGradient.addColorStop(0, '#A0522D');
    wallGradient.addColorStop(0.5, '#D2691E');
    wallGradient.addColorStop(1, '#A0522D');
    
    ctx.fillStyle = wallGradient;
    ctx.beginPath();
    ctx.roundRect(screenX - houseWidth / 2, screenY - houseHeight / 2, houseWidth, houseHeight, 5);
    ctx.fill();
    
    // Wall outline
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Brick texture
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.4)';
    ctx.lineWidth = 1;
    const brickHeight = 10;
    for (let by = 0; by < houseHeight; by += brickHeight) {
        ctx.beginPath();
        ctx.moveTo(screenX - houseWidth / 2, screenY - houseHeight / 2 + by);
        ctx.lineTo(screenX + houseWidth / 2, screenY - houseHeight / 2 + by);
        ctx.stroke();
    }

    // Roof with gradient
    const roofGradient = ctx.createLinearGradient(
        screenX, screenY - houseHeight * 1.2,
        screenX, screenY - houseHeight / 2
    );
    roofGradient.addColorStop(0, '#A52A2A');
    roofGradient.addColorStop(1, '#8B0000');
    
    ctx.fillStyle = roofGradient;
    ctx.beginPath();
    ctx.moveTo(screenX - houseWidth / 1.5, screenY - houseHeight / 2);
    ctx.lineTo(screenX, screenY - houseHeight * 1.2);
    ctx.lineTo(screenX + houseWidth / 1.5, screenY - houseHeight / 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#5D0000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Door with gradient
    const doorWidth = houseWidth / 4;
    const doorHeight = houseHeight / 2.5;
    const doorGradient = ctx.createLinearGradient(
        screenX - doorWidth / 2, screenY + houseHeight / 6,
        screenX + doorWidth / 2, screenY + houseHeight / 6
    );
    doorGradient.addColorStop(0, '#3E2723');
    doorGradient.addColorStop(0.5, '#5D4037');
    doorGradient.addColorStop(1, '#3E2723');
    
    ctx.fillStyle = doorGradient;
    ctx.beginPath();
    ctx.roundRect(screenX - doorWidth / 2, screenY + houseHeight / 6, doorWidth, doorHeight, 3);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Door handle
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(screenX + doorWidth / 4, screenY + houseHeight / 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Window with reflection
    const windowSize = houseWidth / 5;
    const windowGradient = ctx.createLinearGradient(
        screenX + houseWidth / 6, screenY,
        screenX + houseWidth / 6, screenY + windowSize
    );
    windowGradient.addColorStop(0, '#87CEEB');
    windowGradient.addColorStop(1, '#4682B4');
    
    ctx.fillStyle = windowGradient;
    ctx.beginPath();
    ctx.roundRect(screenX + houseWidth / 6, screenY, windowSize, windowSize, 3);
    ctx.fill();
    
    ctx.strokeStyle = '#2F4F4F';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Window cross
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX + houseWidth / 6, screenY + windowSize / 2);
    ctx.lineTo(screenX + houseWidth / 6 + windowSize, screenY + windowSize / 2);
    ctx.moveTo(screenX + houseWidth / 6 + windowSize / 2, screenY);
    ctx.lineTo(screenX + houseWidth / 6 + windowSize / 2, screenY + windowSize);
    ctx.stroke();
    
    // Window reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(screenX + houseWidth / 6 + windowSize / 4, screenY + windowSize / 4, windowSize / 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Game label above house - ALWAYS VISIBLE
    if (house.gameName) {
        ctx.save();
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Measure text for background
        const textMetrics = ctx.measureText(house.gameName);
        const textWidth = textMetrics.width;
        const padding = 12;
        const bgHeight = 28;
        const bgY = screenY - houseHeight * 0.9;
        
        // Background rectangle with higher opacity
        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillRect(
            screenX - textWidth / 2 - padding,
            bgY - bgHeight / 2,
            textWidth + padding * 2,
            bgHeight
        );
        
        // Border (thicker and brighter)
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(
            screenX - textWidth / 2 - padding,
            bgY - bgHeight / 2,
            textWidth + padding * 2,
            bgHeight
        );
        
        // Text outline for better visibility
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText(house.gameName, screenX, bgY);
        
        // Text
        ctx.fillStyle = '#FFD700';
        ctx.fillText(house.gameName, screenX, bgY);
        
        ctx.restore();
    }
    
    // Portal indicator if nearby
    if (gameState.nearbyHouse === house) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.5 + Math.sin(gameState.animationFrame * 0.15) * 0.3;
        ctx.beginPath();
        ctx.roundRect(
            screenX - houseWidth / 2 - 5,
            screenY - houseHeight / 2 - 5,
            houseWidth + 10,
            houseHeight + 10,
            10
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
        
        // Show "Press E" prompt
        ctx.save();
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText('Tekan E', screenX, screenY - houseHeight * 1.3);
        ctx.fillText('Tekan E', screenX, screenY - houseHeight * 1.3);
        ctx.restore();
    }
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

    // Draw houses on minimap
    gameState.houses.forEach(house => {
        const houseX = mapX + house.x * scale;
        const houseY = mapY + house.y * scale;
        
        // House icon (small house shape)
        ctx.fillStyle = '#8B4513';
        const houseSize = 6;
        ctx.fillRect(houseX - houseSize / 2, houseY - houseSize / 2, houseSize, houseSize);
        
        // Roof
        ctx.fillStyle = '#DC143C';
        ctx.beginPath();
        ctx.moveTo(houseX - houseSize / 2, houseY - houseSize / 2);
        ctx.lineTo(houseX, houseY - houseSize);
        ctx.lineTo(houseX + houseSize / 2, houseY - houseSize / 2);
        ctx.closePath();
        ctx.fill();
        
        // House outline
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.strokeRect(houseX - houseSize / 2, houseY - houseSize / 2, houseSize, houseSize);
    });

    // Draw players on minimap
    Object.values(gameState.players).forEach(player => {
        const dotX = mapX + player.x * scale;
        const dotY = mapY + player.y * scale;
        
        ctx.fillStyle = player.id === gameState.myId ? '#FFD700' : player.color;
        ctx.beginPath();
        ctx.arc(dotX, dotY, player.id === gameState.myId ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Outline for current player
        if (player.id === gameState.myId) {
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    });

    // Minimap label
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MAP', mapX + mapSize / 2, mapY + mapSize + 15);
    
    // Legend
    ctx.font = '9px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('● You', mapX, mapY - 5);
    ctx.fillStyle = '#DC143C';
    ctx.fillText('🏠 House', mapX + 50, mapY - 5);
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

// Chat bubble system (like Growtopia)
function addChatBubble(playerId, message) {
    gameState.chatBubbles[playerId] = {
        message: message,
        timestamp: Date.now(),
        alpha: 1
    };
}

function updateChatBubbles() {
    const now = Date.now();
    Object.keys(gameState.chatBubbles).forEach(playerId => {
        const bubble = gameState.chatBubbles[playerId];
        const age = now - bubble.timestamp;
        
        if (age > CONFIG.CHAT_BUBBLE_DURATION) {
            delete gameState.chatBubbles[playerId];
        } else if (age > CONFIG.CHAT_BUBBLE_DURATION - 1000) {
            // Fade out in last second
            bubble.alpha = (CONFIG.CHAT_BUBBLE_DURATION - age) / 1000;
        }
    });
}

function drawChatBubble(x, y, bubble, playerRadius) {
    const ctx = gameState.ctx;
    const message = bubble.message;
    const maxWidth = 200;
    
    ctx.font = 'bold 13px Arial';
    const lines = wrapText(ctx, message, maxWidth);
    const lineHeight = 18;
    const padding = 10;
    const bubbleHeight = lines.length * lineHeight + padding * 2;
    const bubbleY = y - playerRadius - bubbleHeight - 35;
    
    // Measure width
    let maxLineWidth = 0;
    lines.forEach(line => {
        const width = ctx.measureText(line).width;
        if (width > maxLineWidth) maxLineWidth = width;
    });
    const bubbleWidth = maxLineWidth + padding * 2;
    const bubbleX = x - bubbleWidth / 2;
    
    ctx.globalAlpha = bubble.alpha;
    
    // Bubble shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.roundRect(bubbleX + 3, bubbleY + 3, bubbleWidth, bubbleHeight, 10);
    ctx.fill();
    
    // Bubble background
    const bubbleGradient = ctx.createLinearGradient(bubbleX, bubbleY, bubbleX, bubbleY + bubbleHeight);
    bubbleGradient.addColorStop(0, '#FFFFFF');
    bubbleGradient.addColorStop(1, '#F0F0F0');
    ctx.fillStyle = bubbleGradient;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 10);
    ctx.fill();
    
    // Bubble border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Bubble tail (pointing down to character)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x - 8, bubbleY + bubbleHeight);
    ctx.lineTo(x, bubbleY + bubbleHeight + 8);
    ctx.lineTo(x + 8, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Text
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    lines.forEach((line, i) => {
        ctx.fillText(line, x, bubbleY + padding + lineHeight / 2 + i * lineHeight);
    });
    
    ctx.globalAlpha = 1;
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const width = ctx.measureText(testLine).width;
        
        if (width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

// House proximity detection
function checkNearbyHouses() {
    if (!gameState.myPlayer) return;
    
    let closestHouse = null;
    let closestDistance = Infinity;
    
    gameState.houses.forEach(house => {
        const dx = gameState.myPlayer.x - house.x;
        const dy = gameState.myPlayer.y - house.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < CONFIG.HOUSE_INTERACTION_DISTANCE && distance < closestDistance) {
            closestHouse = house;
            closestDistance = distance;
        }
    });
    
    gameState.nearbyHouse = closestHouse;
}

function drawInteractionHint() {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    
    // Draw hint at bottom center
    const hintText = "Press E to enter house";
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const hintWidth = ctx.measureText(hintText).width + 40;
    const hintHeight = 40;
    const hintX = canvas.width / 2 - hintWidth / 2;
    const hintY = canvas.height - 100;
    
    // Background with pulse animation
    const pulseScale = 1 + Math.sin(gameState.animationFrame * 0.1) * 0.05;
    ctx.save();
    ctx.translate(canvas.width / 2, hintY + hintHeight / 2);
    ctx.scale(pulseScale, pulseScale);
    ctx.translate(-canvas.width / 2, -(hintY + hintHeight / 2));
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(hintX + 3, hintY + 3, hintWidth, hintHeight, 10);
    ctx.fill();
    
    // Background gradient
    const hintGradient = ctx.createLinearGradient(hintX, hintY, hintX, hintY + hintHeight);
    hintGradient.addColorStop(0, '#FFD700');
    hintGradient.addColorStop(1, '#FFA500');
    ctx.fillStyle = hintGradient;
    ctx.beginPath();
    ctx.roundRect(hintX, hintY, hintWidth, hintHeight, 10);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#FF8C00';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Text
    ctx.fillStyle = '#000';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(hintText, canvas.width / 2, hintY + hintHeight / 2);
    ctx.shadowBlur = 0;
    
    ctx.restore();
}

// Enter house and switch to mini-game
function enterHouseGame(house) {
    // Set game info based on game type from server
    if (house.gameType === 'platformer') {
        house.gameInfo = {
            name: house.gameName || 'Sky Jumper',
            description: 'Lompat ke platform dan kumpulkan koin!',
            controls: 'Arrow Keys / A-D: Gerak | Space / Arrow Up: Lompat',
            goal: 'Kumpulkan 10 koin untuk menang!'
        };
    } else if (house.gameType === 'puzzle') {
        house.gameInfo = {
            name: house.gameName || 'Puzzle Quest',
            description: 'Geser kotak untuk menyelesaikan gambar!',
            controls: 'Mouse: Klik untuk geser',
            goal: 'Susun gambar dengan benar!'
        };
    } else if (house.gameType === 'quiz') {
        house.gameInfo = {
            name: house.gameName || 'Brain Quiz',
            description: 'Jawab pertanyaan dengan benar!',
            controls: 'Mouse: Klik jawaban',
            goal: 'Jawab 10 pertanyaan dengan benar!'
        };
    } else {
        house.gameInfo = {
            name: house.gameName || 'Coming Soon',
            description: 'Game ini sedang dalam pengembangan.',
            controls: 'Belum tersedia',
            goal: 'Nantikan update selanjutnya!'
        };
    }
    
    gameState.inGame = true;
    gameState.currentGame = house.gameType;
    gameState.currentHouse = house;
    
    // Initialize mini-game
    if (house.gameType === 'platformer') {
        initPlatformerGame();
    }
    
    // Hide main game, show mini-game
    showMiniGame(house);
}

function showMiniGame(house) {
    console.log('🎮 Showing mini-game screen for:', house.gameName);
    
    // Safely hide main game elements
    const gameCanvas = document.getElementById('game-canvas');
    const minimap = document.getElementById('minimap');
    const controlsInfo = document.getElementById('controls-info');
    const chatContainer = document.getElementById('chat-container');
    
    if (gameCanvas) gameCanvas.style.display = 'none';
    if (minimap) minimap.style.display = 'none';
    if (controlsInfo) controlsInfo.style.display = 'none';
    if (chatContainer) chatContainer.style.display = 'none';
    
    let miniGameHTML = '';
    
    if (house.gameType === 'platformer') {
        console.log('🎮 Creating platformer HTML...');
        miniGameHTML = `
            <div class="mini-game-screen" id="platformer-game">
                <div class="game-header">
                    <h2>${house.gameInfo.name}</h2>
                    <button onclick="exitMiniGame()" class="exit-btn">← Kembali</button>
                </div>
                <div class="game-info">
                    <p><strong>Tujuan:</strong> ${house.gameInfo.goal}</p>
                    <p><strong>Kontrol:</strong> ${house.gameInfo.controls}</p>
                </div>
                <canvas id="platformer-canvas"></canvas>
                <div class="game-stats">
                    <div class="stat-item">🪙 <span id="coin-count">0</span>/15</div>
                    <div class="stat-item">❤️ <span id="lives-count">3</span></div>
                    <div class="stat-item">⏱️ <span id="play-time">0</span>s</div>
                    <div class="stat-item" id="game-message"></div>
                </div>
                <button onclick="showLeaderboard()" class="leaderboard-btn" style="padding: 12px 24px; background: rgba(255, 215, 0, 0.2); border: 2px solid #FFD700; color: #FFD700; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 16px;">
                    🏆 Ranking
                </button>
            </div>
        `;
    } else {
        miniGameHTML = `
            <div class="mini-game-screen">
                <div class="game-header">
                    <h2>${house.gameInfo.name}</h2>
                    <button onclick="exitMiniGame()" class="exit-btn">← Kembali ke Lobby</button>
                </div>
                <div class="game-info">
                    <p><strong>Deskripsi:</strong> ${house.gameInfo.description}</p>
                    <p><strong>Kontrol:</strong> ${house.gameInfo.controls}</p>
                    <p><strong>Tujuan:</strong> ${house.gameInfo.goal}</p>
                </div>
                <div style="text-align: center; padding: 100px 20px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">🚧</div>
                    <p style="font-size: 24px; color: white; margin-bottom: 30px;">Game ini sedang dalam pengembangan</p>
                    <p style="font-size: 18px; color: rgba(255,255,255,0.7);">Nantikan update selanjutnya!</p>
                </div>
            </div>
        `;
    }
    
    console.log('🎮 Inserting HTML...');
    document.body.insertAdjacentHTML('beforeend', miniGameHTML);
    console.log('🎮 HTML inserted');
    
    // Start platformer game loop if it's a platformer
    if (house.gameType === 'platformer') {
        console.log('🎮 Starting platformer game...');
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            startPlatformerGame();
        }, 100);
    }
}

function exitMiniGame() {
    console.log('🚪 Exiting mini-game...');
    
    // Remove mini-game screen
    const miniGameScreen = document.querySelector('.mini-game-screen');
    if (miniGameScreen) {
        miniGameScreen.remove();
    }
    
    // Reset game state
    gameState.inGame = false;
    gameState.currentGame = null;
    gameState.currentHouse = null;
    if (typeof platformerState !== 'undefined') {
        platformerState = null;
    }
    
    // Show main game elements
    const gameCanvas = document.getElementById('game-canvas');
    const minimap = document.getElementById('minimap');
    const controlsInfo = document.getElementById('controls-info');
    const chatContainer = document.getElementById('chat-container');
    
    if (gameCanvas) gameCanvas.style.display = 'block';
    if (minimap) minimap.style.display = 'block';
    if (controlsInfo) controlsInfo.style.display = 'block';
    if (chatContainer) chatContainer.style.display = 'flex';
    
    // Focus back to canvas
    if (gameState.canvas) {
        gameState.canvas.focus();
    }
    
    console.log('✅ Returned to lobby');
}

// Helper function for color manipulation
function lightenColor(color, percent) {
    const num = parseInt(color.replace("#",""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function darkenColor(color, percent) {
    const num = parseInt(color.replace("#",""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
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
    // Also add chat bubble for the player
    addChatBubble(data.playerId, data.message);
});

socket.on('updatePlayers', (players) => {
    gameState.players = players;
    if (gameState.myId) {
        gameState.myPlayer = gameState.players[gameState.myId];
    }
    updateOnlineCount();
});

socket.on('platformerLeaderboard', (leaderboard) => {
    console.log('🏆 Leaderboard received:', leaderboard);
    displayLeaderboard(leaderboard);
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
    console.log('🏠 Houses info:', gameState.houses.map((h, i) => ({
        index: i,
        gameName: h.gameName,
        gameType: h.gameType,
        position: `(${Math.round(h.x)}, ${Math.round(h.y)})`,
        size: h.size
    })));
});

// Update online count
function updateOnlineCount() {
    const count = Object.keys(gameState.players).length;
    document.getElementById('online-count').textContent = `👥 ${count} online`;
}

// Display leaderboard
function displayLeaderboard(leaderboard) {
    // Remove existing leaderboard if any
    const existing = document.getElementById('leaderboard-modal');
    if (existing) existing.remove();
    
    let leaderboardHTML = `
        <div id="leaderboard-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 3000; display: flex; align-items: center; justify-content: center;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 20px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #FFD700; margin: 0; font-size: 32px;">🏆 Top 10 Ranking</h2>
                    <button onclick="closeLeaderboard()" style="background: rgba(255,255,255,0.2); border: 2px solid white; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold;">✕</button>
                </div>
                <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 15px;">
    `;
    
    if (leaderboard.length === 0) {
        leaderboardHTML += `
            <p style="color: white; text-align: center; padding: 40px; font-size: 18px;">
                Belum ada skor. Jadilah yang pertama!
            </p>
        `;
    } else {
        leaderboard.forEach((entry, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
            const bgColor = index < 3 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)';
            
            leaderboardHTML += `
                <div style="background: ${bgColor}; border: 2px solid ${index < 3 ? '#FFD700' : 'rgba(255,255,255,0.3)'}; border-radius: 10px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="font-size: 24px; font-weight: bold; color: white; min-width: 50px;">${medal}</span>
                        <div>
                            <div style="color: white; font-size: 18px; font-weight: bold;">${entry.playerName}</div>
                            <div style="color: rgba(255,255,255,0.7); font-size: 14px;">${formatDate(entry.timestamp)}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #FFD700; font-size: 20px; font-weight: bold;">🪙 ${entry.score}/10</div>
                        <div style="color: rgba(255,255,255,0.8); font-size: 14px;">⏱️ ${entry.time}s</div>
                    </div>
                </div>
            `;
        });
    }
    
    leaderboardHTML += `
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', leaderboardHTML);
}

function closeLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) modal.remove();
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} hari lalu`;
    if (hours > 0) return `${hours} jam lalu`;
    if (minutes > 0) return `${minutes} menit lalu`;
    return 'Baru saja';
}

// Start game
init();
