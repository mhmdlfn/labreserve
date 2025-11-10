const API = {
  async postForm(url, formObj) {
    const fd = new FormData();
    Object.entries(formObj).forEach(([k, v]) => fd.append(k, v ?? ""));
    const res = await fetch(url, { method: "POST", body: fd });
    const data = await res.json().catch(() => {
      throw new Error("Response bukan JSON");
    });
    if (!res.ok || data?.success === false)
      throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  },
  async getJSON(url) {
    const res = await fetch(url);
    const data = await res.json().catch(() => {
      throw new Error("Response bukan JSON");
    });
    if (!res.ok || data?.success === false)
      throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  },

  register({ username, password, role }) {
    return this.postForm("register.php", { username, password, role });
  },
  login({ username, password }) {
    return this.postForm("login.php", { username, password });
  },

  roomsAvailabilityByDate(isoDate) {
    return this.getJSON(
      `get_room_availability.php?date=${encodeURIComponent(isoDate)}`
    );
  },
  listReservations(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.getJSON(`get_reservations.php${q ? `?${q}` : ""}`);
  },
  createReservation({
    user_id,
    lab_id,
    date,
    start_time,
    end_time,
    description,
  }) {
    return this.postForm("submit_reservation.php", {
      user_id,
      lab_id,
      date,
      start_time,
      end_time,
      description,
    });
  },
  deleteReservation({ reservation_id }) {
    return this.postForm("delete_reservation.php", { reservation_id });
  },

  scheduleByMonth(yyyymm) {
    return this.getJSON(
      `get_schedule_data.php?month=${encodeURIComponent(yyyymm)}`
    );
  },
  scheduleByDay(isoDate) {
    return this.getJSON(
      `get_calendar_data.php?date=${encodeURIComponent(isoDate)}`
    );
  },

  listUsers() {
    return this.getJSON("get_users.php");
  },
  getUserDetail(user_id) {
    return this.getJSON(`get_user_details.php?user_id=${user_id}`);
  },
  updateUser({ user_id, username, role }) {
    return this.postForm("update_user.php", { user_id, username, role });
  },
  deleteUser(user_id) {
    return this.postForm("delete_user.php", { user_id });
  },
  uploadProfile(user_id, file) {
    const fd = new FormData();
    fd.append("user_id", user_id);
    fd.append("profile_picture", file);
    return fetch("upload_profile_pic.php", { method: "POST", body: fd })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success === false) throw new Error(d.message || "Upload gagal");
        return d;
      });
  },
};
// ==== END API HELPER ====

