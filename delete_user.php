<?php
header('Content-Type: application/json');
require 'db.php'; // Menggunakan file koneksi db.php

$user_id = $_POST['user_id'];

if (empty($user_id)) {
    echo json_encode(['success' => false, 'message' => 'User ID tidak ada.']);
    exit;
}

// PENTING: Tambahkan perlindungan agar admin utama tidak terhapus.
// Kita anggap admin pertama (user_id = 1) tidak boleh dihapus.
if ($user_id == 1) {
    echo json_encode(['success' => false, 'message' => 'Tidak dapat menghapus admin utama.']);
    exit;
}

$stmt = $db->prepare("DELETE FROM Users WHERE user_id = ?");
$stmt->bind_param("i", $user_id); // 'i' berarti integer

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'User berhasil dihapus.']);
} else {
    // Tangani jika user tidak bisa dihapus (misal karena Foreign Key)
    echo json_encode(['success' => false, 'message' => 'Gagal menghapus. User ini mungkin memiliki reservasi aktif.']);
}

$stmt->close();
$db->close();
?>