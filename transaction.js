const { loadData, saveData } = require('./storage');
const { getWallet } = require('./wallet');

function addTransaction({ walletName, categoryName, amount, description }) {
  const data = loadData();

  // Find Wallet
  const wallet = data.wallets.find(w => 
    w.id === walletName.toLowerCase() || 
    w.name.toLowerCase() === walletName.toLowerCase()
  );
  if (!wallet) {
    throw new Error(`Wallet "${walletName}" not found. Create it first using: node index.js wallet add "${walletName}"`);
  }

  // Find or Create Category
  let category = data.categories.find(c => c.toLowerCase() === categoryName.trim().toLowerCase());
  if (!category) {
    category = categoryName.trim();
    data.categories.push(category);
  }

  const txAmount = Number(amount);
  if (isNaN(txAmount) || txAmount === 0) {
    throw new Error('Transaction amount must be a non-zero number.');
  }

  const newTx = {
    id: `tx_${Date.now()}`,
    walletId: wallet.id,
    category: category,
    amount: txAmount,
    description: description || '',
    timestamp: new Date().toISOString()
  };

  // Verify credit limit
  if (wallet.type === 'credit') {
    const nextBalance = wallet.balance + txAmount;
    if (nextBalance < -wallet.limit) {
      throw new Error(`Transaction of ${txAmount} exceeds the credit limit of ${wallet.limit}. Available credit: ${wallet.limit + wallet.balance}.`);
    }
  }

  // Update wallet balance
  wallet.balance += txAmount;

  data.transactions.push(newTx);
  saveData(data);
  return { transaction: newTx, newBalance: wallet.balance };
}

function listTransactions(filters = {}) {
  const data = loadData();
  let results = [...data.transactions];

  if (filters.wallet) {
    const targetWallet = getWallet(filters.wallet);
    if (targetWallet) {
      results = results.filter(tx => tx.walletId === targetWallet.id);
    } else {
      return []; // Wallet filter specified but not found
    }
  }

  if (filters.category) {
    const catLower = filters.category.toLowerCase();
    results = results.filter(tx => tx.category.toLowerCase() === catLower);
  }

  // Sort by timestamp descending (newest first)
  return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function deleteTransaction(id) {
  const data = loadData();
  const index = data.transactions.findIndex(tx => tx.id === id);
  if (index === -1) {
    throw new Error(`Transaction with ID "${id}" not found.`);
  }

  const tx = data.transactions[index];
  const wallet = data.wallets.find(w => w.id === tx.walletId);
  
  if (wallet) {
    if (wallet.type === 'credit') {
      const nextBalance = wallet.balance - tx.amount;
      if (nextBalance < -wallet.limit) {
        throw new Error('Deleting this transaction would exceed the credit limit.');
      }
    }
    // Revert the balance changes (subtract the original amount added)
    wallet.balance -= tx.amount;
  }

  data.transactions.splice(index, 1);
  saveData(data);
  return tx;
}

module.exports = {
  addTransaction,
  listTransactions,
  deleteTransaction
};
