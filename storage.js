const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data.json');

const DEFAULT_DATA = {
  wallets: [
    { id: 'cash', name: 'Cash', balance: 0 }
  ],
  categories: ['Food', 'Transport', 'Shopping', 'Entertainment', 'Salary', 'Others'],
  transactions: [],
  debts: []
};

function loadData() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      saveData(DEFAULT_DATA);
      return DEFAULT_DATA;
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
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving database:', error.message);
  }
}

module.exports = {
  loadData,
  saveData
};
