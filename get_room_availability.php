<?php
header('Content-Type: application/json');
require 'db.php'; // Pastikan db.php ada

// Ambil tanggal hari ini
$today = date('Y-m-d');

// Query untuk mengambil semua lab DAN cek apakah ada reservasi HARI INI
$sql = "SELECT 
            l.lab_id, 
            l.name, 
            l.capacity,
            -- Cek jika ada reservasi untuk lab ini pada hari ini
            (SELECT COUNT(*) 
             FROM Reservations r 
             WHERE r.lab_id = l.lab_id AND r.reservation_date = ?) > 0 AS is_reserved_today 
        FROM 
            Labs l
        ORDER BY 
            l.name ASC";

$stmt = $db->prepare($sql);
$stmt->bind_param("s", $today); // Bind tanggal hari ini ke placeholder (?)
$stmt->execute();
$result = $stmt->get_result();

$labs = [];
if ($result) {
    while($row = $result->fetch_assoc()) {
        // Ubah is_reserved_today (0 atau 1) menjadi string "Available" / "Reserved"
        $row['availability_status'] = $row['is_reserved_today'] ? 'Reserved' : 'Available';
        unset($row['is_reserved_today']); // Hapus kolom boolean asli
        $labs[] = $row;
    }
}

echo json_encode($labs);

$stmt->close();
$db->close();
?>