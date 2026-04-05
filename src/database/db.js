const { QuickDB, SqliteDriver } = require('quick.db');
const path = require('path');
const Logger = require('../utils/logger');

// Database file path
const dbPath = path.join(process.cwd(), 'json.sqlite');

// Initialize the driver (SqliteDriver uses better-sqlite3 in quick.db v9)
const driver = new SqliteDriver(dbPath);

// Create the database instance
const db = new QuickDB({ driver });

Logger.success(`Database initialized at ${dbPath}`);

module.exports = db;
