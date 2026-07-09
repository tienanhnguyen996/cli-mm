const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

// Set env variable to 'test' so storage.js uses 'test-data.json'
process.env.NODE_ENV = 'test';

const { loadData } = require('./storage');
const { addWallet, listWallets, getWallet } = require('./wallet');
const { addCategory, listCategories } = require('./category');
const { addTransaction, listTransactions, deleteTransaction } = require('./transaction');
const { addDebt, settleDebt, listDebts } = require('./debt');

function cleanupTestDb() {
  const testDbFile = path.join(process.cwd(), 'test-data.json');
  if (fs.existsSync(testDbFile)) {
    try {
      fs.unlinkSync(testDbFile);
    } catch (e) {
      // Ignore if file is busy
    }
  }
}

test.describe('cli-mm test suite', () => {

  test.beforeEach(() => {
    cleanupTestDb();
  });

  test.afterEach(() => {
    cleanupTestDb();
  });

  test('Storage: initialization and defaults', () => {
    const data = loadData();
    assert.strictEqual(data.wallets.length, 1);
    assert.strictEqual(data.wallets[0].id, 'cash');
    assert.ok(data.categories.includes('Food'));
    assert.strictEqual(data.transactions.length, 0);
    assert.strictEqual(data.debts.length, 0);
  });

  test('Wallet: add, list, get and edge cases', () => {
    // Add wallet
    const w1 = addWallet('TPBank', 1000000);
    assert.strictEqual(w1.id, 'tpbank');
    assert.strictEqual(w1.name, 'TPBank');
    assert.strictEqual(w1.balance, 1000000);

    // List wallets
    const list = listWallets();
    assert.strictEqual(list.length, 2); // default cash + tpbank

    // Get wallet
    const found = getWallet('tpbank');
    assert.strictEqual(found.name, 'TPBank');

    // Edge case: Duplicate wallet name
    assert.throws(() => {
      addWallet('TPBank');
    }, /already exists/);

    // Edge case: Empty / invalid balance defaults to 0
    const w2 = addWallet('MoMo', 'invalid-balance');
    assert.strictEqual(w2.balance, 0);
  });

  test('Category: add, list and edge cases', () => {
    const cat = addCategory('Gifts');
    assert.strictEqual(cat, 'Gifts');

    const list = listCategories();
    assert.ok(list.includes('Gifts'));

    // Edge case: Duplicate category
    assert.throws(() => {
      addCategory('Gifts');
    }, /already exists/);

    // Edge case: Empty name
    assert.throws(() => {
      addCategory('   ');
    }, /name cannot be empty/);
  });

  test('Transaction: add, list, delete and edge cases', () => {
    addWallet('Bank', 100000);

    // Add transaction (expense)
    const { transaction: t1, newBalance: b1 } = addTransaction({
      walletName: 'Bank',
      categoryName: 'Food',
      amount: -30000,
      description: 'Coffee'
    });
    assert.strictEqual(b1, 70000);
    assert.strictEqual(t1.amount, -30000);
    assert.strictEqual(t1.category, 'Food');

    // Add transaction (income)
    const { transaction: t2, newBalance: b2 } = addTransaction({
      walletName: 'Bank',
      categoryName: 'Salary',
      amount: 50000,
      description: 'Bonus'
    });
    assert.strictEqual(b2, 120000);

    // List transactions
    const list = listTransactions({ wallet: 'bank' });
    assert.strictEqual(list.length, 2);
    // Sorts by newest first
    assert.strictEqual(list[0].id, t2.id);

    // Delete transaction
    const deleted = deleteTransaction(t1.id);
    assert.strictEqual(deleted.id, t1.id);
    
    // Wallet balance should revert (120,000 - (-30,000) = 150,000)
    const updatedWallet = getWallet('bank');
    assert.strictEqual(updatedWallet.balance, 150000);

    // Edge case: Non-existent wallet
    assert.throws(() => {
      addTransaction({
        walletName: 'NonExistent',
        categoryName: 'Food',
        amount: -50000
      });
    }, /not found/);

    // Edge case: Amount is 0
    assert.throws(() => {
      addTransaction({
        walletName: 'Bank',
        categoryName: 'Food',
        amount: 0
      });
    }, /must be a non-zero number/);

    // Edge case: Delete non-existent transaction
    assert.throws(() => {
      deleteTransaction('tx_nonexistent');
    }, /not found/);
  });

  test('Debt: Lend, Borrow, Settle and edge cases', () => {
    addWallet('Savings', 500000);
    
    // 1. Indirect lending: linked to group bill transaction (no wallet)
    const { transaction: pizzaTx } = addTransaction({
      walletName: 'Savings',
      categoryName: 'Food',
      amount: -300000,
      description: 'Dinner'
    });

    const d1 = addDebt({
      type: 'lend',
      friendName: 'Nam',
      amount: 100000,
      txId: pizzaTx.id,
      description: 'Pizza Share'
    });
    assert.strictEqual(d1.type, 'lend');
    assert.strictEqual(d1.friend, 'Nam');
    assert.strictEqual(d1.amount, 100000);
    assert.strictEqual(d1.txId, pizzaTx.id);

    // Verify wallet balance is NOT affected by indirect lending (remains 200k)
    let w = getWallet('savings');
    assert.strictEqual(w.balance, 200000);

    // 2. Direct lending (with wallet, no txId)
    const d2 = addDebt({
      type: 'lend',
      friendName: 'An',
      amount: 50000,
      walletName: 'Savings',
      description: 'Cash loan'
    });
    assert.strictEqual(d2.type, 'lend');
    // Verify wallet balance decreases immediately (200k - 50k = 150k)
    w = getWallet('savings');
    assert.strictEqual(w.balance, 150000);
    // Verify a Lend transaction was automatically logged
    const txs = listTransactions({ wallet: 'savings' });
    const lendTx = txs.find(tx => tx.category === 'Lend');
    assert.ok(lendTx);
    assert.strictEqual(lendTx.amount, -50000);

    // 3. Indirect borrowing: friend paid on behalf (no wallet)
    const d3 = addDebt({
      type: 'borrow',
      friendName: 'Minh',
      amount: 40000,
      description: 'Taxi share'
    });
    assert.strictEqual(d3.type, 'borrow');
    assert.strictEqual(d3.txId, null);
    // Verify wallet balance is NOT affected (remains 150k)
    w = getWallet('savings');
    assert.strictEqual(w.balance, 150000);

    // 4. Direct borrowing (with wallet, e.g. friend gave us cash)
    const d4 = addDebt({
      type: 'borrow',
      friendName: 'Lan',
      amount: 80000,
      walletName: 'Savings',
      description: 'Borrowed cash'
    });
    assert.strictEqual(d4.type, 'borrow');
    // Verify wallet balance increases immediately (150k + 80k = 230k)
    w = getWallet('savings');
    assert.strictEqual(w.balance, 230000);
    // Verify a Borrow transaction was automatically logged
    const borrowTx = listTransactions({ wallet: 'savings' }).find(tx => tx.category === 'Borrow');
    assert.ok(borrowTx);
    assert.strictEqual(borrowTx.amount, 80000);

    // 5. Settling lend debt (friend pays back) -> adds to wallet (230k + 100k = 330k)
    const { debt: settledLend, newBalance: bAfterLend } = settleDebt(d1.id, 'Savings');
    assert.strictEqual(settledLend.isSettled, true);
    assert.strictEqual(bAfterLend, 330000);

    // 6. Settling indirect borrow debt (we pay them back) -> deducts from wallet (330k - 40k = 290k)
    const { debt: settledBorrow, newBalance: bAfterBorrow } = settleDebt(d3.id, 'Savings');
    assert.strictEqual(settledBorrow.isSettled, true);
    assert.strictEqual(bAfterBorrow, 290000);

    // Edge case: Lending without wallet and without txId should throw error
    assert.throws(() => {
      addDebt({
        type: 'lend',
        friendName: 'Nam',
        amount: 50000
      });
    }, /Lending requires/);

    // Edge case: Link debt to non-existent transaction
    assert.throws(() => {
      addDebt({
        type: 'lend',
        friendName: 'Nam',
        amount: 50000,
        txId: 'tx_nonexistent'
      });
    }, /not found/);

    // Edge case: Invalid type
    assert.throws(() => {
      addDebt({
        type: 'invalid-type',
        friendName: 'Nam',
        amount: 50000
      });
    }, /must be either/);
  });

  test('Credit Wallet: limits and transaction validation', () => {
    // Add credit card wallet (Limit: 10,000,000)
    const card = addWallet('CreditCard', 0, 'credit', 10000000);
    assert.strictEqual(card.type, 'credit');
    assert.strictEqual(card.limit, 10000000);
    assert.strictEqual(card.balance, 0);

    // Spend 3,000,000 (valid)
    const { newBalance: b1 } = addTransaction({
      walletName: 'CreditCard',
      categoryName: 'Shopping',
      amount: -3000000,
      description: 'New Shoes'
    });
    assert.strictEqual(b1, -3000000);

    // Spend another 8,000,000 (invalid: total -11,000,000 exceeds limit of -10,000,000)
    assert.throws(() => {
      addTransaction({
        walletName: 'CreditCard',
        categoryName: 'Shopping',
        amount: -8000000,
        description: 'New Phone'
      });
    }, /exceeds the credit limit/);

    // Wallet balance should remain -3,000,000
    const cardUpdated = getWallet('creditcard');
    assert.strictEqual(cardUpdated.balance, -3000000);

    // Test transaction deletion that violates credit limit:
    // Log a refund of 5,000,000 -> Balance becomes +2,000,000
    const { transaction: refundTx } = addTransaction({
      walletName: 'CreditCard',
      categoryName: 'Shopping',
      amount: 5000000,
      description: 'Refund'
    });
    assert.strictEqual(getWallet('creditcard').balance, 2000000);

    // Log another expense of -11,000,000 -> Balance becomes -9,000,000 (valid, under 10M limit)
    addTransaction({
      walletName: 'CreditCard',
      categoryName: 'Shopping',
      amount: -11000000,
      description: 'Gadget'
    });
    assert.strictEqual(getWallet('creditcard').balance, -9000000);

    // Attempting to delete the +5M refund would make balance -14,000,000, which violates the 10M limit!
    assert.throws(() => {
      deleteTransaction(refundTx.id);
    }, /exceed the credit limit/);

    // Balance should remain -9,000,000
    assert.strictEqual(getWallet('creditcard').balance, -9000000);
  });
});