const navigateTo = (url) => {
  window.location.href = url;
};
const navigateAndClearHistory = (url) => {
  window.location.replace(url);
};
const currentPage = window.location.pathname.split("/").pop();
const currentUserString = localStorage.getItem("currentUser");
const currentUser = currentUserString ? JSON.parse(currentUserString) : null;
document.addEventListener("DOMContentLoaded", () => {
  // Fungsi pembantu
  const navigateTo = (url) => {
    window.location.href = url;
  };
  const navigateAndClearHistory = (url) => {
    window.location.replace(url);
  };

  const currentPage = window.location.pathname.split("/").pop();
  const currentUserString = localStorage.getItem("currentUser");
  const currentUser = currentUserString ? JSON.parse(currentUserString) : null;
  console.log("[PAGE]", currentPage);

  // =========================================================
  // 0. CEK AUTENTIKASI & LOGIKA GLOBAL
  // =========================================================
  const publicPages = ["index.html", "Register.html", "Help.html", ""];
  const protectedPages = [
    "home.html",
    "Admin.html",
    "RoomList.html",
    "Reservasi.html",
    "Jadwal.html",
    "CalenderView.html",
    "PopUp.html",
  ];

  // 0A. PERLINDUNGAN HALAMAN PUBLIK
  if (publicPages.includes(currentPage) && currentUser) {
    if (currentUser.role === "admin") {
      navigateAndClearHistory("Admin.html");
    } else {
      navigateAndClearHistory("home.html");
    }
    return;
  }

  // 0B. PERLINDUNGAN HALAMAN TERPROTEKSI
  if (protectedPages.includes(currentPage)) {
    if (!currentUser) {
      alert("🔒 Akses ditolak. Anda harus login terlebih dahulu.");
      navigateAndClearHistory("index.html");
      return;
    }

    if (currentPage === "Admin.html" && currentUser.role !== "admin") {
      alert("❌ Akses Admin ditolak. Anda dialihkan ke halaman utama.");
      navigateAndClearHistory("home.html");
      return;
    }

    // Inisialisasi Fitur Profil di Dashboard
    initProfileFeatures(currentUser, navigateTo);

    if (currentPage === "CalenderView.html") {
      highlightToday();
    }
  }

  // =========================================================
  // 1. LOGIKA HALAMAN LOGIN (index.html)
  // =========================================================
  if (currentPage === "index.html" || currentPage === "") {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      localStorage.removeItem("currentUser");
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);

        fetch("login.php", { method: "POST", body: formData })
          .then((response) => response.json())
          .then((data) => {
            alert(data.message);
            if (data.success && data.user) {
              localStorage.setItem("currentUser", JSON.stringify(data.user));
              if (data.user.role === "admin") {
                navigateAndClearHistory("Admin.html");
              } else {
                navigateAndClearHistory("home.html");
              }
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            alert("Terjadi kesalahan koneksi.");
          });
      });
    }
    document
      .querySelector('a[href="Help.html"]')
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        navigateAndClearHistory("Help.html");
      });
    document
      .querySelector('a[href="Register.html"]')
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        navigateAndClearHistory("Register.html");
      });
  }

  // =========================================================
  // 2. LOGIKA HALAMAN REGISTRASI (Register.html)
  // =========================================================
  else if (currentPage === "Register.html") {
    const registerForm = document.getElementById("register-form");

    // <<< DEBUGGING: Cek apakah form ditemukan >>>
    // console.log("Mencari form registrasi:", registerForm);

    if (registerForm) {
      // <<< DEBUGGING: Konfirmasi listener terpasang >>>
      // console.log("Form ditemukan! Memasang listener...");

      registerForm.addEventListener("submit", (e) => {
        // <<< DEBUGGING: Konfirmasi event submit terpicu >>>
        // console.log("Tombol Register diklik! Memulai fetch...");

        e.preventDefault();
        const formData = new FormData(registerForm);

        fetch("register.php", { method: "POST", body: formData })
          .then((response) => response.json())
          .then((data) => {
            alert(data.message);
            if (data.success) {
              navigateAndClearHistory("index.html");
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            alert("Terjadi kesalahan.");
          });
      });
    } else {
      // <<< DEBUGGING: Pesan jika form tidak ditemukan >>>
      // console.error("Form registrasi dengan id 'register-form' TIDAK DITEMUKAN!");
    }
    document
      .querySelector('a[href="index.html"]')
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        navigateAndClearHistory("index.html");
      });
  }

  // =========================================================

  // Pastikan fungsi global initProfileFeatures ada jika header profil ada di halaman ini
  // function initProfileFeatures(currentUser, navigateTo) { ... }

  // =========================================================
  // 2. LOGIKA HALAMAN HOME (index.html / home.html)
  // =========================================================
  // === HOME SUMMARY ===
  if (currentPage === "home.html") {
    console.log("[HOME] block running");

    (async () => {
      try {
        // Coba endpoint yang sama dgn Availability
        let res = await fetch("get_room_availability.php");
        let raw = await res.text();
        console.log("[HOME] raw (no param):", raw);

        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }

        // Fallback: kirim tanggal kalau kosong
        if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) {
          const today = new Date().toISOString().slice(0, 10);
          res = await fetch(
            `get_room_availability.php?date=${encodeURIComponent(today)}`
          );
          raw = await res.text();
          console.log("[HOME] raw (with date):", raw);
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = [];
          }
        }

        const rows = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.data)
          ? parsed.data
          : [];

        // Normalisasi status
        const norm = rows.map((r) => {
          const s = (r.status ?? r.availability_status ?? r.Availability ?? "")
            .toString()
            .trim()
            .toLowerCase();
          if (s.includes("available")) return { ...r, _status: "available" };
          if (s.includes("reserved")) return { ...r, _status: "reserved" };
          if (s.includes("pending")) return { ...r, _status: "pending" };
          return { ...r, _status: s };
        });

        const totalLabs = norm.length;
        const available = norm.filter((r) => r._status === "available").length;
        const reserved = norm.filter((r) => r._status === "reserved").length;
        const pending = norm.filter((r) => r._status === "pending").length;
        const inUse = reserved + pending;

        setText("#statTotalLabs", totalLabs);
        setText("#statAvailable", available);
        setText("#statInUse", inUse);

        console.log("[HOME] totals:", {
          totalLabs,
          available,
          reserved,
          pending,
          inUse,
        });
      } catch (e) {
        console.error("[HOME] error:", e);
        setText("#statTotalLabs", "-");
        setText("#statAvailable", "-");
        setText("#statInUse", "-");
      }
    })();
  }

  // =========================================================
  // 3. LOGIKA HALAMAN RESERVASI (Reservasi.html)
  // =========================================================
  if (currentPage === "Reservasi.html") {
    const form = document.getElementById("reservation-form"); // Pastikan ID form benar
    const roomNameDisplay = document.getElementById("room-name-display");
    const submitButton = document.getElementById("submit-reservation-btn");
    const urlParams = new URLSearchParams(window.location.search);
    const roomNameEncoded = urlParams.get("room");
    let roomNameDecoded = null; // Inisialisasi

    if (roomNameEncoded) {
      try {
        roomNameDecoded = decodeURIComponent(
          roomNameEncoded.replace(/\+/g, " ")
        );
        if (roomNameDisplay)
          roomNameDisplay.textContent = `Anda memesan: ${roomNameDecoded}`;
      } catch (e) {
        console.error("Error decoding room name:", e);
        alert("Nama ruangan di URL tidak valid.");
        if (typeof navigateTo === "function") navigateTo("RoomList.html");
        else window.location.href = "RoomList.html";
        return; // Hentikan jika nama ruangan error
      }
    } else {
      alert("Parameter ruangan tidak ditemukan. Pilih ruangan dari daftar.");
      if (typeof navigateTo === "function") navigateTo("RoomList.html");
      else window.location.href = "RoomList.html";
      return; // Hentikan jika tidak ada nama ruangan
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(form); // Ambil data dari input dengan atribut 'name'

        // --- Validasi ---
        if (!currentUser || !currentUser.user_id) {
          alert("Sesi tidak valid. Login ulang.");
          navigateAndClearHistory("index.html");
          return;
        }
        if (
          !formData.get("date") ||
          !formData.get("time") ||
          !formData.get("purpose")
        ) {
          alert("Lengkapi Tanggal, Waktu Mulai, dan Tujuan.");
          return;
        }
        if (!roomNameDecoded) {
          // Pastikan nama ruangan valid
          alert("Nama ruangan tidak valid.");
          return;
        }

        // --- Tambahkan data penting ---
        formData.append("user_id", currentUser.user_id);
        formData.append("lab_name", roomNameDecoded); // Kirim nama asli ke PHP

        // --- UI Feedback ---
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "Memproses...";
        }

        // --- Kirim ke PHP ---
        fetch("submit_reservation.php", { method: "POST", body: formData })
          .then((response) => {
            if (!response.ok) {
              // Cek HTTP error (404, 500)
              return response.text().then((text) => {
                throw new Error(
                  `Server error (${response.status}): ${
                    text || response.statusText
                  }`
                );
              });
            }
            return response.json(); // Lanjutkan jika OK
          })
          .then((data) => {
            alert(data.message); // Tampilkan pesan dari PHP
            if (data.success && data.reservation) {
              sessionStorage.setItem(
                "lastReservation",
                JSON.stringify(data.reservation)
              );
              if (typeof navigateTo === "function") navigateTo("PopUp.html");
              else window.location.href = "PopUp.html";
            }
          })
          .catch((error) => {
            console.error("Reservation Submit Error:", error);
            // Tampilkan pesan error yang lebih detail jika ada
            alert(
              `Gagal membuat reservasi. ${
                error.message || "Periksa koneksi atau output server."
              }`
            );
          })
          .finally(() => {
            // Selalu dijalankan
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.textContent = "Submit Reservation";
            }
          });
      });
    } else {
      console.error("Form dengan id 'reservation-form' tidak ditemukan!");
    }
  } // Akhir blok Reservasi.html

  // --- Logika Spesifik untuk Jadwal.html ---

  if (currentPage === "Jadwal.html") {
    // Pastikan user sudah login (bagian dari proteksi halaman)
    if (!currentUser) {
      alert("🔒 Akses ditolak. Anda harus login terlebih dahulu.");
      navigateAndClearHistory("index.html");
      // Hentikan eksekusi lebih lanjut jika redirect
    } else {
      const tableBody = document.getElementById("schedule-table-body");

      /**
       * Merender data jadwal ke dalam tabel HTML.
       * @param {object} scheduleData - Objek dengan nama lab sebagai key
       * dan array reservasi sebagai value.
       */
      const renderScheduleTable = (scheduleData) => {
        if (!tableBody) {
          console.error("Elemen tbody#schedule-table-body tidak ditemukan!");
          return;
        }
        tableBody.innerHTML = ""; // Kosongkan tabel sebelum mengisi

        const labs = Object.keys(scheduleData); // Dapatkan daftar nama lab

        if (labs.length === 0) {
          tableBody.innerHTML =
            '<tr><td colspan="6" class="px-3 py-4 text-center text-gray-500">Tidak ada jadwal reservasi ditemukan untuk minggu ini.</td></tr>';
          return;
        }

        // Urutkan nama lab secara alfabetis
        labs.sort();

        // Iterasi melalui setiap lab untuk membuat satu baris <tr>
        labs.forEach((labName) => {
          const row = document.createElement("tr");
          // Kolom pertama adalah nama lab
          let cellsHTML = `<td class="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 dark:text-white">${labName}</td>`;

          // Siapkan array untuk menampung jadwal per hari (Senin-Jumat)
          const dailySchedules = [[], [], [], [], []]; // [Senin, Selasa, Rabu, Kamis, Jumat]

          // Kelompokkan reservasi berdasarkan hari (day_num dari PHP: 2=Senin, ..., 6=Jumat)
          scheduleData[labName].forEach((res) => {
            const dayIndex = res.day_num - 2; // Konversi 2-6 menjadi 0-4
            if (dayIndex >= 0 && dayIndex < 5) {
              dailySchedules[dayIndex].push(res);
            }
          });

          // Buat 5 sel <td> untuk setiap hari Senin-Jumat
          for (let i = 0; i < 5; i++) {
            let dayCellContent = "";
            if (dailySchedules[i].length > 0) {
              // Jika ada reservasi di hari ini, tampilkan detailnya
              dailySchedules[i].forEach((res) => {
                // Gunakan title attribute untuk tooltip detail
                dayCellContent += `
                                <div class="inline-flex items-center rounded-md bg-red-100 dark:bg-red-900/50 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 mb-1 whitespace-normal"
                                     title="Oleh: ${res.requester_name}\nTujuan: ${res.purpose}">
                                    ${res.start_formatted} - ${res.end_formatted}: Booked
                                </div><br>`; // <br> agar jadwal berikutnya di baris baru
              });
            } else {
              // Jika tidak ada reservasi
              dayCellContent = `
                            <span class="inline-flex items-center rounded-md bg-green-100 dark:bg-green-900/50 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300">
                                Available
                            </span>`;
            }
            cellsHTML += `<td class="px-3 py-4 text-xs align-top">${dayCellContent}</td>`; // align-top agar rapi
          }

          row.innerHTML = cellsHTML; // Masukkan semua sel ke dalam baris
          tableBody.appendChild(row); // Tambahkan baris ke tabel
        });
      };

      // Fungsi untuk mengambil data jadwal dari server
      const fetchAndRenderSchedule = () => {
        fetch("get_schedule_data.php") // Panggil file PHP
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json(); // Konversi response ke JSON
          })
          .then((data) => {
            // Jika data berhasil diambil, render tabelnya
            renderScheduleTable(data);
          })
          .catch((error) => {
            // Tangani error jika fetch gagal atau response bukan JSON
            console.error("Error fetching schedule data:", error);
            if (tableBody) {
              tableBody.innerHTML =
                '<tr><td colspan="6" class="px-3 py-4 text-center text-red-500">Gagal memuat jadwal. Periksa koneksi atau file PHP.</td></tr>';
            }
          });
      };

      // Panggil fungsi fetch saat halaman Jadwal.html dimuat
      fetchAndRenderSchedule();
    } // Akhir dari cek currentUser
  } // Akhir dari blok Jadwal.html

  // =========================================================
  // 4. LOGIKA HALAMAN KONFIRMASI (PopUp.html)
  // =========================================================
  else if (currentPage === "PopUp.html") {
    document
      .querySelector('button[onclick*="RoomList.html"]')
      ?.setAttribute("onclick", "navigateTo('RoomList.html')");
    document
      .querySelector('button[onclick*="Jadwal.html"]')
      ?.setAttribute("onclick", "navigateTo('Jadwal.html')");

    const lastReservation = JSON.parse(
      sessionStorage.getItem("lastReservation")
    );
    if (lastReservation) {
      document.querySelector(
        ".space-y-4 div:nth-child(1) p:last-child"
      ).textContent = lastReservation.lab || "N/A";
      document.querySelector(
        ".space-y-4 div:nth-child(2) p:last-child"
      ).textContent = lastReservation.date || "N/A";
      document.querySelector(
        ".space-y-4 div:nth-child(3) p:last-child"
      ).textContent = lastReservation.time || "N/A";
      document.querySelector(
        ".space-y-4 div:nth-child(5) p:last-child"
      ).textContent = lastReservation.purpose || "N/A";
      sessionStorage.removeItem("lastReservation");
    }
  }

  // =========================================================
  // 5. LOGIKA HALAMAN ADMIN (Admin.html) - DIMODIFIKASI TOTAL
  // =========================================================
  else if (currentPage === "Admin.html") {
    // --- Bagian 1: Logika Tabel Reservasi ---
    const reservationsTableBody = document.getElementById(
      "reservation-table-body"
    );
    const searchReservationsInput = document.getElementById(
      "reservation-search-input"
    );
    let cachedReservations = [];

    const renderReservations = (reservations) => {
      if (!reservationsTableBody) return;
      reservationsTableBody.innerHTML = "";
      if (!reservations || reservations.length === 0) {
        reservationsTableBody.innerHTML =
          '<tr><td colspan="6" class="text-center py-4 text-gray-500">Tidak ada reservasi ditemukan.</td></tr>';
        return;
      }
      reservations.forEach((res) => {
        const row = document.createElement("tr");
        row.innerHTML = `
                <td class="px-6 py-4">${res.name}</td>
                <td class="px-6 py-4">${res.lab}</td>
                <td class="px-6 py-4">${res.date}</td>
                <td class="px-6 py-4">${res.time}</td>
                <td class="px-6 py-4 truncate" style="max-width: 200px;" title="${res.purpose}">${res.purpose}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="deleteReservation(${res.reservation_id})" class="text-red-600 hover:text-red-900 font-medium">Hapus</button>
                </td>
            `;
        reservationsTableBody.appendChild(row);
      });
    };

    window.deleteReservation = (reservationId) => {
      if (confirm("⚠️ Yakin ingin menghapus reservasi ini?")) {
        const formData = new FormData();
        formData.append("reservation_id", reservationId);
        fetch("delete_reservation.php", { method: "POST", body: formData })
          .then((response) => response.json())
          .then((data) => {
            alert(data.message);
            if (data.success) fetchAndRenderReservations();
          })
          .catch((error) => {
            console.error("Error:", error);
            alert("Gagal menghapus reservasi.");
          });
      }
    };

    const fetchAndRenderReservations = () => {
      fetch("get_reservations.php")
        .then((response) => response.json())
        .then((data) => {
          cachedReservations = data;
          renderReservations(cachedReservations);
        })
        .catch((error) => {
          console.error("Error fetching reservations:", error);
          if (reservationsTableBody)
            reservationsTableBody.innerHTML =
              '<tr><td colspan="6" class="text-center py-4 text-red-500">Gagal memuat data reservasi.</td></tr>';
        });
    };

    searchReservationsInput?.addEventListener("keyup", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filtered = cachedReservations.filter((res) =>
        Object.values(res).some((val) =>
          String(val).toLowerCase().includes(searchTerm)
        )
      );
      renderReservations(filtered);
    });

    // --- Bagian 2: Logika Tabel User ---
    const userTableBody = document.getElementById("user-table-body");
    const searchUserInput = document.getElementById("user-search-input");
    const editUserModal = document.getElementById("edit-user-modal");
    const editUserForm = document.getElementById("edit-user-form");
    const cancelEditUserBtn = document.getElementById("cancel-edit-user-btn");
    let cachedUsers = [];

    const renderUsers = (users) => {
      if (!userTableBody) return;
      userTableBody.innerHTML = "";
      if (!users || users.length === 0) {
        userTableBody.innerHTML =
          '<tr><td colspan="4" class="text-center py-4 text-gray-500">Tidak ada user ditemukan.</td></tr>';
        return;
      }
      users.forEach((user) => {
        const row = document.createElement("tr");
        const createdDate = user.created_at
          ? new Date(user.created_at).toLocaleDateString("id-ID")
          : "N/A"; // Format tanggal Indonesia
        row.innerHTML = `
                <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">${user.username}</td>
                <td class="px-6 py-4">${user.role}</td>
                <td class="px-6 py-4">${createdDate}</td>
                <td class="px-6 py-4 text-right space-x-4">
                    <button onclick="editUser(${user.user_id})" class="text-blue-600 hover:text-blue-900 font-medium">Edit</button>
                    <button onclick="deleteUser(${user.user_id})" class="text-red-600 hover:text-red-900 font-medium">Hapus</button>
                </td>
            `;
        userTableBody.appendChild(row);
      });
    };

    // Fungsi untuk membuka modal edit
    window.editUser = (userId) => {
      fetch(`get_user_details.php?user_id=${userId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.success && data.user) {
            document.getElementById("edit-user-id").value = data.user.user_id;
            document.getElementById("edit-username").value = data.user.username;
            document.getElementById("edit-role").value = data.user.role;
            document.getElementById("edit-password").value = ""; // Selalu kosongkan password

            editUserModal?.classList.remove("hidden");
            editUserModal?.classList.add("flex"); // Gunakan flex untuk centering
          } else {
            alert(data.message || "Gagal mengambil detail user.");
          }
        })
        .catch((error) => {
          console.error("Error fetching user details:", error);
          alert("Gagal mengambil detail user.");
        });
    };

    // Fungsi delete user
    window.deleteUser = (userId) => {
      if (
        confirm(
          "⚠️ Yakin ingin menghapus user ini? Ini mungkin akan menghapus reservasi terkait."
        )
      ) {
        const formData = new FormData();
        formData.append("user_id", userId);
        fetch("delete_user.php", { method: "POST", body: formData })
          .then((response) => response.json())
          .then((data) => {
            alert(data.message);
            if (data.success) fetchAndRenderUsers();
          })
          .catch((error) => {
            console.error("Error deleting user:", error);
            alert("Gagal menghapus user.");
          });
      }
    };

    const fetchAndRenderUsers = () => {
      fetch("get_users.php")
        .then((response) => response.json())
        .then((data) => {
          cachedUsers = data;
          renderUsers(cachedUsers);
        })
        .catch((error) => {
          console.error("Error fetching users:", error);
          if (userTableBody)
            userTableBody.innerHTML =
              '<tr><td colspan="4" class="text-center py-4 text-red-500">Gagal memuat data user.</td></tr>';
        });
    };

    searchUserInput?.addEventListener("keyup", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filtered = cachedUsers.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm) ||
          user.role.toLowerCase().includes(searchTerm)
      );
      renderUsers(filtered);
    });

    // Event listener untuk form modal edit
    editUserForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(editUserForm);

      // Tambahkan validasi jika diperlukan

      fetch("update_user.php", { method: "POST", body: formData })
        .then((response) => response.json())
        .then((data) => {
          alert(data.message);
          if (data.success) {
            editUserModal?.classList.add("hidden");
            editUserModal?.classList.remove("flex");
            fetchAndRenderUsers(); // Refresh tabel user
          }
        })
        .catch((error) => {
          console.error("Error updating user:", error);
          alert("Gagal menyimpan perubahan.");
        });
    });

    // Event listener untuk tombol batal di modal edit
    cancelEditUserBtn?.addEventListener("click", () => {
      editUserModal?.classList.add("hidden");
      editUserModal?.classList.remove("flex");
    });

    // Panggil kedua fungsi fetch saat halaman Admin dimuat
    fetchAndRenderReservations();
    fetchAndRenderUsers();
  }

  // Di dalam script.js

  // =========================================================
  // 6. LOGIKA HALAMAN ROOM LIST (RoomList.html) - LENGKAP DENGAN ADD ROOM
  // =========================================================
  else if (currentPage === "RoomList.html") {
    const tableBody = document.getElementById("room-table-body");
    const searchInput = document.getElementById("room-search");
    const capacityBtn = document.querySelector('[data-filter="capacity-btn"]');
    const availabilityBtn = document.querySelector(
      '[data-filter="availability-btn"]'
    );

    // Variabel untuk data dan filter
    let cachedRooms = [];
    let selectedCapacity = "all";
    let selectedAvailability = "all";

    // --- Elemen Modal Tambah Ruangan (BARU) ---
    const addRoomBtn = document.getElementById("add-room-btn");
    const addRoomModal = document.getElementById("add-room-modal");
    const addRoomForm = document.getElementById("add-room-form");
    const cancelAddRoomBtn = document.getElementById("cancel-add-room-btn");
    const saveRoomBtn = document.getElementById("save-room-btn"); // Untuk loading state

    /**
     * Merender data ruangan ke dalam tabel HTML.
     * @param {Array} rooms - Array objek ruangan dari server.
     */
    const renderRoomTable = (rooms) => {
      if (!tableBody) return;
      tableBody.innerHTML = ""; // Kosongkan

      if (!rooms || rooms.length === 0) {
        tableBody.innerHTML =
          '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Tidak ada ruangan ditemukan.</td></tr>';
        return;
      }

      rooms.forEach((room) => {
        const row = tableBody.insertRow(); // Cara lebih efisien
        const availabilityClass =
          room.availability_status === "Available"
            ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300"
            : "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300";
        const availabilityDot =
          room.availability_status === "Available"
            ? "bg-green-500"
            : "bg-yellow-500";

        row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${
                  room.name
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${
                  room.capacity
                } Orang</td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${availabilityClass}">
                        <span class="w-2 h-2 mr-2 ${availabilityDot} rounded-full"></span>
                        ${room.availability_status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <button class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
                            onclick="reserveRoom('${encodeURIComponent(
                              room.name
                            )}')"> Reserve
                    </button>
                    </td>
            `;
      });
    };

    /**
     * Mengambil data ketersediaan ruangan dari server.
     */
    const fetchAndRenderRooms = () => {
      fetch("get_room_availability.php")
        .then((response) =>
          response.ok
            ? response.json()
            : Promise.reject(`HTTP error! status: ${response.status}`)
        )
        .then((data) => {
          cachedRooms = data; // Simpan data ke cache
          applyFilters(); // Terapkan filter (render awal)
        })
        .catch((error) => {
          console.error("Error fetching rooms:", error);
          if (tableBody)
            tableBody.innerHTML =
              '<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Gagal memuat data ruangan.</td></tr>';
        });
    };

    /**
     * Fungsi global untuk navigasi ke halaman reservasi.
     * Harus didefinisikan di scope window agar bisa dipanggil onclick.
     * @param {string} encodedRoomName - Nama ruangan yang sudah di-encode URI.
     */
    window.reserveRoom = (encodedRoomName) => {
      // Pastikan fungsi navigateTo ada di scope global atau definisikan di sini
      if (typeof navigateTo === "function") {
        navigateTo(`Reservasi.html?room=${encodedRoomName}`);
      } else {
        console.error("Fungsi navigateTo tidak ditemukan.");
        window.location.href = `Reservasi.html?room=${encodedRoomName}`; // Fallback
      }
    };

    /**
     * Menerapkan filter kapasitas, ketersediaan, dan pencarian ke data ruangan.
     */
    function applyFilters() {
      const searchValue = searchInput?.value.trim().toLowerCase() || "";
      const filteredRooms = cachedRooms.filter((room) => {
        const capacity = parseInt(room.capacity, 10) || 0;
        const matchesCapacity =
          selectedCapacity === "all" ||
          (selectedCapacity === "small" && capacity < 20) ||
          (selectedCapacity === "medium" && capacity >= 20 && capacity <= 40) ||
          (selectedCapacity === "large" && capacity > 40);
        const matchesAvailability =
          selectedAvailability === "all" ||
          selectedAvailability === room.availability_status;
        const matchesSearch =
          !searchValue || room.name.toLowerCase().includes(searchValue);
        return matchesCapacity && matchesAvailability && matchesSearch;
      });
      renderRoomTable(filteredRooms); // Render hasil filter
    }

    // --- Setup Filter Dropdowns ---
    const setupDropdown = (button, options, type) => {
      // Pastikan button dan parentElement ada
      if (!button || !button.parentElement) {
        console.warn(
          `Dropdown button or its parent not found for type: ${type}`
        );
        return;
      }
      // Hapus menu lama jika ada (untuk mencegah duplikasi saat hot-reload/debug)
      const oldMenu = button.parentElement.querySelector(".absolute.mt-1");
      if (oldMenu) oldMenu.remove();

      const menu = document.createElement("div");
      // Pastikan kelas Tailwind lengkap dan benar
      menu.className =
        "absolute mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg hidden z-50 w-auto min-w-[10rem]"; // w-auto min-w-[...] untuk lebar dinamis
      menu.innerHTML = options
        .map(
          (opt) =>
            `<button data-value="${
              opt.value
            }" class="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
              opt.isReset
                ? "text-primary font-medium"
                : "text-gray-700 dark:text-gray-200"
            }">
                ${opt.label}
            </button>`
        )
        .join(
          options.find((o) => o.isSeparator)
            ? '<div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>'
            : ""
        ); // Separator

      button.parentElement.appendChild(menu); // Tambahkan menu ke parent

      button.addEventListener("click", (e) => {
        e.stopPropagation();
        // Tutup dropdown lain jika ada
        document
          .querySelectorAll(".filter-btn-wrapper .absolute")
          .forEach((otherMenu) => {
            if (otherMenu !== menu) otherMenu.classList.add("hidden");
          });
        menu.classList.toggle("hidden"); // Toggle menu saat ini
      });

      menu.querySelectorAll("button[data-value]").forEach((b) =>
        b.addEventListener("click", (ev) => {
          ev.stopPropagation(); // Hentikan event agar tidak menutup menu sendiri
          const value = b.getAttribute("data-value");
          if (type === "capacity") selectedCapacity = value;
          else if (type === "availability") selectedAvailability = value;
          // Update teks tombol filter (opsional)
          // button.querySelector('span:first-child').textContent = b.textContent;
          menu.classList.add("hidden"); // Selalu tutup menu setelah memilih
          applyFilters(); // Terapkan filter
        })
      );

      // Tutup menu jika klik di luar
      document.addEventListener("click", (e) => {
        // Pastikan menu tidak hidden dan klik BUKAN di dalam tombol atau menu itu sendiri
        if (
          !menu.classList.contains("hidden") &&
          !button.contains(e.target) &&
          !menu.contains(e.target)
        ) {
          menu.classList.add("hidden");
        }
      });
    };

    // Panggil setupDropdown untuk setiap filter
    setupDropdown(
      capacityBtn,
      [
        { value: "small", label: "Under 20" },
        { value: "medium", label: "20 - 40" },
        { value: "large", label: "Over 40" },
        { isSeparator: true },
        { value: "all", label: "Reset", isReset: true },
      ],
      "capacity"
    );
    setupDropdown(
      availabilityBtn,
      [
        { value: "Available", label: "Available" },
        { value: "Reserved", label: "Reserved" },
        { isSeparator: true },
        { value: "all", label: "Reset", isReset: true },
      ],
      "availability"
    );

    // Listener untuk input pencarian
    if (searchInput) searchInput.addEventListener("input", applyFilters);

    // === PERUBAHAN DI SINI ===
    // Cek apakah user adalah admin
    if (currentUser && currentUser.role === "admin") {
      // --- Logika Modal Tambah Ruangan (HANYA UNTUK ADMIN) ---

      // Tampilkan tombol Tambah (jika disembunyikan secara default oleh CSS)
      addRoomBtn?.classList.remove("hidden"); // Anda mungkin perlu menambahkan class 'hidden' di HTML awalnya

      // Tampilkan modal saat tombol diklik
      addRoomBtn?.addEventListener("click", () => {
        addRoomForm?.reset();
        if (saveRoomBtn) {
          saveRoomBtn.disabled = false;
          saveRoomBtn.textContent = "Simpan Ruangan";
        }
        addRoomModal?.classList.remove("hidden");
        addRoomModal?.classList.add("flex");
      });

      // Sembunyikan modal saat tombol batal diklik
      cancelAddRoomBtn?.addEventListener("click", () => {
        addRoomModal?.classList.add("hidden");
        addRoomModal?.classList.remove("flex");
      });

      // Proses submit form tambah ruangan
      addRoomForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(addRoomForm);
        const name = formData.get("name");
        const capacity = formData.get("capacity");

        if (
          !name ||
          !capacity ||
          isNaN(parseInt(capacity)) ||
          parseInt(capacity) < 1
        ) {
          alert("Nama Ruangan & Kapasitas (angka > 0) wajib diisi.");
          return;
        }

        if (saveRoomBtn) {
          saveRoomBtn.disabled = true;
          saveRoomBtn.textContent = "Menyimpan...";
        }

        fetch("add_room.php", { method: "POST", body: formData })
          .then((response) =>
            response.ok
              ? response.json()
              : Promise.reject(`HTTP error! status: ${response.status}`)
          )
          .then((data) => {
            alert(data.message);
            if (data.success) {
              addRoomModal?.classList.add("hidden");
              addRoomModal?.classList.remove("flex");
              fetchAndRenderRooms(); // Refresh daftar ruangan
            }
          })
          .catch((error) => {
            console.error("Error adding room:", error);
            alert("Gagal menambahkan ruangan.");
          })
          .finally(() => {
            if (saveRoomBtn) {
              saveRoomBtn.disabled = false;
              saveRoomBtn.textContent = "Simpan Ruangan";
            }
          });
      });
      // --- Akhir Logika Modal Tambah Ruangan ---
    } else {
      // Jika bukan admin, sembunyikan tombol Tambah Ruangan
      addRoomBtn?.classList.add("hidden"); // Pastikan tombol disembunyikan
    } // === AKHIR PERUBAHAN ===
    // --- Akhir Logika Modal Tambah Ruangan ---

    // Panggil fungsi fetch untuk memuat data awal saat halaman dibuka
    fetchAndRenderRooms();
  } // Akhir blok RoomList.html

  // =========================================================
  // 8. LOGIKA HALAMAN KALENDER (CalenderView.html) - SUDAH TERMASUK
  // =========================================================
  else if (currentPage === "CalenderView.html") {
    const calendarGrid = document.getElementById("calendar-grid");
    const monthYearDisplay = document.getElementById("calendar-month-year");
    const prevMonthBtn = document.getElementById("prev-month-btn");
    const nextMonthBtn = document.getElementById("next-month-btn");
    let currentDisplayDate = new Date(); // State untuk bulan/tahun yang ditampilkan

    const generateCalendarGrid = (year, month) => {
      // month is 0-11
      if (!calendarGrid) {
        console.error("calendar-grid not found");
        return;
      }
      calendarGrid.innerHTML =
        '<div class="col-span-7 p-8 text-center text-gray-500">Generating calendar...</div>'; // Loading state
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startDayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon,...
      if (monthYearDisplay)
        monthYearDisplay.textContent = firstDay.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        });

      let gridHTML = "";
      // Kotak kosong awal
      for (let i = 0; i < startDayOfWeek; i++) {
        gridHTML += `<div class="relative border-r border-b p-2 text-right h-28 bg-gray-50 dark:bg-gray-700/50 dark:border-gray-800"></div>`;
      }
      // Kotak tanggal
      for (let day = 1; day <= daysInMonth; day++) {
        gridHTML += `<div data-day="${day}" class="relative border-r border-b p-2 text-right h-28 dark:border-gray-800"><span class="font-medium text-gray-900 dark:text-white date-number">${day}</span><div class="mt-1 space-y-0.5 event-container overflow-y-auto max-h-[75px]"></div></div>`;
      }
      // Kotak kosong akhir
      const totalCells = startDayOfWeek + daysInMonth;
      const remainingCells = (7 - (totalCells % 7)) % 7;
      for (let i = 0; i < remainingCells; i++) {
        gridHTML += `<div class="relative border-r border-b p-2 text-right h-28 bg-gray-50 dark:bg-gray-700/50 dark:border-gray-800"></div>`;
      }
      calendarGrid.innerHTML = gridHTML;
    };

    const renderCalendarEvents = (calendarData) => {
      if (!calendarGrid) return;
      calendarGrid
        .querySelectorAll(".event-container")
        .forEach((c) => (c.innerHTML = "")); // Clear events first
      Object.keys(calendarData).forEach((dayOfMonth) => {
        const dayEvents = calendarData[dayOfMonth];
        const eventContainer = calendarGrid.querySelector(
          `div[data-day="${dayOfMonth}"] .event-container`
        );
        if (eventContainer) {
          dayEvents.forEach((event) => {
            const eventDiv = document.createElement("div");
            eventDiv.className =
              "rounded-md bg-blue-100 dark:bg-blue-900/50 p-1 text-left text-xs text-blue-700 dark:text-blue-300 truncate cursor-pointer hover:bg-blue-200"; // Added cursor/hover
            eventDiv.title = `Lab: ${event.lab_name}\nOleh: ${event.requester_name}\n(${event.start_formatted} - ${event.end_formatted})\nTujuan: ${event.purpose}`;
            eventDiv.textContent = `${event.lab_name} (${event.start_formatted})`;
            // Opsional: Tambah event listener untuk detail
            // eventDiv.addEventListener('click', () => alert(eventDiv.title));
            eventContainer.appendChild(eventDiv);
          });
        }
      });
      // Panggil highlight setelah semua event dirender
      highlightToday(
        currentDisplayDate.getFullYear(),
        currentDisplayDate.getMonth()
      );
    };

    const fetchAndRenderCalendar = (year, month) => {
      // month is 1-12 for PHP
      fetch(`get_calendar_data.php?year=${year}&month=${month}`)
        .then((r) =>
          r.ok ? r.json() : Promise.reject(`HTTP error! status: ${r.status}`)
        )
        .then((data) => renderCalendarEvents(data))
        .catch((error) => {
          console.error("Calendar Fetch Error:", error);
          if (calendarGrid)
            calendarGrid.innerHTML =
              '<div class="col-span-7 p-8 text-center text-red-500">Gagal memuat data kalender.</div>';
        });
    };

    const updateCalendar = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11 for JS Date object
      generateCalendarGrid(year, month); // Generate the grid structure
      fetchAndRenderCalendar(year, month + 1); // Fetch data for the generated grid (pass 1-12 to PHP)
    };

    // Event listeners for month navigation
    prevMonthBtn?.addEventListener("click", () => {
      currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
      updateCalendar(currentDisplayDate);
    });
    nextMonthBtn?.addEventListener("click", () => {
      currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
      updateCalendar(currentDisplayDate);
    });

    // Initial calendar load
    updateCalendar(currentDisplayDate);
  } // Akhir blok CalenderView.html

  // =========================================================
  // 7. LOGIKA HALAMAN HELP.HTML (Forgot Password)
  // =========================================================
  else if (currentPage === "Help.html") {
    document
      .querySelector('a[href="index.html"]')
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        navigateAndClearHistory("index.html");
      });
  }

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  }
}); // Akhir DOMContentLoaded

