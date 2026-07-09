const fs = require('fs');
const path = require('path');
const os = require('os');

const DB_DIR = path.join(os.homedir(), '.cli-mm');
const DB_FILE = process.env.NODE_ENV === 'test'
  ? path.join(process.cwd(), 'test-data.json')
  : path.join(DB_DIR, 'data.json');

const DEFAULT_DATA = {
  wallets: [
    { id: 'cash', name: 'Cash', balance: 0 }
  ],
  categories: ['Food', 'Transport', 'Shopping', 'Entertainment', 'Salary', 'Others'],
  transactions: [],
  debts: []
};

function ensureDbDir() {
  if (process.env.NODE_ENV !== 'test') {
    fs.mkdirSync(DB_DIR, { recursive: true });
    
    // Migration check: if global DB doesn't exist, but local data.json exists in CWD
    const localDb = path.join(process.cwd(), 'data.json');
    if (!fs.existsSync(DB_FILE) && fs.existsSync(localDb)) {
      try {
        fs.copyFileSync(localDb, DB_FILE);
        console.log(`[cli-mm] Migrated existing database from local directory to global path: ${DB_FILE}`);
      } catch (e) {
        console.error('[cli-mm] Failed to migrate local database:', e.message);
      }
    }
  }
}

function loadData() {
  try {
    ensureDbDir();
    if (!fs.existsSync(DB_FILE)) {
      const freshData = JSON.parse(JSON.stringify(DEFAULT_DATA));
      saveData(freshData);
      return freshData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data.debts) {
      data.debts = [];
    }
    return data;
  } catch (error) {
    console.error('Error loading database:', error.message);
    return DEFAULT_DATA;
  }
}

function saveData(data) {
  try {
    ensureDbDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving database:', error.message);
  }
}

module.exports = {
  loadData,
  saveData
};
