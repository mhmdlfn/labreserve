<?php
header('Content-Type: application/json');
require 'db.php'; // Pastikan db.php ada

$user_id = $_GET['user_id']; // Ambil ID dari parameter URL

if (empty($user_id)) {
    echo json_encode(['success' => false, 'message' => 'User ID tidak diberikan.']);
    exit;
}

$stmt = $db->prepare("SELECT user_id, username, role FROM Users WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();
    echo json_encode(['success' => true, 'user' => $user]);
} else {
    echo json_encode(['success' => false, 'message' => 'User tidak ditemukan.']);
}

$stmt->close();
$db->close();
?>