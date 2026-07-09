const { loadData, saveData } = require('./storage');
const { getWallet } = require('./wallet');

function addDebt({ type, friendName, amount, txId, description }) {
  const data = loadData();

  if (type !== 'lend' && type !== 'borrow') {
    throw new Error('Debt type must be either "lend" (friend owes you) or "borrow" (you owe friend).');
  }

  const debtAmount = Number(amount);
  if (isNaN(debtAmount) || debtAmount <= 0) {
    throw new Error('Debt amount must be a positive number.');
  }

  let finalDescription = description || '';

  // If linked to transaction, verify it and auto-fill description if empty
  if (txId) {
    const linkedTx = data.transactions.find(t => t.id === txId);
    if (!linkedTx) {
      throw new Error(`Linked transaction ID "${txId}" not found.`);
    }
    if (!finalDescription) {
      finalDescription = `Linked to: ${linkedTx.description || 'Transaction ' + txId}`;
    }
  }

  const newDebt = {
    id: `debt_${Date.now()}`,
    type,
    friend: friendName.trim(),
    amount: debtAmount,
    txId: txId || null,
    description: finalDescription,
    isSettled: false,
    timestamp: new Date().toISOString()
  };

  data.debts.push(newDebt);
  saveData(data);
  return newDebt;
}

function settleDebt(debtId, walletName) {
  const data = loadData();
  const debt = data.debts.find(d => d.id === debtId);
  
  if (!debt) {
    throw new Error(`Debt record with ID "${debtId}" not found.`);
  }
  if (debt.isSettled) {
    throw new Error(`Debt is already settled.`);
  }

  // Find Wallet
  const wallet = data.wallets.find(w => 
    w.id === walletName.toLowerCase() || 
    w.name.toLowerCase() === walletName.toLowerCase()
  );
  if (!wallet) {
    throw new Error(`Wallet "${walletName}" not found. Create it first using: node index.js wallet add "${walletName}"`);
  }

  // Determine transaction details based on type
  // 'lend': Friend pays you back -> You get money (+amount)
  // 'borrow': You pay friend back -> You lose money (-amount)
  const changeAmount = debt.type === 'lend' ? debt.amount : -debt.amount;
  const category = debt.type === 'lend' ? 'Payback' : 'Repayment';
  const txDesc = debt.type === 'lend'
    ? `Payback from ${debt.friend}${debt.description ? ': ' + debt.description : ''}`
    : `Repaid ${debt.friend}${debt.description ? ': ' + debt.description : ''}`;

  // Log transaction
  const newTx = {
    id: `tx_${Date.now()}`,
    walletId: wallet.id,
    category,
    amount: changeAmount,
    description: txDesc,
    timestamp: new Date().toISOString()
  };

  // Adjust wallet balance
  wallet.balance += changeAmount;

  // Mark debt as settled
  debt.isSettled = true;

  data.transactions.push(newTx);
  data.debts = data.debts.map(d => d.id === debtId ? debt : d);

  saveData(data);
  return { debt, transaction: newTx, newBalance: wallet.balance };
}

function listDebts(filters = {}) {
  const data = loadData();
  let results = [...data.debts];

  if (filters.friend) {
    const friendLower = filters.friend.toLowerCase();
    results = results.filter(d => d.friend.toLowerCase() === friendLower);
  }

  if (filters.unsettledOnly) {
    results = results.filter(d => !d.isSettled);
  }

  // Enrich with transaction details if linked
  return results.map(d => {
    if (d.txId) {
      const tx = data.transactions.find(t => t.id === d.txId);
      return {
        ...d,
        linkedTxDesc: tx ? tx.description : null
      };
    }
    return d;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = {
  addDebt,
  settleDebt,
  listDebts
};
