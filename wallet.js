const { loadData, saveData } = require('./storage');

function generateId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function addWallet(name, initialBalance = 0, type = 'normal', limit = 0) {
  const data = loadData();
  const id = generateId(name);

  // Check if wallet exists
  const existing = data.wallets.find(w => w.id === id || w.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    throw new Error(`Wallet "${name}" already exists.`);
  }

  const walletType = type === 'credit' ? 'credit' : 'normal';
  const walletLimit = Number(limit) || 0;

  if (walletType === 'credit' && (isNaN(walletLimit) || walletLimit <= 0)) {
    throw new Error('Credit wallets require a positive credit limit (--limit).');
  }

  const newWallet = {
    id,
    name,
    balance: Number(initialBalance) || 0,
    type: walletType
  };

  if (walletType === 'credit') {
    newWallet.limit = walletLimit;
  }

  data.wallets.push(newWallet);
  saveData(data);
  return newWallet;
}

function listWallets() {
  const data = loadData();
  return data.wallets;
}

function getWallet(idOrName) {
  const data = loadData();
  const lower = idOrName.toLowerCase();
  return data.wallets.find(w => w.id === lower || w.name.toLowerCase() === lower);
}

module.exports = {
  addWallet,
  listWallets,
  getWallet
};
