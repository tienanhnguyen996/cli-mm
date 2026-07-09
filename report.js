const { loadData } = require('./storage');

function getStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function generateReport({ period, fromStr, toStr }) {
  const data = loadData();
  let start, end;
  const today = new Date();

  if (fromStr || toStr) {
    if (!fromStr || !toStr) {
      throw new Error('Both --from and --to dates are required for custom reports.');
    }
    start = getStartOfDay(new Date(fromStr));
    end = getEndOfDay(new Date(toStr));
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid dates provided. Format must be YYYY-MM-DD.');
    }
  } else {
    switch (period) {
      case 'daily':
        start = getStartOfDay(today);
        end = getEndOfDay(today);
        break;
      case 'weekly':
        start = getStartOfDay(getMonday(today));
        end = getEndOfDay(today);
        break;
      case 'monthly':
        start = getStartOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
        end = getEndOfDay(today);
        break;
      default:
        throw new Error('Invalid report period. Choose: daily, weekly, monthly, or specify --from and --to.');
    }
  }

  // Filter transactions in range
  const txs = data.transactions.filter(tx => {
    const txDate = new Date(tx.timestamp);
    return txDate >= start && txDate <= end;
  });

  // Calculate metrics
  let totalIncome = 0;
  let totalExpense = 0;
  
  const categorySummary = {};
  const walletSummary = {};

  // Initialize walletSummary map with all wallets
  data.wallets.forEach(w => {
    walletSummary[w.id] = { name: w.name, income: 0, expense: 0 };
  });

  txs.forEach(tx => {
    const amt = tx.amount;
    
    if (!categorySummary[tx.category]) {
      categorySummary[tx.category] = { income: 0, expense: 0 };
    }
    if (!walletSummary[tx.walletId]) {
      walletSummary[tx.walletId] = { name: tx.walletId, income: 0, expense: 0 };
    }

    if (amt > 0) {
      totalIncome += amt;
      categorySummary[tx.category].income += amt;
      walletSummary[tx.walletId].income += amt;
    } else {
      totalExpense += amt;
      categorySummary[tx.category].expense += amt;
      walletSummary[tx.walletId].expense += amt;
    }
  });

  const netCashFlow = totalIncome + totalExpense;

  // Print Report
  console.log('\n======================================');
  console.log('           FINANCIAL REPORT           ');
  console.log('======================================');
  console.log(`Period: ${start.toLocaleDateString('vi-VN')} to ${end.toLocaleDateString('vi-VN')}`);
  console.log(`Transactions analyzed: ${txs.length}`);
  console.log('--------------------------------------');
  console.log(`Total Income:    +${formatCurrency(totalIncome)}`);
  console.log(`Total Expenses:  ${formatCurrency(totalExpense)}`);
  console.log(`Net Cash Flow:   ${netCashFlow >= 0 ? '+' : ''}${formatCurrency(netCashFlow)}`);
  console.log('--------------------------------------');

  // Category Expense Breakdown
  console.log('\nCategory Breakdown (Expenses):');
  const expensesList = Object.entries(categorySummary)
    .filter(([_, vals]) => vals.expense < 0)
    .sort((a, b) => a[1].expense - b[1].expense); // Sort by largest expense first

  if (expensesList.length === 0) {
    console.log('  No expenses logged in this period.');
  } else {
    expensesList.forEach(([cat, vals]) => {
      const percentage = totalExpense !== 0 ? (vals.expense / totalExpense) * 100 : 0;
      console.log(`  * ${cat}: ${formatCurrency(vals.expense)} (${percentage.toFixed(1)}%)`);
    });
  }

  // Category Income Breakdown
  console.log('\nCategory Breakdown (Income):');
  const incomeList = Object.entries(categorySummary)
    .filter(([_, vals]) => vals.income > 0)
    .sort((a, b) => b[1].income - a[1].income); // Sort by largest income first

  if (incomeList.length === 0) {
    console.log('  No income logged in this period.');
  } else {
    incomeList.forEach(([cat, vals]) => {
      const percentage = totalIncome !== 0 ? (vals.income / totalIncome) * 100 : 0;
      console.log(`  * ${cat}: +${formatCurrency(vals.income)} (${percentage.toFixed(1)}%)`);
    });
  }

  // Wallet Activity
  console.log('\nWallet Activity:');
  const activeWallets = Object.values(walletSummary).filter(w => w.income > 0 || w.expense < 0);
  if (activeWallets.length === 0) {
    console.log('  No wallet activity logged in this period.');
  } else {
    activeWallets.forEach(w => {
      const net = w.income + w.expense;
      console.log(`  * ${w.name}: Net ${net >= 0 ? '+' : ''}${formatCurrency(net)} (In: +${formatCurrency(w.income)}, Out: ${formatCurrency(w.expense)})`);
    });
  }

  // Outstanding Debts & Loans
  console.log('\nOutstanding Debts & Loans:');
  const unsettled = data.debts.filter(d => !d.isSettled);
  if (unsettled.length === 0) {
    console.log('  No outstanding debts or loans.');
  } else {
    const owedToYou = {};
    const youOwe = {};

    unsettled.forEach(d => {
      const norm = d.friend.trim().toLowerCase();
      if (d.type === 'lend') {
        if (!owedToYou[norm]) {
          owedToYou[norm] = { displayName: d.friend.trim(), amount: 0 };
        }
        owedToYou[norm].amount += d.amount;
      } else if (d.type === 'borrow') {
        if (!youOwe[norm]) {
          youOwe[norm] = { displayName: d.friend.trim(), amount: 0 };
        }
        youOwe[norm].amount += d.amount;
      }
    });

    const owedToYouList = Object.values(owedToYou);
    const youOweList = Object.values(youOwe);

    if (owedToYouList.length > 0) {
      console.log('  * Owed to You (Friends owe you):');
      owedToYouList.forEach(entry => {
        console.log(`    - ${entry.displayName}: ${formatCurrency(entry.amount)}`);
      });
    }

    if (youOweList.length > 0) {
      console.log('  * You Owe (You owe friends):');
      youOweList.forEach(entry => {
        console.log(`    - ${entry.displayName}: ${formatCurrency(entry.amount)}`);
      });
    }
  }
  console.log('======================================\n');

  return {
    totalIncome,
    totalExpense,
    netCashFlow,
    txCount: txs.length
  };
}

module.exports = {
  generateReport
};
