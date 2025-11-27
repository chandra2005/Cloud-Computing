// Platformer Game - Sky Jumper
// Mini-game untuk rumah pertama

// Platformer Game Variables
let platformerState = null;

function initPlatformerGame() {
    // Get player color safely
    let playerColor = '#4A90E2'; // default blue
    let playerName = 'Player';
    if (typeof gameState !== 'undefined' && gameState.myPlayer) {
        if (gameState.myPlayer.color) playerColor = gameState.myPlayer.color;
        if (gameState.myPlayer.username) playerName = gameState.myPlayer.username;
    }
    
    platformerState = {
        player: {
            x: 100,
            y: 450,
            width: 40,
            height: 40,
            velocityX: 0,
            velocityY: 0,
            speed: 7, // Faster movement
            jumpPower: 17, // Higher jump
            gravity: 0.65, // Smoother gravity
            friction: 0.92, // Air resistance
            isJumping: false,
            color: playerColor,
            name: playerName
        },
        canvasWidth: window.innerWidth,
        canvasHeight: window.innerHeight,
        platforms: [],
        coins: [],
        obstacles: [],
        canvasWidth: window.innerWidth,
        canvasHeight: window.innerHeight,
        platforms: [],
        coins: [],
        obstacles: [],
        score: 0,
        lives: 3,
        gameOver: false,
        won: false,
        keys: {},
        startTime: Date.now(),
        playTime: 0,
        otherPlayers: {} // For multiplayer
    };
    
    // Generate complex level based on canvas size
    generateLevel();
}

function generateLevel() {
    const w = platformerState.canvasWidth;
    const h = platformerState.canvasHeight;
    
    // Ground
    platformerState.platforms.push({ 
        x: 0, 
        y: h - 50, 
        width: w, 
        height: 50, 
        color: '#8B4513',
        type: 'ground'
    });
    
    // Complex platform layout
    const platformCount = Math.floor(w / 150);
    for (let i = 0; i < platformCount; i++) {
        const spacing = w / (platformCount + 1);
        const x = spacing * (i + 1) - 75;
        const y = h - 150 - (Math.sin(i * 0.8) * 100) - (i % 3) * 80;
        const width = 100 + Math.random() * 80;
        
        platformerState.platforms.push({
            x: x,
            y: y,
            width: width,
            height: 20,
            color: '#CD853F',
            type: 'floating'
        });
        
        // Add coin above each platform
        if (Math.random() > 0.3) {
            platformerState.coins.push({
                x: x + width / 2,
                y: y - 40,
                radius: 12,
                collected: false,
                rotation: 0
            });
        }
    }
    
    // Add extra coins in air
    const extraCoins = Math.floor(platformCount / 2);
    for (let i = 0; i < extraCoins; i++) {
        platformerState.coins.push({
            x: Math.random() * (w - 100) + 50,
            y: Math.random() * (h - 250) + 50,
            radius: 12,
            collected: false,
            rotation: 0
        });
    }
    
    // Add moving obstacles
    const obstacleCount = Math.floor(platformCount / 3);
    for (let i = 0; i < obstacleCount; i++) {
        const platform = platformerState.platforms[Math.floor(Math.random() * platformCount) + 1];
        if (platform) {
            platformerState.obstacles.push({
                x: platform.x + Math.random() * (platform.width - 40),
                y: platform.y - 40,
                width: 40,
                height: 40,
                type: 'spike',
                initialX: platform.x,
                moveRange: platform.width - 40,
                moveSpeed: 1 + Math.random()
            });
        }
    }
    
    console.log(`✅ Level generated: ${platformerState.platforms.length} platforms, ${platformerState.coins.length} coins, ${platformerState.obstacles.length} obstacles`);
}

