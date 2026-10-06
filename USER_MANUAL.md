# Five-L Pharmacy Management System
## User Manual

**Version:** 1.0  
**Audience:** Admins, Pharmacists, and Pharmacy Staff

---

## 1. System Overview

The Five-L Pharmacy Management System is used to manage:

1. Pharmacy dashboard and daily sales overview.
2. Point-of-sale transactions.
3. Medicines, batches, stock, prices, and expiry dates.
4. Inventory alerts and stock monitoring.
5. Transaction history and receipts.
6. Sales, inventory, BIR, purchase, and customer reports.
7. Staff accounts, permissions, and activity.
8. Pharmacy settings and account preferences.

---

## 2. Starting the System

### 2.1 Start the backend

The backend must be running before the system can load or save data.

1. Open a terminal.
2. Go to the backend folder.
3. Activate the Python environment if one is configured.
4. Start the API server:

   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

### 2.2 Start the frontend

1. Open another terminal.
2. Go to the `five-l` folder.
3. Install dependencies if this is the first run:

   ```bash
   npm install
   ```

4. Start the application:

   ```bash
   npm run dev
   ```

5. Open the local URL shown in the terminal.

### 2.3 Login

1. Enter your registered email or username.
2. Enter your password.
3. Complete the OTP step if it is enabled for the account.
4. Click **Login**.
5. If the system shows a server connection error, confirm that the backend is running.

> For local demo installations, the seeded account may be shown in the project README. Change demo credentials before using the system in production.

---

## 3. User Roles

### 3.1 Admin

An Admin can access the complete system, including:

1. Dashboard.
2. Point of Sales.
3. Inventory management.
4. Transactions and reports.
5. Alerts.
6. Insights.
7. Staff management.
8. Settings.

### 3.2 Staff

Staff access depends on the permissions assigned by the Admin. A staff member may be allowed to:

1. Process POS sales.
2. View reports and transactions.
3. Adjust inventory.
4. Submit or process void-related requests.
5. Manage only an assigned inventory category.

If a menu is unavailable, contact the Admin instead of attempting to bypass the permission.

---

## 4. Dashboard

The Dashboard provides a quick view of pharmacy operations.

1. Review the sales and revenue summary.
2. Check stock and inventory indicators.
3. Review low-stock, critical-stock, expiry, and expired alerts.
4. Open a related module by clicking the available dashboard action.
5. Use the top navigation for settings, theme, account information, or logout.

The Dashboard is for monitoring. Perform actual stock changes in **Inventory** and actual sales in **Point of Sales**.

---

## 5. Point of Sales (POS)

### 5.1 Find a medicine

1. Open **Point of Sales**.
2. Use the search field to find a medicine.
3. Filter by category, dosage form, Generic, or Branded when needed.
4. Confirm the medicine name, selling unit, price, and available stock.

### 5.2 Add an item to the cart

1. Select the medicine.
2. Choose the correct selling unit, such as `pcs`, `strip`, `box`, or `bottle`.
3. Enter the quantity.
4. Click **Add to Cart** or the equivalent purchase action.
5. Review the cart before proceeding.
6. Use the quantity controls to increase or decrease the quantity.

Do not sell an expired, archived, or unavailable batch. The system uses FEFO allocation where applicable: the earliest-expiring sellable batch is selected first.

### 5.3 Select a discount

1. In the payment summary, select one of the following:
   1. **No discount**
   2. **Senior citizen**
   3. **PWD**
2. If Senior or PWD is selected, verify the customer record and ID details when requested.
3. Confirm that only eligible medicines receive the VAT exemption and Senior/PWD discount.
4. Items marked **Not eligible** remain under regular pricing.

### 5.4 Review eligibility

Before confirming the sale, review the two item groups:

1. **Eligible items** — medicines that may receive VAT exemption and the applicable Senior/PWD discount.
2. **Not eligible** — medicines that remain under regular pricing; VAT remains included and the Senior/PWD exemption is zero.

### 5.5 Confirm the VAT and discount computation

For eligible items with Senior/PWD discount:

