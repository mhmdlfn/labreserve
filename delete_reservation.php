<?php
header('Content-Type: application/json');
require 'db.php'; // Hubungkan ke database

// Ambil ID reservasi yang dikirim oleh script.js
$reservation_id = $_POST['reservation_id'];

if (empty($reservation_id)) {
    echo json_encode(['success' => false, 'message' => 'ID Reservasi tidak ada.']);
    exit;
}

// Gunakan prepared statement untuk keamanan
$stmt = $db->prepare("DELETE FROM Reservations WHERE reservation_id = ?");
$stmt->bind_param("i", $reservation_id); // 'i' berarti integer

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Reservasi berhasil dihapus.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Gagal menghapus: ' . $stmt->error]);
}

$stmt->close();
$db->close();
?>