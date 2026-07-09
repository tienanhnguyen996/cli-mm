const { loadData, saveData } = require('./storage');
const { getWallet } = require('./wallet');

function addDebt({ type, friendName, amount, txId, walletName, description }) {
  const data = loadData();

  if (type !== 'lend' && type !== 'borrow') {
    throw new Error('Debt type must be either "lend" (friend owes you) or "borrow" (you owe friend).');
  }

  const debtAmount = Number(amount);
  if (isNaN(debtAmount) || debtAmount <= 0) {
    throw new Error('Debt amount must be a positive number.');
  }

  let finalTxId = txId || null;
  let finalDescription = description || '';

  // Case A: Linked to an existing transaction (Group Split)
  if (txId) {
    const linkedTx = data.transactions.find(t => t.id === txId);
    if (!linkedTx) {
      throw new Error(`Linked transaction ID "${txId}" not found.`);
    }
    if (!finalDescription) {
      finalDescription = `Linked to: ${linkedTx.description || 'Transaction ' + txId}`;
    }
  } 
  // Case B: Direct cash transaction (Wallet provided)
  else if (walletName) {
    const wallet = data.wallets.find(w => 
      w.id === walletName.toLowerCase() || 
      w.name.toLowerCase() === walletName.toLowerCase()
    );
    if (!wallet) {
      throw new Error(`Wallet "${walletName}" not found. Create it first using: node index.js wallet add "${walletName}"`);
    }

    // Lending decreases wallet balance (we gave money out)
    // Borrowing increases wallet balance (they gave us money)
    const changeAmount = type === 'lend' ? -debtAmount : debtAmount;
    const category = type === 'lend' ? 'Lend' : 'Borrow';
    const txDesc = type === 'lend'
      ? `Lent to ${friendName.trim()}${description ? ': ' + description : ''}`
      : `Borrowed from ${friendName.trim()}${description ? ': ' + description : ''}`;

    const newTx = {
      id: `tx_${Date.now()}`,
      walletId: wallet.id,
      category,
      amount: changeAmount,
      description: txDesc,
      timestamp: new Date().toISOString()
    };

    // Verify credit limit
    if (wallet.type === 'credit') {
      const nextBalance = wallet.balance + changeAmount;
      if (nextBalance < -wallet.limit) {
        throw new Error(`Lending/Borrowing this amount exceeds the credit limit of ${wallet.limit}. Available credit: ${wallet.limit + wallet.balance}.`);
      }
    }

    // Update wallet balance and save transaction
    wallet.balance += changeAmount;
    data.transactions.push(newTx);
    finalTxId = newTx.id;
    if (!finalDescription) {
      finalDescription = txDesc;
    }
  } 
  // Case C: No wallet and no transaction linked
  else {
    if (type === 'lend') {
      throw new Error('Lending requires either linking to an existing transaction (--tx) or specifying a wallet (--wallet) to deduct from.');
    }
    // For borrowing: this is "they paid on your behalf" (indirect borrow)
    if (!finalDescription) {
      finalDescription = `Borrowed from ${friendName.trim()} (Paid on your behalf)`;
    }
  }

  const newDebt = {
    id: `debt_${Date.now()}`,
    type,
    friend: friendName.trim(),
    amount: debtAmount,
    txId: finalTxId,
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

  // Verify credit limit
  if (wallet.type === 'credit') {
    const nextBalance = wallet.balance + changeAmount;
    if (nextBalance < -wallet.limit) {
      throw new Error(`Settling this debt exceeds the credit limit of ${wallet.limit}. Available credit: ${wallet.limit + wallet.balance}.`);
    }
  }

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
