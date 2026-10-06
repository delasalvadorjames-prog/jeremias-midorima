import React from 'react';
import { PharmacySettings } from '../types';

type ReceiptRow = {
  name: string;
  category?: string;
  classification?: string;
  dosageForm?: string;
  unitPrice: number;
  saleUnit?: string;
  unitFactor?: number;
  quantity: number;
  discountAmount: number;
  rowTotal: number;
  discountEligible?: boolean;
};
type ReceiptDiscountType = 'none' | 'senior' | 'pwd' | 'promo';

export type ReceiptSale = {
  rows: ReceiptRow[];
  timestamp: Date;
  receiptNo: string;
  cashReceived: number;
  discountType?: ReceiptDiscountType;
  customerType?: 'regular' | 'senior_citizen' | 'pwd';
  customerName?: string;
  customerIdNumber?: string;
  eligibleSubtotal?: number;
  nonEligibleSubtotal?: number;
};

type ReceiptProps = {
  sale: ReceiptSale;
  settings?: PharmacySettings;
  onPrint: () => void;
  onDone: () => void;
};

const formatPeso = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const formatDateTime = (date: Date) =>
  date
    .toLocaleString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(',', '');

const getInvoiceNumber = (receiptNo: string) => {
  const digits = receiptNo.replace(/\D/g, '');
  return digits ? digits.slice(-6).padStart(6, '0') : '137556';
};

