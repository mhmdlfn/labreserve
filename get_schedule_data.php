<?php
header('Content-Type: application/json');
require 'db.php'; // Pastikan db.php ada di folder yang sama

// Tentukan tanggal Senin dan Jumat minggu ini
// 'N' mengembalikan 1 untuk Senin s/d 7 untuk Minggu
$dayOfWeek = date('N');
// Kurangi hari ini dengan (hari_ke - 1) untuk dapat Senin
// Jika hari ini Senin (1), $dayOfWeek - 1 = 0, jadi tidak dikurangi.
// Jika hari ini Minggu (7), $dayOfWeek - 1 = 6, dikurangi 6 hari.
$monday = date('Y-m-d', strtotime('-' . ($dayOfWeek - 1) . ' days'));
// Tambah 4 hari dari Senin untuk dapat Jumat
$friday = date('Y-m-d', strtotime($monday . ' +4 days'));

// // ---> BARIS DEBUGGING: Cek tanggal yang dihitung <---
// echo "Debug: Mencari antara Senin (" . $monday . ") dan Jumat (" . $friday . ")\n";
// exit; // HENTIKAN SEMENTARA DI SINI UNTUK MELIHAT TANGGAL. HAPUS ATAU KOMENTARI BARIS INI SETELAH SELESAI DEBUG.

// Query untuk mengambil reservasi antara Senin dan Jumat minggu ini
$sql = "SELECT
            r.reservation_id,
            l.name AS lab_name,
            r.reservation_date,
            DAYOFWEEK(r.reservation_date) AS day_num, -- 1=Minggu, 2=Senin, ..., 7=Sabtu
            TIME_FORMAT(r.start_time, '%l:%i %p') AS start_formatted, -- Format AM/PM (e.g., 1:30 PM)
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
            -- AND r.status = 'Approved' -- Anda bisa uncomment ini jika hanya ingin menampilkan reservasi yang sudah disetujui
        ORDER BY
            l.name ASC, r.reservation_date ASC, r.start_time ASC";

$stmt = $db->prepare($sql);

// Cek jika prepare gagal (misalnya error syntax SQL)
if ($stmt === false) {
    // Kirim error SQL sebagai JSON agar bisa dilihat di DevTools->Network->Response
    echo json_encode(['error' => 'SQL prepare failed: (' . $db->errno . ') ' . $db->error]);
    exit;
}

// Bind parameter tanggal ke placeholder (?)
$bind_result = $stmt->bind_param("ss", $monday, $friday);
if ($bind_result === false) {
    echo json_encode(['error' => 'SQL bind_param failed: (' . $stmt->errno . ') ' . $stmt->error]);
    exit;
}

// Eksekusi query
$execute_result = $stmt->execute();
if ($execute_result === false) {
    echo json_encode(['error' => 'SQL execute failed: (' . $stmt->errno . ') ' . $stmt->error]);
    exit;
}

// Ambil hasil query
$result = $stmt->get_result();

$schedule = []; // Array untuk menampung hasil akhir

// Proses hasil query jika ada
if ($result) {
    while($row = $result->fetch_assoc()) {
        // Kelompokkan hasil berdasarkan nama lab
        // Jika lab_name belum ada sebagai key, buat array kosong dulu
        if (!isset($schedule[$row['lab_name']])) {
            $schedule[$row['lab_name']] = [];
        }
        // Tambahkan detail reservasi ke array lab yang sesuai
        $schedule[$row['lab_name']][] = $row;
    }
    $result->free(); // Bebaskan memori hasil
} else {
     // Jarang terjadi jika execute berhasil, tapi untuk jaga-jaga
     // echo json_encode(['error' => 'Failed to get result set.']);
}

// Kembalikan hasil (bisa berupa array kosong jika tidak ada data) sebagai JSON
echo json_encode($schedule);

// Tutup statement dan koneksi
$stmt->close();
$db->close();
?>