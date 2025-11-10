<?php
// Selalu balas JSON
header('Content-Type: application/json');

try {
    // 1) Gunakan koneksi terpusat
    require 'db.php'; // db.php sudah set host=127.0.0.1, user=root, pass='', db=labreserve
    if (!$db) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Koneksi database tidak tersedia.']);
        exit;
    }

    // Optional: jaga-jaga
    $db->set_charset("utf8mb4");

    // 2) Validasi input
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $role     = $_POST['role']     ?? '';

    if ($username === '' || $password === '' || $role === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username, password, dan role wajib diisi.']);
        exit;
    }

    // 3) (Disarankan) Hash password
    $hashed = password_hash($password, PASSWORD_BCRYPT);

    // 4) Insert pakai prepared statement
    // Pastikan nama tabel & kolom sesuai dump SQL: users(username, password, role)
    $stmt = $db->prepare("INSERT INTO `users` (`username`, `password`, `role`) VALUES (?, ?, ?)");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Gagal menyiapkan statement: '.$db->error]);
        exit;
    }
    $stmt->bind_param("sss", $username, $hashed, $role);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Registrasi berhasil']);
    } else {
        // 1062 = duplicate username
        if ($db->errno == 1062) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Username sudah terdaftar']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error: '.$stmt->error]);
        }
    }

    $stmt->close();
    $db->close();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: '.$e->getMessage()]);
}