1. **VAT-exempt base** = eligible gross amount ÷ `1.12`.
2. **VAT exemption** = eligible gross amount − VAT-exempt base.
3. **Senior/PWD discount** = `20%` × VAT-exempt base.
4. **Eligible payable** = eligible gross amount − VAT exemption − Senior/PWD discount.
5. **Total payable** = eligible payable + not-eligible payable.

For not eligible items:

1. VAT remains included in the selling price.
2. VAT base before tax = VAT-inclusive amount ÷ `1.12`.
3. VAT included = VAT-inclusive amount − VAT base before tax.
4. VAT exemption = `₱0.00`.
5. Senior/PWD discount = `₱0.00`.

For **No discount**, the system should show zero Senior/PWD exemption and zero Senior/PWD discount. Regular pricing applies.

### 5.6 Complete a sale

1. Click **Proceed to Payment**.
2. Review the Payment Breakdown.
3. Enter the amount received under **Cash Received**.
4. Confirm that the cash received is at least the total payable.
5. Review the displayed change.
6. Review the Eligible and Not eligible item groups.
7. Click **Confirm**.
8. Review the inventory deduction preview if shown.
9. Confirm the stock deduction and complete the sale.
10. Print or save the receipt when available.

Do not click **Confirm** twice. Wait for the processing state to finish.

---

## 6. Inventory Management

### 6.1 Add a medicine

1. Open **Inventory**.
2. Click **Add Medicine** or the equivalent add action.
3. Enter the medicine name and category.
4. Enter the classification: Generic or Branded.
5. Select the dosage form.
6. Enter the selling price and initial stock.
7. Enter the reorder level or low-stock threshold.
8. Enter supplier, batch, received date, and expiry information when available.
9. Review the data carefully.
10. Save the medicine.

### 6.2 Add or update a batch

1. Open the medicine record.
2. Add the batch number.
3. Enter the expiry date.
4. Enter the received quantity and unit cost.
5. Enter the selling price if required.
6. Save the batch.

Always use the actual batch and expiry information. Incorrect expiry dates can affect FEFO selling and alerts.

### 6.3 Update stock or price

1. Find the medicine in Inventory.
2. Open the edit action.
3. Update only the fields supported by your role.
4. Review the resulting stock, reorder status, and price.
5. Save the changes.

Use stock adjustment tools for corrections instead of creating duplicate medicine records.

### 6.4 Archive or view archived medicines

1. Open Inventory.
2. Find the medicine or batch.
3. Use the archive action only when the item should no longer be active.
4. Open the archive view to review archived batches.
5. Unarchive only after confirming that the batch is valid and sellable.

---

## 7. Alerts

Open **Alerts** to review inventory conditions.

1. **Critical** — stock is at a critical level.
2. **Low stock** — stock is below the configured threshold.
3. **Expiring** — the medicine is approaching its expiry date.
4. **Expired** — the batch is already expired or not for sale.
5. **Good** — the medicine is within the expected stock and expiry conditions.

Recommended workflow:

1. Review Critical and Expired first.
2. Check the batch and expiry details.
3. Adjust, archive, or restock the affected item in Inventory.
4. Review Low stock and Expiring items next.

---

## 8. Transactions

1. Open **Transactions**.
2. Search or filter the transaction list.
3. Open a transaction to review its items, amounts, discount type, VAT details, and payment information.
4. Use the receipt or print action when available.
5. For a void or correction request, follow the approval process configured by the Admin.

Do not delete or alter a transaction simply to correct an error. Use the supported void, correction, or approval workflow so the activity remains traceable.

---

## 9. Reports and Analytics

Open **Reports** to select a report type.

1. **Sales** — review sales totals and revenue.
2. **Transactions** — review detailed transaction records.
3. **Top Selling** — identify products with the highest sales volume.
4. **BIR** — review VATable sales, VAT amount, VAT-exempt sales, discounts, and net sales.
5. **Inventory** — review medicine and stock information.
6. **Low Stock** — review products requiring replenishment.
7. **Movement** — review inventory deductions and movements.
8. **Purchases** — review purchase cost, units procured, and batches received.
9. **Expiring** — review items approaching expiry.
10. **Expired** — review expired or not-for-sale items.
11. **Damaged** — review damaged inventory records.
12. **Corrections** — review stock correction records.
13. **Customer Records** — review registered Senior/PWD customer records.