function startPlatformerGame() {
    console.log('🎮 Starting platformer game...');
    const canvas = document.getElementById('platformer-canvas');
    if (!canvas) {
        console.error('❌ Canvas not found!');
        return;
    }
    
    // Set canvas to full window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    platformerState.canvasWidth = canvas.width;
    platformerState.canvasHeight = canvas.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('❌ Cannot get 2D context!');
        return;
    }
    
    // Enable image smoothing for smoother graphics
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    console.log('✅ Canvas ready:', canvas.width, 'x', canvas.height);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        platformerState.canvasWidth = canvas.width;
        platformerState.canvasHeight = canvas.height;
    });
    
    // Keyboard controls
    const keyDownHandler = (e) => {
        platformerState.keys[e.key] = true;
        if (e.key === ' ' || e.key === 'ArrowUp') {
            e.preventDefault();
        }
    };
    
    const keyUpHandler = (e) => {
        platformerState.keys[e.key] = false;
    };
    
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    
    console.log('✅ Event listeners attached');
    
    // Game loop
    function gameLoop() {
        if (!platformerState || platformerState.gameOver || platformerState.won) {
            if (platformerState && platformerState.won) {
                const timeElement = document.getElementById('play-time');
                const finalTime = timeElement ? timeElement.textContent : platformerState.playTime;
                document.getElementById('game-message').innerHTML = `<span style="color: #FFD700;">🎉 MENANG! Waktu: ${finalTime}s</span>`;
            } else if (platformerState && platformerState.gameOver) {
                document.getElementById('game-message').innerHTML = '<span style="color: #ff4444;">💀 GAME OVER!</span>';
            }
            document.removeEventListener('keydown', keyDownHandler);
            document.removeEventListener('keyup', keyUpHandler);
            console.log('🎮 Game ended');
            return;
        }
        
        // Update timer display
        const timeElement = document.getElementById('play-time');
        if (timeElement) {
            timeElement.textContent = platformerState.playTime;
        }
        
        updatePlatformerGame();
        drawPlatformerGame(ctx, canvas);
        requestAnimationFrame(gameLoop);
    }
    
    console.log('✅ Starting game loop...');
    gameLoop();
}

function updatePlatformerGame() {
    const player = platformerState.player;
    const w = platformerState.canvasWidth;
    const h = platformerState.canvasHeight;
    
    // Update play time
    platformerState.playTime = Math.floor((Date.now() - platformerState.startTime) / 1000);
    
    // Ultra smooth horizontal movement
    const acceleration = 1.2;
    const maxSpeed = player.speed;
    
    if (platformerState.keys['ArrowLeft'] || platformerState.keys['a'] || platformerState.keys['A']) {
        player.velocityX -= acceleration;
        if (player.velocityX < -maxSpeed) player.velocityX = -maxSpeed;
    } else if (platformerState.keys['ArrowRight'] || platformerState.keys['d'] || platformerState.keys['D']) {
        player.velocityX += acceleration;
        if (player.velocityX > maxSpeed) player.velocityX = maxSpeed;
    } else {
        // Smooth deceleration with friction
        player.velocityX *= player.friction;
        if (Math.abs(player.velocityX) < 0.05) player.velocityX = 0;
    }
    
    // Jump
    if ((platformerState.keys[' '] || platformerState.keys['ArrowUp']) && !player.isJumping) {
        player.velocityY = -player.jumpPower;
        player.isJumping = true;
    }
    
    // Apply gravity with terminal velocity
    player.velocityY += player.gravity;
    if (player.velocityY > 20) player.velocityY = 20; // Max fall speed
    
    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Wrap around screen horizontally
    if (player.x < -player.width) player.x = w;
    if (player.x > w) player.x = -player.width;
    
    // Platform collision
    player.isJumping = true; // Assume in air unless on platform
    
    for (let platform of platformerState.platforms) {
        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height > platform.y &&
            player.y + player.height < platform.y + platform.height &&
            player.velocityY >= 0) {
            
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.isJumping = false;
        }
    }
    
    // Coin collection with rotation animation
    for (let coin of platformerState.coins) {
        if (!coin.collected) {
            // Rotate coins
            coin.rotation = (coin.rotation || 0) + 0.05;
            
            const dx = player.x + player.width/2 - coin.x;
            const dy = player.y + player.height/2 - coin.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < player.width/2 + coin.radius) {
                coin.collected = true;
                platformerState.score++;
                document.getElementById('coin-count').textContent = platformerState.score;
                
                if (platformerState.score >= platformerState.coins.length) {
                    platformerState.won = true;
                    // Send score to server for leaderboard
                    savePlatformerScore(platformerState.player.name, platformerState.score, platformerState.playTime);
                }
            }
        }
    }
    
    // Moving obstacles
    for (let obstacle of platformerState.obstacles) {
        if (obstacle.type === 'spike' && obstacle.moveSpeed) {
            obstacle.x += obstacle.moveSpeed;
            if (obstacle.x < obstacle.initialX || obstacle.x > obstacle.initialX + obstacle.moveRange) {
                obstacle.moveSpeed *= -1; // Reverse direction
            }
        }
        
        if (player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y) {
            
            // Hit obstacle
            platformerState.lives--;
            document.getElementById('lives-count').textContent = platformerState.lives;
            
            // Reset position
            player.x = 100;
            player.y = 450;
            player.velocityX = 0;
            player.velocityY = 0;
            
            if (platformerState.lives <= 0) {
                platformerState.gameOver = true;
            }
        }
    }
    
    // Fall off screen
    if (player.y > h + 100) {
        platformerState.lives--;
        document.getElementById('lives-count').textContent = platformerState.lives;
        player.x = 100;
        player.y = h - 200;
        player.velocityX = 0;
        player.velocityY = 0;
        
        if (platformerState.lives <= 0) {
            platformerState.gameOver = true;
        }
    }
}