// =========================================================
// FUNGSI UTAMA: LOGIKA PROFIL DAN UPLOAD FOTO
// =========================================================
// (Kode fungsi initProfileFeatures tetap sama)
function initProfileFeatures(currentUser, navigateTo) {
  const profileImg = document.getElementById("profile-img");
  const profileInitials = document.getElementById("profile-initials");
  const profileButton = document.getElementById("profile-button");
  const profileMenu = document.getElementById("profile-menu");
  const dropdownUsernameElement = document.getElementById("dropdown-username");
  const dropdownRoleElement = document.getElementById("dropdown-role");
  const logoutBtn = document.getElementById("logout-btn");
  const changePhotoBtn = document.getElementById("change-photo-btn");

  const modal = document.getElementById("upload-modal");
  const photoInput = document.getElementById("photo-input");
  const selectPhotoBtn = document.getElementById("select-photo-btn");
  const savePhotoBtn = document.getElementById("save-photo-btn");
  const cancelUploadBtn = document.getElementById("cancel-upload-btn");
  const form = document.getElementById("photo-upload-form");

  const navigateAndClearHistory = (url) => {
    window.location.replace(url);
  };

  const loadProfilePhoto = () => {
    const photoUrl = currentUser.profile_picture_url;
    if (profileImg && profileInitials) {
      if (photoUrl) {
        profileImg.src = photoUrl;
        profileImg.classList.remove("hidden");
        profileInitials.classList.add("hidden");
      } else {
        profileImg.classList.add("hidden");
        profileInitials.classList.remove("hidden");
        if (profileInitials)
          profileInitials.textContent = currentUser.username
            .charAt(0)
            .toUpperCase();
      }
    } else if (profileInitials) {
      profileInitials.textContent = currentUser.username
        .charAt(0)
        .toUpperCase();
    }
  };
  loadProfilePhoto();

  if (profileButton && profileMenu) {
    const roleDisplay =
      currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    if (dropdownUsernameElement)
      dropdownUsernameElement.textContent = currentUser.username;
    if (dropdownRoleElement) dropdownRoleElement.textContent = roleDisplay;
    // Inisial sudah dihandle di loadProfilePhoto

    const toggleMenu = () => {
      const isHidden = profileMenu.classList.toggle("hidden");
      profileMenu.classList.toggle("scale-95", isHidden);
      profileMenu.classList.toggle("opacity-0", isHidden);
      profileMenu.classList.toggle("scale-100", !isHidden);
      profileMenu.classList.toggle("opacity-100", !isHidden);
    };
    profileButton.addEventListener("click", toggleMenu);

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (confirm("Anda yakin ingin keluar (Logout)?")) {
          localStorage.removeItem("currentUser");
          navigateAndClearHistory("index.html");
        }
      });
    }

    document.addEventListener("click", (e) => {
      const container = document.getElementById("profile-dropdown-container");
      if (
        container &&
        !container.contains(e.target) &&
        !profileMenu.classList.contains("hidden")
      ) {
        profileMenu.classList.add("hidden", "scale-95", "opacity-0");
        profileMenu.classList.remove("scale-100", "opacity-100");
      }
    });
  }

  if (modal) {
    // Upload Photo Modal
    let uploadedFile = null;

    if (changePhotoBtn) {
      changePhotoBtn.addEventListener("click", () => {
        if (profileMenu)
          profileMenu.classList.add("hidden", "scale-95", "opacity-0");
        modal.classList.add("flex"); // Use flex for centering
        modal.classList.remove("hidden");
      });
    }

    if (cancelUploadBtn) {
      cancelUploadBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        if (photoInput) photoInput.value = "";
        uploadedFile = null;
        if (savePhotoBtn) savePhotoBtn.disabled = true;
        if (selectPhotoBtn)
          selectPhotoBtn.textContent = "Pilih File Gambar (.jpg, .png)";
      });
    }

    if (selectPhotoBtn) {
      selectPhotoBtn.addEventListener("click", () => {
        if (photoInput) photoInput.click();
      });
    }

    if (photoInput) {
      photoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          uploadedFile = file;
          if (selectPhotoBtn)
            selectPhotoBtn.textContent = `File dipilih: ${file.name}`;
          if (savePhotoBtn) savePhotoBtn.disabled = false;
        } else {
          uploadedFile = null;
          if (savePhotoBtn) savePhotoBtn.disabled = true;
          if (selectPhotoBtn)
            selectPhotoBtn.textContent = "Pilih File Gambar (.jpg, .png)";
        }
      });
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!uploadedFile || !currentUser) return; // Need file and user info

        const formData = new FormData();
        formData.append("profile_picture", uploadedFile);
        formData.append("user_id", currentUser.user_id); // Use user_id

        fetch("upload_profile_pic.php", { method: "POST", body: formData })
          .then((response) => response.json())
          .then((data) => {
            alert(data.message);
            if (data.success && data.new_url) {
              // Update currentUser in localStorage
              const updatedUser = {
                ...currentUser,
                profile_picture_url: data.new_url,
              };
              localStorage.setItem("currentUser", JSON.stringify(updatedUser));
              // Update the global currentUser variable if needed or reload photo
              currentUser.profile_picture_url = data.new_url; // Update current session's variable too
              loadProfilePhoto(); // Reload photo display
              if (cancelUploadBtn) cancelUploadBtn.click(); // Close modal
            }
          })
          .catch((error) => {
            console.error("Error uploading photo:", error);
            alert("Gagal mengunggah foto.");
          });
      });
    }
  }
}

