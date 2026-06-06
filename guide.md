# WalrusVault - Abyss Protocol Guide 🔐

Selamat datang di **WalrusVault**! Sistem ini merupakan *Dead Man's Switch* terdesentralisasi yang memanfaatkan enkripsi lokal (browser), jaringan agregator Walrus, dan smart contract di atas blockchain Sui.

Berikut adalah panduan langkah demi langkah tentang cara mengoperasikan aplikasi ini dari sudut pandang pembuat vault (Owner) maupun penerima (Recipient).

---

## Prasyarat (Requirements)
1. **Dompet Kripto Sui**: Anda harus memiliki dompet Sui yang terhubung ke jaringan **Testnet** (misal: Sui Wallet, Suiet, atau dompet kompatibel lainnya).
2. **Koin SUI Testnet**: Pastikan dompet Anda memiliki saldo SUI Testnet untuk membayar gas fee. Anda bisa meminta SUI Testnet dari Discord Sui atau menggunakan fitur "Request Testnet SUI" di dalam dompet Anda.
3. **Browser Modern**: Gunakan browser modern (Chrome/Brave/Firefox) yang mendukung API standar Web Crypto.

---

## Cara Membuat Brankas (Deploy Vault)
Sebagai *Owner*, Anda dapat menyimpan file berharga dan memastikan file tersebut dapat diakses oleh ahli waris Anda jika sesuatu terjadi pada Anda.

1. Hubungkan dompet Anda di pojok kanan atas layar.
2. Buka menu **Deploy New Vault** dari navigasi atau Dashboard.
3. **Langkah 1 (Upload Payload):**
   - Klik area unggah dan pilih file yang ingin Anda amankan (misal: dokumen wasiat, foto, atau *seed phrase*).
   - *Catatan: File Anda akan langsung dienkripsi di browser Anda sebelum dikirim ke jaringan. Kami tidak pernah melihat file mentah Anda.*
   - Klik **Proceed to Step 02**.
4. **Langkah 2 (Designate Recipients):**
   - Masukkan alamat dompet (Sui Address) orang-orang yang Anda izinkan untuk mengklaim file ini nantinya.
   - Anda dapat menambahkan beberapa penerima sekaligus. Masukkan nama dan email mereka (opsional, untuk notifikasi *warning*).
   - Klik **Proceed to Step 03**.
5. **Langkah 3 (Configure Protocol):**
   - Atur batas waktu tidak aktif (*Timeout Threshold*). Jika Anda tidak *check-in* (ping) sebelum waktu ini habis, brankas Anda akan terbuka untuk penerima.
   - (Opsional) Nyalakan *Autonomous Tatum Check-in* untuk mereset timer secara otomatis berdasarkan aktivitas blockchain dompet Anda.
   - Klik **Deploy Vault**.
6. **Proses Tanda Tangan (Penting!):**
   - Akan ada **2 kali pop-up dompet** yang harus Anda setujui (Approve).
   - Transaksi 1: Mendaftarkan brankas (Vault) ke smart contract di blockchain Sui.
   - Transaksi 2: Menyimpan metadata dan referensi ID file Walrus ke dalam brankas.
7. Setelah selesai, Anda akan menerima **Vault ID**. Simpan ID ini dan bagikan secara aman ke penerima Anda!

---

## Cara Menjaga Brankas Tetap Tertutup (Ping Alive)
Sebagai *Owner*, selama Anda masih hidup atau belum ingin file tersebut diakses, Anda harus melakukan "Ping" sebelum waktu *Timeout* habis.

1. Buka menu **User Dashboard**.
2. Di tab **Created Vaults**, cari Vault Anda.
3. Pastikan statusnya masih **ACTIVE** atau **EXPIRING**.
4. Klik tombol **PING ALIVE**.
5. Setujui transaksi di dompet Anda. Waktu akan di-reset kembali sesuai *Timeout Threshold* yang Anda pilih di awal.

---

## Cara Mengklaim Brankas (Bagi Penerima)
Sebagai *Recipient*, Anda hanya bisa mengklaim dan mendekripsi isi brankas JIKA waktu *Timeout* brankas sudah habis (Owner tidak melakukan *Ping Alive* dalam jangka waktu tertentu).

1. Buka menu **Claim Vault** (Recipient Portal).
2. Hubungkan dompet Sui Anda (harus dompet yang didaftarkan oleh sang Owner).
3. Masukkan **Vault ID** di kolom pencarian lalu klik **Search**.
4. Sistem akan mengecek status brankas di blockchain:
   - Jika statusnya **SECURED**: Berarti Owner masih aktif memantau brankasnya. Anda tidak bisa mengeklik tombol klaim.
   - Jika statusnya **PROTOCOL TRIGGERED**: Waktu brankas sudah habis! Anda diizinkan mengeksekusinya.
5. Jika waktunya sudah habis, klik **EXECUTE CLAIM & DECRYPT**.
6. Setujui transaksi di dompet Anda.
7. Setelah berhasil, Anda akan melihat pesan **Access Granted** beserta daftar dokumen.
8. Klik **DOWNLOAD BLOB** di samping nama dokumen. File akan secara ajaib ditarik dari jaringan Walrus, didekripsi secara lokal, dan tersimpan ke komputer Anda!

---

## Informasi Keamanan
- Semua proses enkripsi menggunakan standar *Advanced Encryption Standard* (AES). Kunci dekripsi dan metadata disimpan dan dikelola sepenuhnya oleh Smart Contract di blockchain Sui.
- *Smart Contract* ini bersifat otonom; setelah di-*deploy*, tak seorang pun (termasuk kami selaku developer) bisa mencegah penerima untuk mengklaim dokumen tersebut jika waktunya sudah kedaluwarsa.
