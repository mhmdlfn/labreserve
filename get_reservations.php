<?php
header('Content-Type: application/json');
require 'db.php'; // Hubungkan ke database

// SQL ini mengambil data reservasi dan MENGGABUNGKAN (JOIN) dengan
// tabel Users dan Labs untuk mendapatkan nama pemesan dan nama lab.
$sql = "SELECT 
            r.reservation_id,
            u.username AS name, 
            l.name AS lab, 
            r.reservation_date AS date, 
            CONCAT(r.start_time, ' - ', r.end_time) AS time, 
            r.purpose
        FROM 
            Reservations r
        JOIN 
            Users u ON r.user_id = u.user_id
        JOIN 
            Labs l ON r.lab_id = l.lab_id
        ORDER BY 
            r.reservation_date ASC, r.start_time ASC";

$result = $db->query($sql);
$reservations = [];

if ($result) {
    while($row = $result->fetch_assoc()) {
        $reservations[] = $row;
    }
}

// Kembalikan data sebagai JSON
echo json_encode($reservations);

$db->close();
?>