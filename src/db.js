const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'iot.db');
let db = null;
let isNativeNodeSqlite = false;

// Attempt to use sqlite3 package, fallback to node:sqlite if available
let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (err) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    if (DatabaseSync) {
      isNativeNodeSqlite = true;
    }
  } catch (err2) {
    console.error('Neither sqlite3 nor node:sqlite could be loaded.');
  }
}

let dbInstance;

if (!isNativeNodeSqlite && sqlite3) {
  dbInstance = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error connecting to SQLite database:', err.message);
    } else {
      console.log('Connected to SQLite database at', dbPath);
    }
  });
} else if (isNativeNodeSqlite) {
  const { DatabaseSync } = require('node:sqlite');
  dbInstance = new DatabaseSync(dbPath);
  console.log('Connected to native node:sqlite database at', dbPath);
} else {
  console.warn('SQLite driver not found. Initializing in-memory fallback store.');
}

// Unified Promise wrapper for queries
const dbAsync = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!isNativeNodeSqlite && dbInstance) {
        dbInstance.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      } else if (isNativeNodeSqlite && dbInstance) {
        try {
          const stmt = dbInstance.prepare(sql);
          const result = stmt.run(...params);
          resolve({ lastID: result.lastInsertRowid, changes: result.changes });
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error('No database driver available'));
      }
    });
  },

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!isNativeNodeSqlite && dbInstance) {
        dbInstance.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      } else if (isNativeNodeSqlite && dbInstance) {
        try {
          const stmt = dbInstance.prepare(sql);
          const row = stmt.get(...params);
          resolve(row);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error('No database driver available'));
      }
    });
  },

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!isNativeNodeSqlite && dbInstance) {
        dbInstance.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      } else if (isNativeNodeSqlite && dbInstance) {
        try {
          const stmt = dbInstance.prepare(sql);
          const rows = stmt.all(...params);
          resolve(rows || []);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error('No database driver available'));
      }
    });
  }
};

// Initialize schema
async function initDb() {
  try {
    // 1. Users table
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Sensor Readings table
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        temperature REAL NOT NULL,
        humidity REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Device State table (LED & LCD)
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS device_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        led_state TEXT DEFAULT 'OFF',
        lcd_row1 TEXT DEFAULT 'HOME AUTOMATION',
        lcd_row2 TEXT DEFAULT 'SYSTEM READY',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure initial device state exists
    const deviceState = await dbAsync.get('SELECT * FROM device_state WHERE id = 1');
    if (!deviceState) {
      await dbAsync.run(
        `INSERT INTO device_state (id, led_state, lcd_row1, lcd_row2) VALUES (1, 'OFF', 'HOME AUTOMATION', 'SYSTEM READY')`
      );
    }

    // Seed dummy readings if empty so the dashboard is immediately functional
    const countRow = await dbAsync.get('SELECT COUNT(*) as count FROM sensor_readings');
    if (countRow && countRow.count === 0) {
      const now = Date.now();
      for (let i = 15; i >= 1; i--) {
        const fakeTime = new Date(now - i * 60 * 1000).toISOString();
        const fakeTemp = Number((27.5 + Math.sin(i / 2) * 3).toFixed(1));
        const fakeHum = Number((62.0 + Math.cos(i / 2) * 8).toFixed(1));
        await dbAsync.run(
          'INSERT INTO sensor_readings (temperature, humidity, created_at) VALUES (?, ?, ?)',
          [fakeTemp, fakeHum, fakeTime]
        );
      }
      console.log('Seeded initial sensor readings for demo.');
    }

    console.log('SQLite Database schema initialized successfully.');
  } catch (error) {
    console.error('Error during SQLite database initialization:', error);
  }
}

module.exports = {
  dbAsync,
  initDb
};
