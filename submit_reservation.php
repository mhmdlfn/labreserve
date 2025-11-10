<?php
header('Content-Type: application/json');
require 'db.php'; // Pastikan db.php ada dan koneksi berhasil

// Ambil data dari POST
$user_id = $_POST['user_id'] ?? null;
$lab_name = $_POST['lab_name'] ?? null;
$reservation_date = $_POST['date'] ?? null;
$start_time_input = $_POST['time'] ?? null; // Waktu mulai dari form (misal: "14:30")
$purpose = $_POST['purpose'] ?? null;

$response = ['success' => false, 'message' => 'Terjadi kesalahan.']; // Default response

// --- Validasi Input Dasar ---
if (empty($user_id) || empty($lab_name) || empty($reservation_date) || empty($start_time_input) || empty($purpose)) {
    $response['message'] = 'Semua data wajib diisi (user_id, lab_name, date, time, purpose).';
    echo json_encode($response);
    exit;
}

// --- Dapatkan lab_id berdasarkan lab_name ---
$lab_id = null;
$stmt_lab = $db->prepare("SELECT lab_id FROM Labs WHERE name = ?");
if ($stmt_lab) {
    $stmt_lab->bind_param("s", $lab_name);
    $stmt_lab->execute();
    $result_lab = $stmt_lab->get_result();
    if ($result_lab->num_rows === 1) {
        $lab = $result_lab->fetch_assoc();
        $lab_id = $lab['lab_id'];
    }
    $stmt_lab->close();
} else {
    $response['message'] = 'Gagal menyiapkan query pencarian lab: ' . $db->error;
    echo json_encode($response);
    exit;
}

// Jika lab tidak ditemukan
if ($lab_id === null) {
    $response['message'] = 'Ruangan "' . htmlspecialchars($lab_name) . '" tidak ditemukan di database.';
    echo json_encode($response);
    exit;
}

// --- Proses Waktu ---
// Asumsi durasi reservasi adalah 2 jam
$duration_hours = 2;

// Konversi waktu mulai ke format MySQL (HH:MM:SS) dan objek DateTime
try {
    $startTimeObj = new DateTime($start_time_input);
    $start_time_sql = $startTimeObj->format('H:i:s'); // Format untuk database

    // Hitung waktu selesai
    $endTimeObj = clone $startTimeObj;
    $endTimeObj->add(new DateInterval("PT{$duration_hours}H")); // Tambah X jam
    $end_time_sql = $endTimeObj->format('H:i:s'); // Format untuk database

    // Format waktu untuk response JSON (AM/PM)
    $start_formatted = $startTimeObj->format('g:i A');
    $end_formatted = $endTimeObj->format('g:i A');

} catch (Exception $e) {
    $response['message'] = 'Format waktu mulai tidak valid.';
    echo json_encode($response);
    exit;
}

// --- Cek Konflik Jadwal (PENTING) ---
// Cari reservasi lain untuk lab yang sama pada tanggal yang sama
// yang waktunya beririsan dengan waktu baru.
$stmt_check = $db->prepare("SELECT reservation_id FROM Reservations
                           WHERE lab_id = ?
                           AND reservation_date = ?
                           AND (
                               (start_time < ? AND end_time > ?) OR -- Beririsan di tengah
                               (start_time >= ? AND start_time < ?) OR -- Mulai di dalam slot baru
                               (end_time > ? AND end_time <= ?)      -- Selesai di dalam slot baru
                           )");
if ($stmt_check) {
     // bind_param: i = integer (lab_id), s = string (date, time)
    $stmt_check->bind_param("isssssss",
        $lab_id, $reservation_date,
        $end_time_sql, $start_time_sql,  // Kondisi 1
        $start_time_sql, $end_time_sql,  // Kondisi 2
        $start_time_sql, $end_time_sql   // Kondisi 3
    );
    $stmt_check->execute();
    $result_check = $stmt_check->get_result();
    if ($result_check->num_rows > 0) {
        $response['message'] = 'Jadwal bentrok! Ruangan sudah dipesan pada waktu tersebut.';
        $stmt_check->close();
        $db->close();
        echo json_encode($response);
        exit;
    }
    $stmt_check->close();
} else {
     $response['message'] = 'Gagal menyiapkan query cek jadwal: ' . $db->error;
     echo json_encode($response);
     exit;
}


// --- Jika semua validasi lolos, lakukan INSERT ---
$stmt_insert = $db->prepare("INSERT INTO Reservations (user_id, lab_id, purpose, reservation_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')"); // Default status Pending

if ($stmt_insert) {
    // bind_param: i = integer, s = string
    $stmt_insert->bind_param("iissss", $user_id, $lab_id, $purpose, $reservation_date, $start_time_sql, $end_time_sql);

    if ($stmt_insert->execute()) {
        $response['success'] = true;
        $response['message'] = 'Reservasi berhasil dibuat! Menunggu approval.';
        // Kirim detail reservasi kembali ke JS untuk PopUp
        $response['reservation'] = [
            'lab' => $lab_name,
            'date' => date('d/m/Y', strtotime($reservation_date)), // Format tanggal Indonesia
            'time' => $start_formatted . ' - ' . $end_formatted,
            'purpose' => $purpose
        ];
    } else {
        $response['message'] = 'Gagal menyimpan reservasi ke database: ' . $stmt_insert->error;
    }
    $stmt_insert->close();
} else {
     $response['message'] = 'Gagal menyiapkan query insert: ' . $db->error;
}

$db->close();
echo json_encode($response);
?>