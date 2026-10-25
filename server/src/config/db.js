const mongoose = require('mongoose');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let mongodProcess = null;

const startLocalMongodIfInstalled = async () => {
  const binaryPath = 'C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe';
  const dbPath = path.resolve(__dirname, '../../data/db');

  if (fs.existsSync(binaryPath)) {
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }
    console.log(`[Database] Attempting to auto-start local mongod at ${dbPath}...`);
    try {
      mongodProcess = spawn(binaryPath, ['--dbpath', dbPath, '--port', '27017', '--bind_ip', '127.0.0.1'], {
        detached: false,
        stdio: 'ignore'
      });
      mongodProcess.unref();
      // wait 2 seconds for mongo to initialize
      await new Promise(res => setTimeout(res, 2000));
      console.log('[Database] Local mongod process started successfully.');
    } catch (err) {
      console.warn('[Database] Could not auto-start mongod:', err.message);
    }
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/visteon_inventory';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[Database] Direct connection failed (${err.message}). Trying auto-launch...`);
    await startLocalMongodIfInstalled();
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[Database] MongoDB Connected after auto-launch: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (retryErr) {
      console.error('[Database] MongoDB Connection Error:', retryErr.message);
      throw retryErr;
    }
  }
};

process.on('exit', () => {
  if (mongodProcess && !mongodProcess.killed) {
    try {
      mongodProcess.kill();
    } catch (e) {}
  }
});

module.exports = connectDB;
