import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { BIRReport, InventoryItem, MonthlySalesPoint, PurchasePeriod, ReportType, TopProduct } from './types';
import { useFeedback } from '../ui/feedback';

interface Props {
  reportType:  ReportType;
  sales:       MonthlySalesPoint[];
  inventory:   InventoryItem[];
  topProducts: TopProduct[];
  purchases:   PurchasePeriod[];
  birReport:   BIRReport | null;
  onRefresh:   () => void;
  loading:     boolean;
  isDark:      boolean;
}

export default function ExportButtons({ reportType, sales, inventory, topProducts, purchases, birReport, onRefresh, loading, isDark }: Props) {
  const { notify } = useFeedback();

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    let sheetData: any[] = [];
    let fileName = `five_l_${reportType}_report_${new Date().toISOString().slice(0, 10)}.xlsx`;

    if (reportType === 'bir') {
      sheetData = (birReport?.transactions || []).map(r => ({
        Receipt_Invoice_No: r.receipt_invoice_no, Date: r.date, Customer_Type: r.customer_type,
        Gross_Amount_PHP: r.gross_amount, VATable_Sales_PHP: r.vatable_sales, VAT_Amount_PHP: r.vat_amount,
        VAT_Exempt_Sales_PHP: r.vat_exempt_sales, Discount_PHP: r.discount, Net_Sales_PHP: r.net_sales, Payment_Method: r.payment_method,
      }));
      if (birReport) sheetData.push({ Section: 'SUMMARY', Gross_Sales_PHP: birReport.gross_sales, VATable_Sales_PHP: birReport.vatable_sales, VAT_Amount_PHP: birReport.vat_amount, VAT_Exempt_Sales_PHP: birReport.vat_exempt_sales, Senior_Citizen_Discount_PHP: birReport.senior_citizen_discount, PWD_Discount_PHP: birReport.pwd_discount, Other_Discounts_PHP: birReport.other_discounts, Net_Sales_PHP: birReport.net_sales, Total_Transactions: birReport.total_transactions });
    } else if (reportType === 'sales' || reportType === 'transactions') {
      sheetData = sales.map(s => ({
        Period: s.period,
        Transactions: s.transactions,
        Units_Sold: s.units,
        Revenue_PHP: s.revenue,
      }));
    } else if (['inventory', 'low_stock', 'expiring', 'damages', 'expired', 'count_correction'].includes(reportType)) {
      const items = ['low_stock', 'expiring', 'expired'].includes(reportType)
        ? inventory.filter(i => reportType === 'low_stock' ? i.status === 'Low Stock' : reportType === 'expiring' ? i.status === 'Expiring Soon' : i.status === 'Expired')
        : inventory;
      sheetData = items.map(i => ({
        ID: i.id,
        Medicine: i.medicine_name,
        Volume: i.volume || 'N/A',
        Category: i.category,
        ...(i.adjustment_type ? {
          Adjustment_Type: i.adjustment_type,
          Adjusted_By: i.adjusted_by || 'N/A',
          Adjusted_At: i.adjusted_at || 'N/A',
          Details: i.details || 'N/A',
        } : {}),
        Stock: i.stock,
        Reorder_Level: i.reorder_level,
        Unit_Price_PHP: Math.round((i.unit_price || 0) * 100) / 100,
        Stock_Value_PHP: Math.round((i.stock_value || 0) * 100) / 100,
        Expiry_Date: i.expiry || 'N/A',
        Days_Left: i.days_left ?? 'N/A',
        Status: i.status,
      }));
    } else if (reportType === 'top_selling') {
      sheetData = topProducts.map((p, idx) => ({
        Rank: idx + 1,
        Medicine: p.medicine_name,
        Category: p.category,
        Units_Sold: p.total_units,
        Avg_Price_PHP: Math.round((p.avg_price || 0) * 100) / 100,
        Total_Revenue_PHP: Math.round((p.total_revenue || 0) * 100) / 100,
      }));
    } else if (reportType === 'purchases') {
      sheetData = purchases.map(pr => ({
        Period: pr.period,
        Batches_Received: pr.batch_count,
        Units_Procured: pr.total_units,
        Total_Cost_PHP: Math.round((pr.total_cost || 0) * 100) / 100,
      }));
    }

    if (!sheetData.length) {
      notify({
        type: 'warning',
        title: 'No data to export',
        message: 'Change the report filters or refresh the report data.',
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, fileName);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Five L Pharmacy - ${reportType.toUpperCase()} REPORT`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    let head: string[][] = [];
    let body: (string | number)[][] = [];

    if (reportType === 'bir') {
      head = [['Receipt/Invoice No.', 'Date', 'Customer Type', 'Gross', 'VATable', 'VAT', 'VAT-Exempt', 'Discount', 'Net Sales', 'Payment']];
      body = (birReport?.transactions || []).map(r => [r.receipt_invoice_no, r.date, r.customer_type, r.gross_amount, r.vatable_sales, r.vat_amount, r.vat_exempt_sales, r.discount, r.net_sales, r.payment_method]);
    } else if (reportType === 'sales' || reportType === 'transactions') {
      head = [['Period', 'Transactions', 'Units Sold', 'Revenue (PHP)']];
      body = sales.map(s => [s.period, s.transactions, s.units, `PHP ${s.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
    } else if (['inventory', 'low_stock', 'expiring', 'damages', 'expired', 'count_correction'].includes(reportType)) {
      const items = ['low_stock', 'expiring', 'expired'].includes(reportType)
        ? inventory.filter(i => reportType === 'low_stock' ? i.status === 'Low Stock' : reportType === 'expiring' ? i.status === 'Expiring Soon' : i.status === 'Expired')
        : inventory;
      head = [['Medicine', 'Category', 'Stock', 'Price', 'Value', 'Expiry', 'Status']];
      body = items.map(i => [
        i.medicine_name, 
        i.category, 
        ...(i.adjustment_type ? [i.adjustment_type, i.adjusted_by || 'N/A', i.adjusted_at || 'N/A', i.details || 'N/A'] : [i.stock]),
        `P${(i.unit_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
        `P${(i.stock_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
        i.expiry || 'N/A', 
        i.status
      ]);
    } else if (reportType === 'top_selling') {
      head = [['Rank', 'Medicine', 'Category', 'Units Sold', 'Revenue']];
      body = topProducts.map((p, idx) => [idx + 1, p.medicine_name, p.category, p.total_units, `P${p.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
    } else if (reportType === 'purchases') {
      head = [['Period', 'Batches', 'Units', 'Total Cost']];
      body = purchases.map(pr => [pr.period, pr.batch_count, pr.total_units, `P${pr.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
    }

    if (!body.length) {
      notify({
        type: 'warning',
        title: 'No data to export',
        message: 'Change the report filters or refresh the report data.',
      });
      return;
    }

    autoTable(doc, {
      startY: 35,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
    });

    doc.save(`five_l_${reportType}_report.pdf`);
  };

  const btnCls = `flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition border shadow-sm ${
    isDark
      ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={handlePrint} className={btnCls}>
        <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" />
        </svg>
        Print Report
      </button>

      <button onClick={handleExportPDF} className={btnCls}>
        <svg className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Export PDF
      </button>

      <button onClick={handleExportExcel} className={btnCls}>
        <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Excel
      </button>

      <button onClick={onRefresh} disabled={loading} className={`${btnCls} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <svg className={`h-4 w-4 text-indigo-500 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>
  );
}
