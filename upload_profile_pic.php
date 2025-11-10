<?php
header('Content-Type: application/json');
require 'db.php'; // Pastikan db.php ada

$user_id = $_POST['user_id'];
$response = ['success' => false, 'message' => 'Terjadi kesalahan.'];

// Pastikan user_id ada
if (empty($user_id)) {
    $response['message'] = 'User ID tidak valid.';
    echo json_encode($response);
    exit;
}

// Cek apakah ada file yang diunggah dan tidak ada error
if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] == 0) {
    $target_dir = "uploads/"; // Folder tempat menyimpan gambar
    $file_extension = strtolower(pathinfo($_FILES["profile_picture"]["name"], PATHINFO_EXTENSION));
    
    // Buat nama file unik (misal: user_1_timestamp.jpg)
    $new_filename = "user_" . $user_id . "_" . time() . "." . $file_extension;
    $target_file = $target_dir . $new_filename;
    
    $uploadOk = 1;
    $imageFileType = $file_extension;

    // Cek apakah file benar-benar gambar
    $check = getimagesize($_FILES["profile_picture"]["tmp_name"]);
    if($check === false) {
        $response['message'] = 'File bukan gambar.';
        $uploadOk = 0;
    }

    // Batasi tipe file (opsional)
    if($imageFileType != "jpg" && $imageFileType != "png" && $imageFileType != "jpeg"
    && $imageFileType != "gif" ) {
        $response['message'] = 'Maaf, hanya file JPG, JPEG, PNG & GIF yang diizinkan.';
        $uploadOk = 0;
    }

    // Batasi ukuran file (misal: 2MB)
    if ($_FILES["profile_picture"]["size"] > 2000000) {
        $response['message'] = 'Maaf, ukuran file terlalu besar (maks 2MB).';
        $uploadOk = 0;
    }

    // Jika semua cek lolos, coba unggah file
    if ($uploadOk == 1) {
        if (move_uploaded_file($_FILES["profile_picture"]["tmp_name"], $target_file)) {
            // File berhasil diunggah, sekarang update database
            
            // Simpan path relatif ke database
            $file_path_for_db = $target_dir . $new_filename; 

            $stmt = $db->prepare("UPDATE Users SET profile_picture_url = ? WHERE user_id = ?");
            $stmt->bind_param("si", $file_path_for_db, $user_id);

            if ($stmt->execute()) {
                $response['success'] = true;
                $response['message'] = 'Foto profil berhasil diunggah!';
                $response['new_url'] = $file_path_for_db; // Kirim URL baru ke JS
            } else {
                $response['message'] = 'Gagal menyimpan path gambar ke database: ' . $stmt->error;
                // Opsional: Hapus file yang sudah terunggah jika DB gagal
                unlink($target_file); 
            }
            $stmt->close();
        } else {
            $response['message'] = 'Maaf, terjadi error saat mengunggah file.';
        }
    }

} else {
    // Jika tidak ada file atau ada error upload bawaan PHP
    $response['message'] = 'Tidak ada file yang dipilih atau terjadi error upload.';
    if(isset($_FILES['profile_picture']['error']) && $_FILES['profile_picture']['error'] != UPLOAD_ERR_NO_FILE){
         $response['message'] .= ' Kode Error: ' . $_FILES['profile_picture']['error'];
    }
}

$db->close();
echo json_encode($response);
?>