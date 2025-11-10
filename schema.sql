-- Rooms & Reservations schema for SQLite
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS rooms;

CREATE TABLE rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,     -- e.g., LAB-101
  name TEXT NOT NULL             -- e.g., Laboratorium Komputer 1
);

CREATE TABLE reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  reserver_name TEXT NOT NULL,
  purpose TEXT,
  date TEXT NOT NULL,            -- YYYY-MM-DD
  start_time TEXT NOT NULL,      -- HH:mm
  end_time TEXT NOT NULL,        -- HH:mm
  status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | rejected
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Seed some rooms
INSERT INTO rooms (code, name) VALUES
('LAB-101', 'Laboratorium Komputer 1'),
('LAB-102', 'Laboratorium Komputer 2'),
('LAB-201', 'Laboratorium Jaringan'),
('LAB-301', 'Laboratorium Multimedia');