// =========================================================
// FUNGSI KHUSUS LAINNYA
// =========================================================
function highlightToday() {
  const today = new Date();
  const todayDate = today.getDate();
  const currentMonth = today.getMonth(); // 0-11
  const currentYear = today.getFullYear();

  // You might need a way to know the month/year the calendar is currently displaying
  // For now, let's assume it's the current month/year
  const calendarMonth = currentMonth; // Replace with actual calendar month if dynamic
  const calendarYear = currentYear; // Replace with actual calendar year if dynamic

  if (calendarMonth !== currentMonth || calendarYear !== currentYear) {
    return; // Don't highlight if calendar is not showing current month/year
  }

  const dateSpans = document.querySelectorAll(
    '#calendar-grid > div > span:not([class*="text-gray-400"])'
  ); // Select only dates of the current month

  dateSpans.forEach((span) => {
    const textContent = span.textContent.trim();
    if (!textContent) return; // Skip empty spans

    // Remove any existing highlight first (clean up previous state)
    const existingHighlight = span.querySelector(".bg-primary");
    if (existingHighlight) {
      span.textContent = existingHighlight.textContent; // Restore number
    }
    span.classList.remove(
      "flex",
      "h-6",
      "w-6",
      "items-center",
      "justify-center",
      "rounded-full",
      "bg-primary",
      "font-medium",
      "text-white"
    );

    // Apply highlight if it's today's date
    const dateValue = parseInt(textContent);
    if (!isNaN(dateValue) && dateValue === todayDate) {
      span.classList.add(
        "flex",
        "h-6",
        "w-6",
        "items-center",
        "justify-center",
        "rounded-full",
        "bg-primary",
        "font-medium",
        "text-white"
      );
    }
  });
}
