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
    `node index.js tx add --wallet MoMo --category Food --amount -50000 --desc "Highlands Coffee"`

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
        `node index.js tx add --wallet <wallet> --category Food --amount -300000 --desc "<description>"`
    *   **Step 2 (Log the debts):** Once the transaction ID is generated (e.g. `tx_123`), show the user how to log the linked debts:
        `node index.js debt add --type lend --friend "Nam" --amount 100000 --tx tx_123 --desc "<description> Share"`
        `node index.js debt add --type lend --friend "Minh" --amount 100000 --tx tx_123 --desc "<description> Share"`

---

## 3. Lending & Borrowing Workflow

Translate natural language statements about debts into CLI commands:

### A. If the user lent money or paid on behalf:
*   User: "Nam owes me 100k for taxi"
*   AI Command: `node index.js debt add --type lend --friend "Nam" --amount 100000 --desc "Taxi Share"`

### B. If the user borrowed money (is in debt):
*   User: "I borrowed 50k from Minh for lunch"
*   AI Command: `node index.js debt add --type borrow --friend "Minh" --amount 50000 --desc "Lunch Share"`

### C. If a debt is being settled:
*   User: "Nam paid me back"
*   AI Action: 
    1. Search for the debt record (generate/suggest `node index.js debt list --friend Nam --unsettled`).
    2. Once the user identifies the debt ID (e.g. `debt_456`), provide the settle command:
       `node index.js debt settle debt_456 --wallet <selected_wallet>`
