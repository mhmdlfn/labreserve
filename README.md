# LabReserve Backend (SQLite + Express)

API sederhana untuk menggantikan `localStorage` di proyek Lab Reserve Anda.
Menyediakan endpoints untuk **rooms**, **reservations**, dan **schedule** per **hari**.

## Cara Jalanin

```bash
cd labreserve-backend
npm install
npm run db:reset   # membuat file data.sqlite & seed rooms
npm run dev        # jalankan server di http://localhost:4321
```

## Endpoints Utama

- `GET /api/rooms` → daftar room
- `POST /api/reservations` → buat reservasi baru (status awal: `pending`)
  - body JSON:
    ```json
    {
      "room_id": 1,
      "reserver_name": "Budi",
      "purpose": "Praktikum",
      "date": "2025-11-01",
      "start_time": "09:00",
      "end_time": "11:00"
    }
    ```
- `GET /api/reservations?date=YYYY-MM-DD&room_id=1&status=pending`
- `PATCH /api/reservations/:id/confirm` → konfirmasi oleh admin
- `PATCH /api/reservations/:id/reject` → tolak
- `GET /api/schedule/day/:isoDate` → ringkasan status per-room untuk tanggal itu
- `GET /api/schedule/month?ym=YYYY-MM` → ringkasan jumlah reservasi per tanggal

## Mapping Status ke Warna (di Frontend)

- `reserved` → kuning
- `available` → hijau
- `pending` → tombol merah / badge merah sampai admin confirm

## Catatan
- Database menggunakan `SQLite` (file `data.sqlite` di root project).
- Bila kelak pindah ke PostgreSQL, cukup migrasikan schema (struktur tabel sama persis) dan ganti layer DB di backend.
