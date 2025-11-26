# Topia.io Clone - Game Demo Multiplayer

Game multiplayer online demo yang mirip dengan topia.io dengan visual pixel art. Pemain dapat bergerak di dunia virtual, berinteraksi dengan pemain lain, dan chat secara real-time. Dilengkapi dengan collision detection dan efek partikel!

## ✨ Fitur

- 🎮 **Multiplayer Real-time** - Bermain bersama pemain lain secara online
- 🚶 **Kontrol Karakter** - Gerakkan avatar dengan WASD atau Arrow Keys
- 💬 **Chat System** - Komunikasi dengan pemain lain
- 🎨 **Pixel Art Style** - Visual bergaya pixel seperti topia.io
- 🌍 **Dunia Virtual** - Peta 3000x3000 pixels dengan dekorasi
- 🌳 **Objek Dunia** - 80 pohon, 50 batu, 60 semak, 8 rumah
- 🚫 **Collision Detection** - Tidak bisa jalan menembus pohon, batu, rumah
- ✨ **Particle Effects** - Efek debu saat berjalan
- 🗺️ **Minimap** - Peta kecil untuk navigasi
- 📊 **Player Counter** - Melihat jumlah pemain online
- 🎭 **Walking Animation** - Animasi bobbing saat bergerak
- 🌾 **Grass Texture** - Tekstur rumput yang detail

## 🚀 Cara Menjalankan

### 1. Install Dependencies

```bash
npm install
```

### 2. Jalankan Server

```bash
npm start
```

Atau untuk development dengan auto-reload:

```bash
npm run dev
```

### 3. Buka Browser

Buka browser dan akses:
```
http://localhost:3000
```

## 🎮 Cara Bermain

1. Masukkan nama Anda di layar login
2. Klik "Bergabung" untuk masuk ke game
3. Gunakan **WASD** atau **Arrow Keys** untuk bergerak
4. Tekan **Enter** untuk membuka chat
5. Ketik pesan dan tekan **Enter** untuk mengirim
6. Tekan **ESC** untuk menutup chat
7. Avatar tidak bisa menembus pohon, batu, atau rumah
8. Lihat minimap di kanan atas untuk navigasi

## 🛠️ Teknologi

- **Frontend**: HTML5 Canvas, JavaScript, CSS3
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **Rendering**: Canvas 2D API (Pixel Art Style)
- **Physics**: Custom Collision Detection

## 📁 Struktur File

```
├── index.html      # Halaman utama game
├── client.js       # Game logic, rendering, collision
├── server.js       # WebSocket server & world generation
├── style.css       # Styling UI
├── package.json    # Dependencies
└── README.md       # Dokumentasi
```

## 🎯 Kontrol

| Key | Action |
|-----|--------|
| W / ↑ | Gerak ke atas |
| S / ↓ | Gerak ke bawah |
| A / ← | Gerak ke kiri |
| D / → | Gerak ke kanan |
| Enter | Buka/Kirim chat |
| ESC | Tutup chat |

## 🎨 Fitur Visual

### Pixel Art Style
- Avatar dengan style pixel art (kotak-kotak)
- Pohon dengan foliage pixelated
- Tekstur rumput dengan pola
- Efek partikel debu saat berjalan
- Shadow dan lighting
- Animasi smooth meskipun pixel art

### Objek Dunia
- **Pohon**: Dengan daun yang bergoyang, tekstur trunk
- **Batu**: Berbagai ukuran dengan shading
- **Semak**: Cluster pixel dengan warna variatif
- **Rumah**: Lengkap dengan atap, pintu, jendela, tekstur bata

### Collision System
- Collision berbasis circle untuk player
- Collision berbasis shape untuk objek
- Sliding movement (bisa geser di tembok)
- Boundary detection

## 🔧 Konfigurasi

Edit `client.js` untuk mengubah konfigurasi game:

```javascript
const CONFIG = {
    PLAYER_SIZE: 40,        // Ukuran avatar
    PLAYER_SPEED: 5,        // Kecepatan gerak
    WORLD_WIDTH: 3000,      // Lebar dunia
    WORLD_HEIGHT: 3000,     // Tinggi dunia
};
```

Edit `server.js` untuk mengubah jumlah objek:

```javascript
// Generate trees
for (let i = 0; i < 80; i++) { ... }  // Ubah angka 80

// Generate rocks
for (let i = 0; i < 50; i++) { ... }  // Ubah angka 50

// Generate bushes
for (let i = 0; i < 60; i++) { ... }  // Ubah angka 60

// Generate houses
for (let i = 0; i < 8; i++) { ... }   // Ubah angka 8
```

## 📝 Catatan

- Server berjalan di port 3000 (default)
- Maksimal pesan chat: 100 karakter
- Nama pemain minimal 2 karakter
- Game menggunakan WebSocket untuk komunikasi real-time
- Particle system limited untuk performance
- Canvas rendering optimized dengan culling

## 🎮 Tips Bermain

1. Gunakan minimap untuk navigasi
2. Avatar kamu ditandai dengan warna emas
3. Hindari pohon dan batu saat berlari
4. Rumah tidak bisa dimasuki (collision)
5. Chat messages akan fade setelah 10 detik
6. Diagonal movement lebih cepat secara visual

## 🤝 Kontribusi

Silakan fork repository ini dan buat pull request untuk kontribusi.

## 📄 Lisensi

MIT License - bebas digunakan untuk pembelajaran dan pengembangan.
