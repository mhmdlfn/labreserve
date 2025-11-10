import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, '..', 'data.sqlite');
const schemaPath = path.join(__dirname, 'schema.sql');

// fresh db
try { fs.unlinkSync(dbFile); } catch (e) {}

const db = new Database(dbFile);
const sql = fs.readFileSync(schemaPath, 'utf-8');
db.exec(sql);

console.log('✅ Database reset and seeded:', dbFile);
