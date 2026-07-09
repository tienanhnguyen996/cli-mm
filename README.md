# CLI Money Management (cli-mm)

A zero-dependency, local JSON-based CLI money management tool built in Node.js. It helps you manage multiple wallets (Cash, Bank, e-wallets), track transaction categories, and manage a complete debt ledger (lending and borrowing) with automated wallet balance synchronization.

---

## Features
*   **Wallets:** Maintain multiple transaction sources with independent balances.
*   **Categories:** Organize spending into default or custom categories.
*   **Transactions:** Log income and expenses (automatically updates wallet balances).
*   **Lending & Borrowing Ledger:**
    *   **Direct Lending:** Lending money immediately reduces your wallet balance (logs a `"Lend"` transaction).
    *   **Indirect Lending:** Link a friend's debt to a group bill transaction to prevent double-deducting your wallet.
    *   **Direct Borrowing:** Borrowing cash/transfers immediately increases your wallet balance (logs a `"Borrow"` transaction).
    *   **Indirect Borrowing:** Track what you owe (e.g. friend paid on your behalf) without changing your wallet balance.
    *   **Settlement:** Settling debts automatically updates your wallet balance (logs `"Payback"` or `"Repayment"` transactions).

---

## Installation & Setup

Ensure you have Node.js (v18+) installed. Clone the repository and install it globally to use the CLI executable directly:

```bash
# Clone the repository
git clone https://github.com/tienanhnguyen996/cli-mm.git
cd cli-mm

# Link the CLI tool globally
npm link
```

Once linked, you can replace `node index.js` in all commands with `mm` or `cli-mm` (e.g. `mm summary`).

### Termux (Android) Installation Notes:
If you are installing inside Termux, follow these extra steps:
1. **Grant executable permission:**
   ```bash
   chmod +x index.js
   ```
2. **Configure PATH environment variable:**
   If you get a `command not found` error after linking, add the global npm binary prefix to your `$PATH`:
   ```bash
   export PATH=$PATH:$(npm get prefix)/bin
   ```
   *(To make this permanent, append the line above to your `~/.bashrc` or `~/.zshrc` configuration files).*

---

## Command Reference

### Wallets
*   **List wallets:**
    ```bash
    mm wallet list
    ```
*   **Add a wallet:**
    ```bash
    mm wallet add <name> [initial_balance] [--type <normal|credit>] [--limit <limit>]
    ```
    *Example:* `mm wallet add TPBank 5000000`
*   **Set/Override a wallet's balance directly:**
    ```bash
    mm wallet set <name> <balance>
    mm wallet override <name> <balance>
    ```
    *Example:* `mm wallet set TPBank 2972363`

### Categories
*   **List categories:**
    ```bash
    mm category list
    ```
*   **Add a category:**
    ```bash
    mm category add <name>
    ```
    *Example:* `mm category add Gifts`

### Transactions
*   **Log transaction:**
    ```bash
    mm tx add --wallet <wallet> --category <category> --amount <amount> [--desc <description>]
    ```
    *(Use negative amount for expenses, positive for income)*
    *Example:* `mm tx add --wallet TPBank --category Food --amount -120000 --desc "Dinner at Pizza 4Ps"`
*   **List transactions:**
    ```bash
    mm tx list [--wallet <name>] [--category <name>]
    ```
*   **Delete transaction:**
    ```bash
    mm tx delete <transaction_id>
    ```

### Debts & Loans
*   **Add a debt (Lend/Borrow):**
    ```bash
    mm debt add --type <lend|borrow> --friend <name> --amount <amount> [--wallet <wallet>] [--tx <tx_id>] [--desc <desc>]
    ```
    *   **Direct Lend:** `mm debt add --type lend --friend Nam --amount 100000 --wallet Cash` (reduces Cash by 100k)
    *   **Indirect Lend (Group split):** `mm debt add --type lend --friend Nam --amount 100000 --tx tx_123` (no balance changes)
    *   **Direct Borrow:** `mm debt add --type borrow --friend Minh --amount 50000 --wallet Cash` (increases Cash by 50k)
    *   **Indirect Borrow:** `mm debt add --type borrow --friend Minh --amount 50000` (no balance changes)
*   **List unsettled debts:**
    ```bash
    mm debt list [--friend <name>] [--unsettled]
    ```
*   **Settle a debt:**
    ```bash
    mm debt settle <debt_id> --wallet <wallet>
    ```

### Summary & Reports
*   **Print overview summary:**
    ```bash
    mm summary
    ```
*   **Generate budget & forecast estimation:**
    ```bash
    mm estimate
    ```
*   **Generate daily/weekly/monthly reports:**
    ```bash
    mm report daily
    mm report weekly
    mm report monthly
    ```
*   **Generate custom range reports:**
    ```bash
    mm report --from YYYY-MM-DD --to YYYY-MM-DD
    mm report --from YYYY-MM-DD --to YYYY-MM-DD
    ```

*Note: Reports automatically display outstanding debts and loans aggregated case-insensitively by friend name (e.g. "Nam" and "nam" are merged into a single entry, preserving the first encountered casing for display).*

---

## Running Unit Tests

Automated testing is performed using Node's native test runner (zero external dependencies).
```bash
node --test test.js
```
The test suite isolates transactions using `test-data.json` (auto-cleaned after completion) so that production data in `data.json` remains untouched.