### 9.1 Export or print a report

1. Select the report type.
2. Set the date range or filter.
3. Review the summary cards and table.
4. Click the export action for a spreadsheet or other available format.
5. Click **Print** when a printed report is required.

Verify the date range before exporting official or BIR-related data.

---

## 10. Insights

Open **Insights** to review trends and planning information.

1. Review sales patterns.
2. Review stock consumption and estimated stock-out timing.
3. Review suggested restocking quantities.
4. Review promotions and promotional pricing when enabled.
5. Use the insights as a planning aid and verify stock physically before placing an order.

---

## 11. Staff Management

Admin users can manage staff accounts.

1. Open **Staff** or **Staff Management**.
2. Click **Add Staff**.
3. Enter the staff name, username, and password.
4. Assign the staff category when applicable.
5. Set the required permissions.
6. Save the account.
7. Review the account status.
8. Disable, suspend, or update access when necessary.
9. Review staff activity logs for traceability.

Use a unique password for every staff account. Do not share Admin credentials.

---

## 12. Settings

1. Open **Settings** from the top bar.
2. Update the pharmacy name and contact information.
3. Review receipt and tax-related settings.
4. Review notification and inventory thresholds.
5. Save the changes.
6. Reset to defaults only after confirming that the reset is intended.

After changing tax, receipt, or inventory settings, process a test transaction if appropriate.

---

## 13. Logout and Security

1. Finish or save the current work.
2. Click **Logout** in the sidebar or account menu.
3. Confirm that the login screen is displayed.
4. Lock the workstation when leaving the counter.

Never leave a logged-in Admin session unattended.

---

## 14. Troubleshooting

### 14.1 “Cannot connect to server”

1. Confirm that the FastAPI backend is running.
2. Confirm that the frontend is using the correct API URL.
3. Check that the database service is running.
4. Refresh the application.
5. Contact the system administrator if the problem continues.

### 14.2 A medicine cannot be sold

1. Check available stock.
2. Check the batch expiry date.
3. Check whether the medicine is archived or marked not for sale.
4. Check the selected unit and quantity.
5. Ask an Admin to review Inventory if the information is incorrect.

### 14.3 Discount or VAT amount looks wrong

1. Confirm that Senior or PWD is selected.
2. Confirm that the customer record and ID are verified.
3. Check whether the medicine is in **Eligible items** or **Not eligible**.
4. Confirm that eligible and not-eligible subtotals are separated.
5. Recheck the formula shown in Section 5.5.

### 14.4 Confirm button is disabled

1. Enter a cash amount.
2. Confirm that cash received is not lower than Total Payable.
3. Check for a checkout error message.
4. Confirm that the cart has at least one sellable item.

### 14.5 A staff menu is missing

1. Check the staff account status.
2. Check the assigned permissions.
3. Check the assigned category.
4. Ask the Admin to update the staff access.

---

## 15. Daily Closing Checklist

1. Confirm that all sales are completed and receipts are available.
2. Review the day’s Transactions.
3. Compare cash received with the sales summary.
4. Review unpaid or incomplete checkout states.
5. Review Critical, Low stock, Expiring, and Expired alerts.
6. Check inventory corrections or pending approvals.
7. Export or print required daily reports.
8. Log out of the system.

---

## 16. Important Rules

1. Do not sell expired or not-for-sale medicines.
2. Do not give Senior/PWD VAT exemption to Not eligible items.
3. Verify the customer ID before applying a Senior/PWD discount.
4. Do not share passwords or leave accounts unlocked.
5. Do not delete transactions to hide mistakes.
6. Use the supported correction, void, and approval workflow.
7. Review the final total and cash change before confirming every sale.

