<?php
header('Content-Type: application/json');
require 'db.php'; // Pastikan db.php ada

// Ambil data dari form modal
$user_id = $_POST['user_id'];
$username = $_POST['username'];
$role = $_POST['role'];
$password = $_POST['password']; // Bisa kosong

// Validasi dasar
if (empty($user_id) || empty($username) || empty($role)) {
    echo json_encode(['success' => false, 'message' => 'Data tidak lengkap.']);
    exit;
}

// Cek apakah admin utama (ID 1) diedit rolenya
if ($user_id == 1 && $role !== 'admin') {
     echo json_encode(['success' => false, 'message' => 'Tidak dapat mengubah role admin utama.']);
     exit;
}


// Cek apakah username sudah ada (untuk user lain)
$checkStmt = $db->prepare("SELECT user_id FROM Users WHERE username = ? AND user_id != ?");
$checkStmt->bind_param("si", $username, $user_id);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();
if ($checkResult->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'Username sudah digunakan oleh user lain.']);
    $checkStmt->close();
    exit;
}
$checkStmt->close();


// Logika Update
if (!empty($password)) {
    // Jika password diisi, update semua termasuk password (HARUS DI-HASH!)
    // $hashed_password = password_hash($password, PASSWORD_DEFAULT); // AKTIFKAN NANTI
    $stmt = $db->prepare("UPDATE Users SET username = ?, role = ?, password = ? WHERE user_id = ?");
    // Ganti "sss" menjadi "sssi" setelah hashing
    $stmt->bind_param("sssi", $username, $role, $password, $user_id); // Ganti $password dg $hashed_password nanti
} else {
    // Jika password kosong, update username dan role saja
    $stmt = $db->prepare("UPDATE Users SET username = ?, role = ? WHERE user_id = ?");
    $stmt->bind_param("ssi", $username, $role, $user_id);
}

// Eksekusi update
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Data user berhasil diperbarui.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Gagal memperbarui data: ' . $stmt->error]);
}

$stmt->close();
$db->close();
?>