function drawPlatformerGame(ctx, canvas) {
    // Clear canvas with gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#87CEEB');
    bgGradient.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Animated clouds
    const time = Date.now() / 3000;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    
    // Cloud 1
    ctx.save();
    ctx.translate((time * 20) % (canvas.width + 200) - 100, 0);
    ctx.beginPath();
    ctx.arc(150, 80, 30, 0, Math.PI * 2);
    ctx.arc(180, 80, 35, 0, Math.PI * 2);
    ctx.arc(210, 80, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Cloud 2
    ctx.save();
    ctx.translate((time * 15) % (canvas.width + 200) - 100, 0);
    ctx.beginPath();
    ctx.arc(500, 120, 25, 0, Math.PI * 2);
    ctx.arc(525, 120, 30, 0, Math.PI * 2);
    ctx.arc(550, 120, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw platforms
    for (let platform of platformerState.platforms) {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Platform outline
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    }
    
    // Draw coins with 3D effect
    for (let coin of platformerState.coins) {
        if (!coin.collected) {
            // Animated coin with rotation
            const time = Date.now() / 200;
            const bob = Math.sin(time + coin.x) * 3; // Floating animation
            const scale = 1 + Math.sin(time + coin.x) * 0.15;
            
            ctx.save();
            ctx.translate(coin.x, coin.y + bob);
            ctx.scale(Math.cos(coin.rotation) * 0.8, scale);
            
            // Outer glow
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 15;
            
            // Outer circle
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner circle
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.arc(0, 0, coin.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            // Shine
            ctx.fillStyle = '#FFFF99';
            ctx.beginPath();
            ctx.arc(-coin.radius * 0.25, -coin.radius * 0.25, coin.radius * 0.35, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }
    
    // Draw obstacles
    for (let obstacle of platformerState.obstacles) {
        if (obstacle.type === 'spike') {
            ctx.fillStyle = '#FF4444';
            ctx.beginPath();
            ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
            ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = '#CC0000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    // Draw player (slime)
    const player = platformerState.player;
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(player.x + player.width/2, player.y + player.height + 5, player.width * 0.4, player.height * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body gradient
    const gradient = ctx.createRadialGradient(
        player.x + player.width/2, player.y + player.height/3,
        0,
        player.x + player.width/2, player.y + player.height/3,
        player.width
    );
    gradient.addColorStop(0, lightenColor(player.color, 40));
    gradient.addColorStop(0.7, player.color);
    gradient.addColorStop(1, darkenColor(player.color, 20));
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(player.x + player.width/2, player.y + player.height/2, player.width/2, player.height/2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(player.x + player.width * 0.35, player.y + player.height * 0.4, 6, 0, Math.PI * 2);
    ctx.arc(player.x + player.width * 0.65, player.y + player.height * 0.4, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x + player.width * 0.35 + 2, player.y + player.height * 0.4, 3, 0, Math.PI * 2);
    ctx.arc(player.x + player.width * 0.65 + 2, player.y + player.height * 0.4, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + player.height * 0.5, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();
}

// Helper functions for color manipulation
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

// Save score to server
function savePlatformerScore(playerName, score, time) {
    if (typeof socket !== 'undefined') {
        socket.emit('platformerScore', {
            playerName: playerName,
            score: score,
            time: time,
            timestamp: Date.now()
        });
        console.log('📊 Score saved:', { playerName, score, time });
    }
}

// Show leaderboard
function showLeaderboard() {
    if (typeof socket !== 'undefined') {
        socket.emit('getPlatformerLeaderboard');
    }
}
