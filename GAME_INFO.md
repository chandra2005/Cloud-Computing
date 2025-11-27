# 🎮 Topia.io Clone - Informasi Game

## 📋 Struktur File

### File Utama
- **index.html** - Halaman utama dengan character selection
- **client.js** - Game client dan lobby system
- **server.js** - WebSocket server
- **style.css** - Styling untuk UI dan mini-games
- **platformer-game.js** - Game platformer (Sky Jumper) - TERPISAH

### Dependencies
- Express.js v4.18.2
- Socket.IO v4.6.1

## 🏠 Daftar Rumah dan Game

Server menghasilkan **8 rumah** dengan game yang berbeda:

### 1. 🎮 Sky Jumper (PLAYABLE)
- **Tipe:** Platformer
- **Status:** ✅ Sudah diimplementasi
- **File:** platformer-game.js
- **Deskripsi:** Lompat ke platform dan kumpulkan koin!
- **Kontrol:** 
  - Arrow Keys / A-D: Gerak kiri-kanan
  - Space / Arrow Up: Lompat
- **Tujuan:** Kumpulkan 10 koin untuk menang
- **Fitur:**
  - 6 platform di ketinggian berbeda
  - 10 koin emas dengan animasi berkilau
  - 2 rintangan duri
  - Physics system (gravitasi, lompatan)
  - 3 nyawa
  - Win/Lose condition

### 2. 🧩 Puzzle Quest
- **Tipe:** Puzzle
- **Status:** 🚧 Coming Soon
- **Deskripsi:** Geser kotak untuk menyelesaikan gambar
- **Kontrol:** Mouse click untuk geser
- **Tujuan:** Susun gambar dengan benar

### 3. ❓ Brain Quiz
- **Tipe:** Quiz
- **Status:** 🚧 Coming Soon
- **Deskripsi:** Jawab pertanyaan dengan benar
- **Kontrol:** Mouse click jawaban
- **Tujuan:** Jawab 10 pertanyaan dengan benar

### 4. 🏃 Speed Run
- **Tipe:** Coming Soon
- **Status:** 🚧 Dalam pengembangan

### 5. 🎯 Target Shoot
- **Tipe:** Coming Soon
- **Status:** 🚧 Dalam pengembangan

### 6. 🎨 Color Match
- **Tipe:** Coming Soon
- **Status:** 🚧 Dalam pengembangan

### 7. 🎵 Music Notes
- **Tipe:** Coming Soon
- **Status:** 🚧 Dalam pengembangan

### 8. 🧠 Memory Game
- **Tipe:** Coming Soon
- **Status:** 🚧 Dalam pengembangan

## 🎯 Cara Bermain

### Login
1. Pilih karakter slime (6 warna tersedia)
2. Masukkan nama
3. Klik "Bergabung"

### Di Lobby
- **WASD** - Bergerak
- **Enter** - Chat
- **E** - Masuk ke rumah (saat dekat rumah)

### Di Mini-Game
- Kontrol berbeda untuk setiap game
- **Klik "← Kembali ke Lobby"** untuk keluar

## 🔧 Fitur Teknis

### Server (server.js)
- Procedural world generation
- 8 rumah dengan nama dan tipe game unik
- Real-time multiplayer dengan Socket.IO
- World objects: 80 trees, 50 rocks, 60 bushes, 8 houses

### Client (client.js)
- Canvas rendering dengan smooth graphics
- Rimuru-style slime characters
- Chat bubble system (Growtopia-style)
- Collision detection
- Minimap with house markers
- Portal system ke mini-games

### Platformer Game (platformer-game.js)
- Standalone game logic
- Physics engine (gravity, velocity, collision)
- Coin collection system
- Obstacle avoidance
- Lives and score tracking
- Win/lose conditions

## 🎨 Visual Features

### Rumah
- Label nama game di atas rumah
- Portal indicator saat player mendekat (glow effect)
- Prompt "Tekan E" saat bisa masuk
- Brick texture dan window details
- Shadow dan gradient effects

### Mini-Game Screen
- Header dengan nama game
- Info panel (deskripsi, kontrol, tujuan)
- Game canvas/area
- Stats display (koin, nyawa, pesan)
- Exit button

## 📦 Cara Menjalankan

```bash
# Install dependencies
npm install

# Run server
npm start

# Atau development mode
npm run dev
```

Server berjalan di: http://localhost:3000

## 🚀 Pengembangan Selanjutnya

### Untuk menambah game baru:
1. Buat file baru (contoh: `puzzle-game.js`)
2. Implementasi function:
   - `initPuzzleGame()`
   - `startPuzzleGame()`
   - `updatePuzzleGame()`
   - `drawPuzzleGame()`
3. Update `server.js` untuk gameType
4. Update `client.js` di function `enterHouseGame()` dan `showMiniGame()`
5. Include script di `index.html`

### Template Structure:
```javascript
// puzzle-game.js
let puzzleState = null;

function initPuzzleGame() {
    puzzleState = {
        // game state variables
    };
}

function startPuzzleGame() {
    const canvas = document.getElementById('puzzle-canvas');
    const ctx = canvas.getContext('2d');
    // setup and game loop
}

function updatePuzzleGame() {
    // game logic
}

function drawPuzzleGame(ctx, canvas) {
    // rendering
}
```

## 📝 Notes

- Rumah pertama (index 0) selalu berisi Sky Jumper (platformer)
- Setiap rumah memiliki label yang terlihat dari luar
- Game state di-reset setiap keluar dari mini-game
- Keyboard focus kembali ke canvas saat keluar dari game

## 🎮 Game Design Philosophy

- **Modular:** Setiap game di file terpisah
- **Scalable:** Mudah menambah game baru
- **User-friendly:** Informasi jelas di setiap rumah
- **Consistent:** UI dan kontrol yang konsisten
