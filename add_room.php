<?php
header('Content-Type: application/json');
require 'db.php'; // Pastikan db.php ada

// Ambil data dari POST
$name = $_POST['name'] ?? null;
$capacity = $_POST['capacity'] ?? null;
$location = $_POST['location'] ?? null; // Bisa kosong
$description = $_POST['description'] ?? null; // Bisa kosong

// Validasi dasar
if (empty($name) || empty($capacity) || !is_numeric($capacity) || $capacity < 1) {
    echo json_encode(['success' => false, 'message' => 'Nama ruangan dan kapasitas (angka positif) wajib diisi.']);
    exit;
}

// Cek apakah nama ruangan sudah ada
$checkStmt = $db->prepare("SELECT lab_id FROM Labs WHERE name = ?");
$checkStmt->bind_param("s", $name);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();
if ($checkResult->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'Nama ruangan sudah terdaftar. Gunakan nama lain.']);
    $checkStmt->close();
    $db->close();
    exit;
}
$checkStmt->close();


// Siapkan query INSERT (gunakan prepared statement)
$stmt = $db->prepare("INSERT INTO Labs (name, capacity, location, description) VALUES (?, ?, ?, ?)");
// 'siss' = string, integer, string, string
$stmt->bind_param("siss", $name, $capacity, $location, $description);

// Eksekusi query
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Ruangan baru berhasil ditambahkan!']);
} else {
    echo json_encode(['success' => false, 'message' => 'Gagal menambahkan ruangan: ' . $stmt->error]);
}

$stmt->close();
$db->close();
?>