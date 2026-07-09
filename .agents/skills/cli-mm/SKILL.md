---
name: cli-mm
description: Guide on how to use, test, and develop the local CLI Money Management (cli-mm) tool.
---

# CLI Money Management (cli-mm) Skill Guide

This skill provides instructions on how to run, test, and develop the CLI Money Management (`cli-mm`) local database application.

---

## 1. Project Architecture

The application is built in Node.js (v18+) with zero external dependencies, structured as follows:
*   `storage.js`: Local JSON database helper (reads/writes to `data.json` or `test-data.json`).
*   `wallet.js`: Manages wallets (Cash, Bank, Savings) and balance synchronization.
*   `category.js`: Categories management (Food, Transport, Salary, etc.).
*   `transaction.js`: Transaction logs (expense/income additions and deletion reversals).
*   `debt.js`: Debt ledger for tracking lend (friend owes you) and borrow (you owe friend) accounts.
*   `index.js`: Command router and output formatter.

---

## 2. CLI Command Cheat Sheet

### Wallets & Categories
*   **List wallets:** `node index.js wallet list`
*   **Add a wallet:** `node index.js wallet add <name> [initial_balance]`
*   **List categories:** `node index.js category list`
*   **Add a category:** `node index.js category add <name>`

### Transactions
*   **Log transaction:** 
    `node index.js tx add --wallet <wallet> --category <category> --amount <amount> [--desc <desc>]`
    *(Negative amount for expenses, positive for income)*
*   **List transactions:** `node index.js tx list [--wallet <name>] [--category <name>]`
*   **Delete transaction:** `node index.js tx delete <transaction_id>`

### Debts & Loans
*   **Add a debt:** 
    `node index.js debt add --type <lend|borrow> --friend <name> --amount <amount> [--tx <tx_id>] [--desc <desc>]`
*   **List unsettled debts:** `node index.js debt list [--friend <name>] [--unsettled]`
*   **Settle a debt:** `node index.js debt settle <debt_id> --wallet <wallet>`

### Financial Overview
*   **Print summary report:** `node index.js summary`
*   **Print help menu:** `node index.js help`

---

## 3. Running Unit Tests

Automated testing is performed using Node's native test runner (zero external dependencies).
To execute the tests:
```bash
node --test test.js
```
The test suite isolates database transactions by utilizing `test-data.json` (auto-cleaned after completion) so that production data is never affected.

---

## 4. Development Principles

When adding features to this codebase:
1.  **Keep it Dependency-Free:** Do not install external npm libraries unless absolutely necessary. Rely on native Node.js core libraries.
2.  **Maintain Wallet Balance Consistency:** Any transaction modification (addition, deletion, debt settlement) must correctly update the corresponding wallet's balance.
3.  **Use Isolated Test DB:** Ensure `process.env.NODE_ENV === 'test'` is set in test files so that `storage.js` redirects file reads/writes to `test-data.json`.
