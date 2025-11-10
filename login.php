<?php
header('Content-Type: application/json');
require 'db.php'; // Pastikan db.php ada di folder yang sama

$username = $_POST['username'];
$password = $_POST['password'];

// Validasi input dasar
if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Username dan Password harus diisi.']);
    exit;
}

// Gunakan Prepared Statement untuk keamanan
// Ambil user berdasarkan username, termasuk password HASHED (nanti)
// DAN profile_picture_url
$stmt = $db->prepare("SELECT user_id, username, password, role, profile_picture_url FROM Users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    // User ditemukan
    $user = $result->fetch_assoc();

    // Verifikasi password
    // PENTING: Saat ini kita membandingkan teks biasa. NANTI GANTI DENGAN password_verify()
    if (password_verify($password, $user['password'])) {
    // Password cocok

        // Password cocok!
        // Jangan kirim password ke browser
        unset($user['password']);

        echo json_encode([
            'success' => true,
            'message' => 'Login berhasil!',
            'user' => $user // Kirim data user (tanpa password) ke JavaScript
        ]);
    } else {
        // Password salah
        echo json_encode(['success' => false, 'message' => 'Password salah.']);
    }
} else {
    // User tidak ditemukan
    echo json_encode(['success' => false, 'message' => 'Username tidak terdaftar.']);
}

$stmt->close();
$db->close();
?>