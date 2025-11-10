<?php
// Gunakan 127.0.0.1 untuk koneksi yang lebih cepat di localhost
$db_host = '127.0.0.1';
$db_user = 'root'; // User default XAMPP
$db_pass = '';     // Password default XAMPP (kosong)
$db_name = 'labreserve'; // Pastikan nama database benar

$db = new mysqli($db_host, $db_user, $db_pass, $db_name);

// Pengaturan karakter set (penting)
$db->set_charset("utf8mb4");

// Cek koneksi
if ($db->connect_error) {
    // Kirim pesan error sebagai JSON jika koneksi gagal
    header('Content-Type: application/json');
    // Jangan tampilkan detail error koneksi ke publik di production
    error_log('Koneksi database gagal: ' . $db->connect_error); // Log error ke file
    echo json_encode(['success' => false, 'message' => 'Koneksi database gagal.']);
    exit;
}
?>