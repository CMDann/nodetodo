const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'todos.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        sort_order INTEGER DEFAULT 0,
        notes TEXT DEFAULT ''
    )`);
    
    // Add columns if they don't exist (for existing databases)
    db.run(`ALTER TABLE todos ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding updated_at column:', err);
        }
    });
    
    db.run(`ALTER TABLE todos ADD COLUMN completed_at DATETIME NULL`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding completed_at column:', err);
        }
    });
    
    db.run(`ALTER TABLE todos ADD COLUMN sort_order INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding sort_order column:', err);
        }
    });
    
    db.run(`ALTER TABLE todos ADD COLUMN notes TEXT DEFAULT ''`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding notes column:', err);
        }
    });
    
    // Create project metadata table
    db.run(`CREATE TABLE IF NOT EXISTS project_meta (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        title TEXT DEFAULT 'Todo Project',
        description TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Insert default project if not exists
    db.run(`INSERT OR IGNORE INTO project_meta (id, title, description) VALUES (1, 'Todo Project', '')`);
});

module.exports = db;