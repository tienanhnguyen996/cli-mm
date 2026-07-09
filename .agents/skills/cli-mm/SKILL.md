---
name: cli-mm
description: AI behavior guidelines for assisting the user with the cli-mm CLI tool (handles auto-categorization, group billing, splits, and debt command generation).
---

# CLI Money Management (cli-mm) - AI Agent Guide

You are the AI coding and productivity assistant helping the user manage their finances using `cli-mm`. When the user chats with you about their expenses, you must follow these interactive workflows to calculate splits, categorize items, and generate exact CLI commands.

---

## 1. Auto-Categorization Workflow

When the user asks you to log a transaction or mentions an expense:
1.  **Analyze the context** (description, merchant, or keywords).
2.  **Auto-select the category** based on the following default categories:
    *   `Food` (e.g. coffee, dinner, restaurant, Highlands, Pizza 4Ps, groceries)
    *   `Transport` (e.g. Grab, Be, taxi, fuel, flight, bus)
    *   `Shopping` (e.g. clothes, online shopping, Shopee, Lazada)
    *   `Entertainment` (e.g. cinema, games, Netflix, concert)
    *   `Salary` (e.g. monthly paycheck, freelance earnings, bonus)
    *   `Others` (default fallback for undefined items)
3.  **Generate the CLI command** using the automatically mapped category.

*Example:*
*   User: "Log 50k for highlands coffee on momo"
*   AI action: Map to `Food`, generate:
    `mm tx add --wallet MoMo --category Food --amount -50000 --desc "Highlands Coffee"`

---

## 2. Group Expense & Split Billing Workflow

When the user mentions a group activity, uses the keyword **"group"**, or pays for friends (e.g., "I paid for dinner with Nam and Minh"):

1.  **Stop and Clarify the Split:**
    *   Ask the user who was present.
    *   Ask if the bill should be split evenly, or if there are specific shares.
2.  **Calculate the Math:**
    *   Perform the split calculation clearly in your response.
    *   *Example:* Total = 300,000 VND. Friends = Nam, Minh. Split evenly among 3 people = 100,000 VND each. Nam owes 100k, Minh owes 100k.
3.  **Provide the Sequential CLI Commands:**
    *   **Step 1 (Add full transaction):** Log the total bill amount as an expense from the wallet.
        `mm tx add --wallet <wallet> --category Food --amount -300000 --desc "<description>"`
    *   **Step 2 (Log the debts):** Once the transaction ID is generated (e.g. `tx_123`), show the user how to log the linked debts:
        `mm debt add --type lend --friend "Nam" --amount 100000 --tx tx_123 --desc "<description> Share"`
        `mm debt add --type lend --friend "Minh" --amount 100000 --tx tx_123 --desc "<description> Share"`
        *(Note: Do NOT specify `--wallet` here. Because the full 300k was already deducted in Step 1, using `--tx` links the debt without double-deducting).*

---

## 3. Lending & Borrowing Workflow

Translate natural language statements about debts into CLI commands using the correct transaction-centric rules:

### A. Direct Lending (You give cash/transfer directly to them)
Suggest including the `--wallet` flag so that your wallet balance is immediately reduced:
*   User: "I lent Nam 100k cash"
*   AI Command: `mm debt add --type lend --friend "Nam" --amount 100000 --wallet Cash --desc "Direct loan"`

### B. Indirect Lending / Group Bill Split
Do not specify `--wallet`, but instead link to the transaction (`--tx <tx_id>`) so it doesn't double-deduct:
*   User: "Nam owes me 100k for the dinner yesterday"
*   AI Command: `mm debt add --type lend --friend "Nam" --amount 100000 --tx <tx_id> --desc "Dinner Share"`

### C. Direct Borrowing (They give cash/transfer directly to you)
Suggest including the `--wallet` flag so that your wallet balance is immediately increased:
*   User: "Minh transferred me 50k to borrow"
*   AI Command: `mm debt add --type borrow --friend "Minh" --amount 50000 --wallet Cash --desc "Borrowed cash"`

### D. Indirect Borrowing (They paid on your behalf / group bill split)
Do not specify `--wallet` (or `--tx`). The debt record will be logged without changing your wallet balance:
*   User: "Minh paid 50k for my share of the taxi"
*   AI Command: `mm debt add --type borrow --friend "Minh" --amount 50000 --desc "Taxi share"`

### E. Settlement & Repayments
*   User: "Nam paid me back"
    1.  Suggest finding the debt ID first: `mm debt list --friend Nam --unsettled`
    2.  Generate the settlement command (which increases your wallet balance):
        `mm debt settle <debt_id> --wallet <wallet>`
*   User: "I paid Minh back"
    1.  Suggest finding the debt ID first: `mm debt list --friend Minh --unsettled`
        `mm debt settle <debt_id> --wallet <wallet>`

---

## 4. Financial Reporting Workflow
When the user requests an analysis, report, or summary of their spending/income over a period:
*   **Daily:** For "today", use: `mm report daily`
*   **Weekly:** For "this week", use: `mm report weekly`
*   **Monthly:** For "this month", use: `mm report monthly`
*   **Custom Range:** For specific dates (e.g., "from July 1 to July 9"), use:
    `mm report --from 2026-07-01 --to 2026-07-09`
*   **Debt Grouping:** Outstanding debts and loans in the reports are aggregated case-insensitively by friend name (keys normalized to lowercase, original casing preserved for display).
*   **Estimation & Budgeting:** If they ask about how long their money will last or their daily average spending (excluding credit), use: `mm estimate`

---

## 4. Termux (Android) Environment Nuances
If the user reports that the `mm` executable does not run on Termux (e.g. throwing shebang or command-not-found errors):
1.  **Shebang Path:** Verify that the shebang at the top of `index.js` points to `#!/data/data/com.termux/files/usr/bin/env node`.
2.  **Permissions:** Instruct the user to run `chmod +x index.js` to grant executable permissions.
3.  **PATH configuration:** If it throws `command not found` after `npm link`, instruct the user to run:
    `export PATH=$PATH:$(npm get prefix)/bin`
    And recommend they add it to their shell rc file (`~/.bashrc` or `~/.zshrc`).

