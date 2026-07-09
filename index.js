#!/data/data/com.termux/files/usr/bin/env node

const { addWallet, listWallets } = require('./wallet');
const { addCategory, listCategories } = require('./category');
const { addTransaction, listTransactions, deleteTransaction } = require('./transaction');
const { loadData } = require('./storage');
const { addDebt, settleDebt, listDebts } = require('./debt');
const { generateReport, generateEstimation } = require('./report');

const args = process.argv.slice(2);
const command = args[0];

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1];
      if (val && !val.startsWith('--')) {
        flags[key] = val;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

function showHelp() {
  console.log(`
CLI Money Management (cli-mm) - Usage Guide

Wallets:
  mm wallet list
  mm wallet add <name> [initial_balance] [--type <normal|credit>] [--limit <limit>]

Categories:
  mm category list
  mm category add <name>

Transactions:
  mm tx list [--wallet <name>] [--category <name>]
  mm tx add --wallet <wallet> --category <category> --amount <amount> [--desc <description>]
  mm tx delete <transaction_id>

Loans & Debts:
  mm debt list [--friend <name>] [--unsettled]
  mm debt add --type <lend|borrow> --friend <name> --amount <amount> [--wallet <wallet>] [--tx <tx_id>] [--desc <description>]
  mm debt settle <debt_id> --wallet <wallet>

Reports:
  mm report <daily|weekly|monthly>
  mm report --from YYYY-MM-DD --to YYYY-MM-DD

Summary & Overview:
  mm summary
  mm estimate
  mm help
`);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function handleWallet() {
  const subcommand = args[1];
  if (subcommand === 'list') {
    const list = listWallets();
    console.log('\n--- WALLETS ---');
    if (list.length === 0) {
      console.log('No wallets found. Create one using: mm wallet add <name>');
    } else {
      list.forEach(w => {
        if (w.type === 'credit') {
          const available = w.limit + w.balance;
          console.log(`- ${w.name} (ID: ${w.id}) [Credit] | Balance: ${formatCurrency(w.balance)} (Limit: ${formatCurrency(w.limit)}, Available: ${formatCurrency(available)})`);
        } else {
          console.log(`- ${w.name} (ID: ${w.id}) | Balance: ${formatCurrency(w.balance)}`);
        }
      });
    }
    console.log('');
  } else if (subcommand === 'add') {
    const name = args[2];
    if (!name) {
      console.error('Error: Please specify a wallet name. Example: mm wallet add "TPBank" 100000');
      process.exit(1);
    }
    
    // Parse flags from index 3 onwards
    const flags = parseFlags(args.slice(3));
    let initialBalance = 0;
    // If the first argument after name is a number, it's the initial balance
    if (args[3] && !args[3].startsWith('--') && !isNaN(Number(args[3]))) {
      initialBalance = Number(args[3]);
    }

    const type = flags.type || 'normal';
    const limit = flags.limit || 0;

    try {
      const wallet = addWallet(name, initialBalance, type, limit);
      if (wallet.type === 'credit') {
        console.log(`Credit Wallet "${wallet.name}" successfully created with limit of ${formatCurrency(wallet.limit)}.`);
      } else {
        console.log(`Wallet "${wallet.name}" successfully created with balance of ${formatCurrency(wallet.balance)}.`);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.error('Unknown wallet subcommand. Try: list, add');
    process.exit(1);
  }
}

function handleCategory() {
  const subcommand = args[1];
  if (subcommand === 'list') {
    const list = listCategories();
    console.log('\n--- CATEGORIES ---');
    list.forEach(c => console.log(`- ${c}`));
    console.log('');
  } else if (subcommand === 'add') {
    const name = args[2];
    if (!name) {
      console.error('Error: Please specify a category name. Example: node index.js category add "Groceries"');
      process.exit(1);
    }
    try {
      const category = addCategory(name);
      console.log(`Category "${category}" successfully added.`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.error('Unknown category subcommand. Try: list, add');
    process.exit(1);
  }
}

function handleTransaction() {
  const subcommand = args[1];
  if (subcommand === 'list') {
    const flags = parseFlags(args.slice(2));
    const txs = listTransactions({ wallet: flags.wallet, category: flags.category });
    console.log('\n--- TRANSACTIONS ---');
    if (txs.length === 0) {
      console.log('No transactions matched your filters.');
    } else {
      txs.forEach(t => {
        const typeSymbol = t.amount < 0 ? '-' : '+';
        const absVal = Math.abs(t.amount);
        const dateStr = new Date(t.timestamp).toLocaleString();
        console.log(`[${t.id}] [${dateStr}] [Wallet: ${t.walletId}] [Cat: ${t.category}] ${typeSymbol}${formatCurrency(absVal)} | Desc: ${t.description}`);
      });
    }
    console.log('');
  } else if (subcommand === 'add') {
    const flags = parseFlags(args.slice(2));
    if (!flags.wallet || !flags.category || !flags.amount) {
      console.error('Error: Missing required fields. Usage: node index.js tx add --wallet <wallet> --category <category> --amount <amount> [--desc <desc>]');
      process.exit(1);
    }
    try {
      const { transaction, newBalance } = addTransaction({
        walletName: flags.wallet,
        categoryName: flags.category,
        amount: flags.amount,
        description: flags.desc
      });
      console.log(`Transaction logged successfully! ID: ${transaction.id}`);
      console.log(`New balance for wallet "${flags.wallet}": ${formatCurrency(newBalance)}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  } else if (subcommand === 'delete') {
    const id = args[2];
    if (!id) {
      console.error('Error: Please specify the transaction ID. Example: node index.js tx delete tx_123456');
      process.exit(1);
    }
    try {
      const tx = deleteTransaction(id);
      console.log(`Transaction "${tx.id}" of ${formatCurrency(tx.amount)} deleted. Wallet balance adjusted.`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.error('Unknown tx subcommand. Try: list, add, delete');
    process.exit(1);
  }
}

function handleDebt() {
  const subcommand = args[1];
  if (subcommand === 'list') {
    const flags = parseFlags(args.slice(2));
    const list = listDebts({ friend: flags.friend, unsettledOnly: flags.unsettled });
    console.log('\n--- DEBTS & LOANS ---');
    if (list.length === 0) {
      console.log('No debt records matched your filters.');
    } else {
      list.forEach(d => {
        const typeStr = d.type === 'lend' ? 'Lent (They owe you)' : 'Borrowed (You owe them)';
        const status = d.isSettled ? 'Settled' : 'UNSETTLED';
        const dateStr = new Date(d.timestamp).toLocaleString();
        const txContext = d.linkedTxDesc ? ` | [Ref: ${d.linkedTxDesc}]` : '';
        console.log(`[${d.id}] [${dateStr}] [${status}] [${typeStr}] Friend: ${d.friend} | Amount: ${formatCurrency(d.amount)} | Desc: ${d.description}${txContext}`);
      });
    }
    console.log('');
  } else if (subcommand === 'add') {
    const flags = parseFlags(args.slice(2));
    if (!flags.type || !flags.friend || !flags.amount) {
      console.error('Error: Missing required fields. Usage: node index.js debt add --type <lend|borrow> --friend <name> --amount <amount> [--wallet <wallet>] [--tx <tx_id>] [--desc <desc>]');
      process.exit(1);
    }
    try {
      const debt = addDebt({
        type: flags.type,
        friendName: flags.friend,
        amount: flags.amount,
        txId: flags.tx,
        walletName: flags.wallet,
        description: flags.desc
      });
      console.log(`Debt logged successfully! ID: ${debt.id}`);
      console.log(`Friend: ${debt.friend} | Amount: ${formatCurrency(debt.amount)} | Type: ${debt.type}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  } else if (subcommand === 'settle') {
    const id = args[2];
    const flags = parseFlags(args.slice(3));
    if (!id || !flags.wallet) {
      console.error('Error: Missing fields. Usage: node index.js debt settle <debt_id> --wallet <wallet>');
      process.exit(1);
    }
    try {
      const { debt, transaction, newBalance } = settleDebt(id, flags.wallet);
      console.log(`Debt "${debt.id}" successfully settled.`);
      console.log(`Log transaction: ${transaction.amount < 0 ? '-' : '+'}${formatCurrency(Math.abs(transaction.amount))} logged to wallet "${flags.wallet}".`);
      console.log(`New balance for wallet "${flags.wallet}": ${formatCurrency(newBalance)}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.error('Unknown debt subcommand. Try: list, add, settle');
    process.exit(1);
  }
}

function handleSummary() {
  const data = loadData();
  const totalAssets = data.wallets.reduce((acc, curr) => acc + curr.balance, 0);

  // Outstanding debts summary
  const unsettled = data.debts.filter(d => !d.isSettled);
  const totalOwedToYou = unsettled.filter(d => d.type === 'lend').reduce((acc, curr) => acc + curr.amount, 0);
  const totalYouOwe = unsettled.filter(d => d.type === 'borrow').reduce((acc, curr) => acc + curr.amount, 0);
  const netDebt = totalOwedToYou - totalYouOwe;

  console.log('\n======================================');
  console.log('       MONEY MANAGEMENT SUMMARY       ');
  console.log('======================================');
  console.log(`Total Net Assets: ${formatCurrency(totalAssets)}`);

  console.log('\n--- Wallets ---');
  data.wallets.forEach(w => {
    console.log(`  * ${w.name}: ${formatCurrency(w.balance)}`);
  });

  console.log('\n--- Debts & Loans Summary ---');
  console.log(`  * Total Owed to You: ${formatCurrency(totalOwedToYou)}`);
  console.log(`  * Total You Owe:     ${formatCurrency(totalYouOwe)}`);
  console.log(`  * Net Outstanding:   ${formatCurrency(netDebt)}`);

  console.log('\n--- Recent Transactions (Last 5) ---');
  const recentTxs = [...data.transactions]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  if (recentTxs.length === 0) {
    console.log('  No transactions logged yet.');
  } else {
    recentTxs.forEach(t => {
      const typeSymbol = t.amount < 0 ? '-' : '+';
      const absVal = Math.abs(t.amount);
      const dateStr = new Date(t.timestamp).toLocaleDateString();
      console.log(`  [${dateStr}] [${t.category}] [${t.walletId}] ${typeSymbol}${formatCurrency(absVal)} | ${t.description}`);
    });
  }
  console.log('======================================\n');
}

function handleReport() {
  const flags = parseFlags(args.slice(1));
  const period = args[1];

  try {
    generateReport({
      period,
      fromStr: flags.from,
      toStr: flags.to
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function handleEstimate() {
  try {
    generateEstimation();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Route commands
switch (command) {
  case 'wallet':
    handleWallet();
    break;
  case 'category':
    handleCategory();
    break;
  case 'tx':
    handleTransaction();
    break;
  case 'debt':
    handleDebt();
    break;
  case 'report':
    handleReport();
    break;
  case 'summary':
    handleSummary();
    break;
  case 'estimate':
    handleEstimate();
    break;
  case 'help':
  default:
    showHelp();
    break;
}
