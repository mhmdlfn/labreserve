import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';

const app = express();
app.use(cors());
app.use(express.json());

// DB
const db = new Database('./data.sqlite');
db.pragma('foreign_keys = ON');

// helpers
const toDayOfWeek = (isoDate) => {
  // 1=Mon ... 7=Sun (to align with your requirement Sat/Sun detection in frontend)
  const d = new Date(isoDate + 'T00:00:00');
  let day = d.getUTCDay(); // 0=Sun..6=Sat
  return day === 0 ? 7 : day; // 7=Sun
};

// Rooms
app.get('/api/rooms', (req, res) => {
  const rows = db.prepare('SELECT id, code, name FROM rooms ORDER BY code').all();
  res.json(rows);
});

// Create reservation (defaults to pending)
app.post('/api/reservations', (req, res) => {
  try {
    const { room_id, reserver_name, purpose, date, start_time, end_time } = req.body || {};
    if (!room_id || !reserver_name || !date || !start_time || !end_time) {
      return res.status(400).json({ message: 'room_id, reserver_name, date, start_time, end_time are required' });
    }
    const stmt = db.prepare(`
      INSERT INTO reservations (room_id, reserver_name, purpose, date, start_time, end_time, status)
      VALUES (@room_id, @reserver_name, @purpose, @date, @start_time, @end_time, 'pending')
    `);
    const info = stmt.run({ room_id, reserver_name, purpose, date, start_time, end_time });
    const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal error' });
  }
});

// Confirm / Reject by admin
app.patch('/api/reservations/:id/confirm', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare(`
    UPDATE reservations
    SET status = 'confirmed', updated_at = datetime('now')
    WHERE id = ?
  `);
  const info = stmt.run(id);
  if (info.changes === 0) return res.status(404).json({ message: 'Not found' });
  res.json({ id, status: 'confirmed' });
});

app.patch('/api/reservations/:id/reject', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare(`
    UPDATE reservations
    SET status = 'rejected', updated_at = datetime('now')
    WHERE id = ?
  `);
  const info = stmt.run(id);
  if (info.changes === 0) return res.status(404).json({ message: 'Not found' });
  res.json({ id, status: 'rejected' });
});

// List reservations (optionally by date or room)
app.get('/api/reservations', (req, res) => {
  const { date, room_id, status } = req.query;
  const where = [];
  const params = {};
  if (date) { where.push('date = @date'); params.date = date; }
  if (room_id) { where.push('room_id = @room_id'); params.room_id = room_id; }
  if (status) { where.push('status = @status'); params.status = status; }
  const sql = `SELECT * FROM reservations ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY date, start_time`;
  const rows = db.prepare(sql).all(params);
  res.json(rows);
});

// Day view: returns per-room status for a given date
app.get('/api/schedule/day/:isoDate', (req, res) => {
  const { isoDate } = req.params;
  // join rooms + reservations for that date
  const rooms = db.prepare('SELECT id, code, name FROM rooms ORDER BY code').all();
  const dayRes = db.prepare('SELECT * FROM reservations WHERE date = ?').all(isoDate);

  const grouped = {};
  for (const r of dayRes) {
    const arr = grouped[r.room_id] || [];
    arr.push(r);
    grouped[r.room_id] = arr;
  }

  const result = rooms.map(room => {
    const resv = grouped[room.id] || [];
    // derive status for the room:
    // if any confirmed reservation exists, mark as reserved
    // else if any pending exists, mark as pending
    // else available
    const hasConfirmed = resv.some(r => r.status === 'confirmed');
    const hasPending = resv.some(r => r.status === 'pending');
    const status = hasConfirmed ? 'reserved' : hasPending ? 'pending' : 'available';
    return { room, status, reservations: resv };
  });

  res.json({ date: isoDate, day_of_week: toDayOfWeek(isoDate), rooms: result });
});

// Month summary (optional): number of reservations per day
app.get('/api/schedule/month', (req, res) => {
  const { ym } = req.query; // e.g., 2025-11
  if (!ym) return res.status(400).json({ message: 'ym is required: YYYY-MM' });
  const rows = db.prepare("SELECT date, COUNT(*) as count FROM reservations WHERE substr(date,1,7) = ? GROUP BY date").all(ym);
  res.json(rows);
});

const port = process.env.PORT || 4321;
app.listen(port, () => {
  console.log('✅ LabReserve API running on http://localhost:' + port);
});
