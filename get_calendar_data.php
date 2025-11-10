<?php
header('Content-Type: application/json');
require 'db.php'; // Pastikan db.php ada

// Ambil bulan dan tahun dari parameter GET (jika ada),
// default ke bulan dan tahun saat ini jika tidak ada.
$month = isset($_GET['month']) ? intval($_GET['month']) : date('m'); // 'm' -> 01 s/d 12
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');   // 'Y' -> 2025

// Pastikan bulan dan tahun valid
$month = max(1, min(12, $month));
$year = max(1970, min(2100, $year)); // Batasi rentang tahun

// Hitung tanggal awal dan akhir bulan
$firstDayOfMonth = "$year-$month-01";
$lastDayOfMonth = date('Y-m-t', strtotime($firstDayOfMonth)); // 't' -> jumlah hari di bulan

// Query untuk mengambil reservasi dalam rentang bulan ini
$sql = "SELECT
            r.reservation_id,
            l.name AS lab_name,
            r.reservation_date,
            DAY(r.reservation_date) AS day_of_month, -- Ambil tanggalnya saja (1-31)
            TIME_FORMAT(r.start_time, '%l:%i %p') AS start_formatted,
            TIME_FORMAT(r.end_time, '%l:%i %p') AS end_formatted,
            u.username AS requester_name,
            r.purpose
        FROM
            Reservations r
        JOIN
            Labs l ON r.lab_id = l.lab_id
        JOIN
            Users u ON r.user_id = u.user_id
        WHERE
            r.reservation_date BETWEEN ? AND ?
            -- AND r.status = 'Approved' -- Opsional: Hanya tampilkan yang disetujui?
        ORDER BY
            r.reservation_date ASC, r.start_time ASC";

$stmt = $db->prepare($sql);
$stmt->bind_param("ss", $firstDayOfMonth, $lastDayOfMonth);
$stmt->execute();
$result = $stmt->get_result();

$calendarEvents = [];
if ($result) {
    while($row = $result->fetch_assoc()) {
        // Kelompokkan hasil berdasarkan tanggal (day_of_month)
        $calendarEvents[$row['day_of_month']][] = $row;
    }
}

echo json_encode($calendarEvents); // Kirim sebagai { "15": [reservasi1, reservasi2], "20": [...] }

$stmt->close();
$db->close();
?>