export default function Receipt({ sale, settings, onPrint, onDone }: ReceiptProps) {
  const grossSales = sale.rows.reduce(
    (sum, row) => sum + row.unitPrice * (row.unitFactor || 1) * row.quantity,
    0
  );

  const totalDiscount = sale.rows.reduce(
    (sum, row) => sum + row.discountAmount,
    0
  );

  const totalAmountDue = sale.rows.reduce(
    (sum, row) => sum + row.rowTotal,
    0
  );

  const isProtectedSale = sale.discountType === 'senior' || sale.discountType === 'pwd';
  const eligibleGross = sale.rows.reduce((sum, row) => sum + (row.discountEligible ? row.unitPrice * (row.unitFactor || 1) * row.quantity : 0), 0);
  const nonEligibleGross = sale.rows.reduce((sum, row) => sum + (row.discountEligible === false ? row.unitPrice * (row.unitFactor || 1) * row.quantity : 0), 0);
  const eligibleNetOfVat = eligibleGross / 1.12;
  const nonEligibleNetOfVat = nonEligibleGross / 1.12;
  const netOfVat = isProtectedSale ? eligibleNetOfVat + nonEligibleNetOfVat : totalAmountDue / 1.12;
  const vatAmount = isProtectedSale ? (nonEligibleGross - nonEligibleNetOfVat) : totalAmountDue - netOfVat;
  const protectedDiscount = isProtectedSale ? eligibleNetOfVat * 0.2 : 0;
  const changeAmount = Math.max(
    0,
    sale.cashReceived - totalAmountDue
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 px-4 py-6 receipt-modal-backdrop">

      <div className="max-h-[90vh] w-full max-w-[360px] overflow-y-auto rounded-xl bg-white pb-4 shadow-2xl">

        <section className="receipt-print-area px-6 py-6 font-mono text-slate-800">

          <div className="receipt-slip">

            <div className="text-center">

              <h2 className="text-3xl font-black tracking-wide">
                {settings?.pharmacyName || 'Five L Pharmacy'}
              </h2>

              <p className="text-lg font-semibold">
                Official Receipt
              </p>

              <p className="mt-2 text-[11px] font-semibold leading-tight">
                {settings?.address || 'A. Flores St., Brgy. VII-C (Pob.)'}
              </p>

              <p className="text-[11px] font-bold leading-tight">
                EVELYN C. LOPEZ - Prop.
              </p>

              <p className="text-[11px] font-bold leading-tight">
                TIN: {settings?.tin || 'Not provided'}
              </p>

              <p className="mt-2 text-sm font-black uppercase tracking-widest">
                Sales Invoice
              </p>

            </div>

            <div className="my-4 border-t-2 border-dashed border-slate-300"></div>

            <div className="space-y-1 text-sm font-medium">

              <div className="flex justify-between gap-3">
                <span>Transaction No</span>
                <span className="text-right">
                  {sale.receiptNo}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span>Invoice No</span>
                <span className="text-right">
                  {getInvoiceNumber(sale.receiptNo)}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span>Date</span>
                <span className="text-right">
                  {formatDateTime(sale.timestamp)}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span>Payment</span>
                <span>CASH</span>
              </div>

              <div className="flex justify-between gap-3">
                <span>Customer</span>
                <span>{sale.customerName || 'Walk-in'}</span>
              </div>

              {isProtectedSale && sale.customerName && sale.customerIdNumber && (
                <div className="mt-3 border-y border-dashed border-slate-300 py-2">
                  <div className="font-black uppercase">Customer Information</div>
                  <div>Name: {sale.customerName}</div>
                  <div>Type: {sale.discountType === 'pwd' ? 'PWD' : 'Senior Citizen'}</div>
                  <div>{sale.discountType === 'pwd' ? 'PWD ID' : 'Senior ID'}: {sale.customerIdNumber}</div>
                </div>
              )}

              <div className="flex justify-between gap-3">
                <span>Order Type</span>
                <span className="text-right">
                  Over the counter
                </span>
              </div>

            </div>

            <div className="my-4 border-t-2 border-dashed border-slate-300"></div>

            <div className="space-y-3">

              {sale.rows.map((row, index) => (

                <div key={`${row.name}-${index}`}>

                  <div className="flex justify-between gap-3 text-sm font-bold">

                    <span>
                      {row.quantity} {row.saleUnit || 'pcs'} x {row.name}
                    </span>

                    <span>
                      {formatPeso(row.rowTotal)}
                    </span>

                  </div>

                  <div className="text-[11px] font-semibold text-slate-500">

                    {[
                      row.category,
                      row.dosageForm || 'Others',
                      row.classification,
                      `${formatPeso(row.unitPrice * (row.unitFactor || 1))} / ${row.saleUnit || 'pcs'}`,
                    ]
                      .filter(Boolean)
                      .join(' / ')}

                  </div>

                  {row.discountAmount > 0 && (

                    <div className="text-[11px] font-semibold text-emerald-600">
                      Discount: -{formatPeso(row.discountAmount)}
                    </div>

                  )}

                  {isProtectedSale && (
                    <div className={`text-[11px] font-semibold ${row.discountEligible ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {row.discountEligible ? `✓ ${sale.discountType === 'pwd' ? 'PWD' : 'Senior'} eligible` : '— Not eligible'}
                    </div>
                  )}

                </div>

              ))}

            </div>

            <div className="my-4 border-t-2 border-dashed border-slate-300"></div>

            <div className="space-y-1 text-sm font-medium">

              <div className="flex justify-between text-base font-black">
                <span>Total</span>
                <span>
                  {formatPeso(totalAmountDue)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Cash Received</span>
                <span>
                  {formatPeso(sale.cashReceived)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Change</span>
                <span>
                  {formatPeso(changeAmount)}
                </span>
              </div>

            </div>

            <div className="my-4 border-t-2 border-dashed border-slate-300"></div>

            <div className="space-y-1 text-[11px] font-semibold">

              <div className="flex justify-between">
                <span>Total Sales (VAT Inclusive)</span>
                <span>
                  {formatPeso(grossSales)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Less: VAT</span>
                <span>
                  {formatPeso(vatAmount)}
                </span>
              </div>

              {isProtectedSale && (
                <>
                  <div className="flex justify-between">
                    <span>Eligible Items Subtotal</span>
                    <span>{formatPeso(sale.eligibleSubtotal ?? eligibleGross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Not Eligible Subtotal</span>
                    <span>{formatPeso(sale.nonEligibleSubtotal ?? nonEligibleGross)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <span>Amount Net of VAT</span>
                <span>
                  {formatPeso(netOfVat)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>{isProtectedSale ? (sale.discountType === 'pwd' ? 'PWD Discount' : 'Senior Citizen Discount') : 'Less: SC/PWD Discount'}</span>
                <span>
                  {formatPeso(isProtectedSale ? protectedDiscount : totalDiscount)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>VATable Sales</span>
                <span>
                  {formatPeso(isProtectedSale ? nonEligibleNetOfVat : netOfVat)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>VAT Amount</span>
                <span>
                  {formatPeso(vatAmount)}
                </span>
              </div>

            </div>

            <div className="mt-6 text-center text-sm font-bold">
              Thank you for your order!
            </div>

            <div className="mt-5 border-t-2 border-dashed border-slate-300 pt-3 text-center text-[9px] font-bold leading-tight">

              <p>
                BIR AUTHORITY TO PRINT NO. 055AU20260000003595
              </p>

              <p>
                DATE ISSUED: April 6, 2026
              </p>

              <p>
                100 BKLTS. (50x2) S/N# 137501 - 142500
              </p>

              <div className="mx-auto mt-6 w-44 border-t border-slate-700 pt-1">
                Cashier / Authorized Representative
              </div>

            </div>

          </div>

        </section>

        <div className="receipt-print-actions flex flex-col gap-3 px-6">

          <button
            type="button"
            className="w-full rounded-lg bg-[#04a32c] py-3 text-sm font-bold text-white transition hover:bg-[#04a32c]"
            onClick={onPrint}
          >
            Print Receipt
          </button>

          <button
            type="button"
            className="w-full rounded-lg bg-[#053693] py-3 text-sm font-bold text-white transition hover:bg-[#053693]"
            onClick={onDone}
          >
            Done
          </button>

        </div>

      </div>

      {/* =====================================================
          POS THERMAL RECEIPT STYLE
          ADDED ONLY - EXISTING LOGIC REMAINS UNCHANGED
          ===================================================== */}

      <style>{`

        /* ==============================
           80MM POS RECEIPT
           ============================== */

        .receipt-print-area {
          width: 80mm !important;
          max-width: 80mm !important;
          box-sizing: border-box !important;
        }

        .receipt-slip {
          width: 80mm !important;
          max-width: 80mm !important;
          box-sizing: border-box !important;

          padding: 4mm !important;

          background: #ffffff !important;
          color: #000000 !important;

          font-family:
            "Courier New",
            Courier,
            monospace !important;

          font-size: 9px !important;
          line-height: 1.25 !important;
        }

        /* ==============================
           STORE HEADER
           ============================== */

        .receipt-slip h2 {
          margin: 0 !important;
          font-size: 16px !important;
          line-height: 1.2 !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
        }

        .receipt-slip p {
          line-height: 1.3 !important;
        }

        /* ==============================
           COMPACT FONT SIZES
           ============================== */

        .receipt-slip .text-3xl {
          font-size: 16px !important;
        }

        .receipt-slip .text-lg {
          font-size: 11px !important;
        }

        .receipt-slip .text-base {
          font-size: 11px !important;
        }

        .receipt-slip .text-sm {
          font-size: 9px !important;
        }

        .receipt-slip .text-\$begin:math:display$11px\\$end:math:display$ {
          font-size: 8px !important;
        }

        .receipt-slip .text-\$begin:math:display$9px\\$end:math:display$ {
          font-size: 7px !important;
        }

        /* ==============================
           RECEIPT SPACING
           ============================== */

        .receipt-slip .my-4 {
          margin-top: 7px !important;
          margin-bottom: 7px !important;
        }

        .receipt-slip .mt-6 {
          margin-top: 12px !important;
        }

        .receipt-slip .mt-5 {
          margin-top: 10px !important;
        }

        .receipt-slip .mt-2 {
          margin-top: 4px !important;
        }

        /* ==============================
           SEPARATOR
           ============================== */

        .receipt-slip .border-dashed {
          border-color: #000000 !important;
          border-style: dashed !important;
        }

        /* ==============================
           PRICES
           ============================== */

        .receipt-slip .text-right {
          text-align: right !important;
          white-space: nowrap !important;
        }

        /* ==============================
           LONG MEDICINE NAMES
           ============================== */

        .receipt-slip span {
          overflow-wrap: anywhere;
        }

        /* ==============================
           THERMAL PRINT
           ============================== */

        @media print {

          @page {
            size: 80mm auto;
            margin: 0;
          }

          html,
          body {
            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;

            margin: 0 !important;
            padding: 0 !important;

            background: #ffffff !important;
          }

          /* Hide everything */
          body * {
            visibility: hidden;
          }

          /* Show receipt */
          .receipt-print-area,
          .receipt-print-area * {
            visibility: visible !important;
          }

          /* Remove modal background */
          .receipt-modal-backdrop {
            position: static !important;

            display: block !important;

            width: 80mm !important;
            max-width: 80mm !important;

            min-height: 0 !important;

            margin: 0 !important;
            padding: 0 !important;

            background: #ffffff !important;
          }

          /* Receipt preview */
          .receipt-preview {
            width: 80mm !important;
            max-width: 80mm !important;

            margin: 0 !important;
            padding: 0 !important;

            overflow: visible !important;
          }

          /* Actual receipt */
          .receipt-print-area {
            display: block !important;

            width: 80mm !important;
            max-width: 80mm !important;

            margin: 0 !important;
            padding: 0 !important;

            background: #ffffff !important;
          }

          .receipt-slip {
            width: 80mm !important;
            max-width: 80mm !important;

            margin: 0 !important;
            padding: 4mm !important;

            box-sizing: border-box !important;

            font-family:
              "Courier New",
              Courier,
              monospace !important;

            font-size: 9px !important;
            line-height: 1.25 !important;

            color: #000000 !important;
            background: #ffffff !important;
          }

          /* Hide buttons when printing */
          .receipt-print-actions {
            display: none !important;
            visibility: hidden !important;
          }

          /* Compact print spacing */
          .receipt-slip .my-4 {
            margin-top: 7px !important;
            margin-bottom: 7px !important;
          }

          .receipt-slip .mt-6 {
            margin-top: 12px !important;
          }

          .receipt-slip .mt-5 {
            margin-top: 10px !important;
          }

          /* Keep item together */
          .receipt-slip > div {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Don't split medicine name */
          .receipt-slip span {
            overflow-wrap: anywhere;
          }

        }

      `}</style>

    </div>
  );
}
