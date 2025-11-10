<?php
header('Content-Type: application/json');
require 'db.php'; // Pastikan file db.php ada di folder yang sama

// Ambil semua user KECUALI password
$sql = "SELECT user_id, username, role, created_at FROM Users ORDER BY username ASC";

$result = $db->query($sql);
$users = [];

if ($result) {
    // Loop melalui hasil query dan masukkan ke array
    while($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    $result->free(); // Bebaskan memori hasil query
} else {
    // Jika query gagal, kirim array kosong atau pesan error (opsional)
     // echo json_encode(['success' => false, 'message' => 'Gagal mengambil data user: ' . $db->error]);
     // exit;
}

// Kembalikan data user sebagai JSON
echo json_encode($users);

// Tutup koneksi database
$db->close();
?>