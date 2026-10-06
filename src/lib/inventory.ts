import { Medicine, InventoryStatusCounts } from '../types';
import { getMedicineSupplies } from './fifo';

export type { InventoryStatusCounts };

// Default urgent threshold. The separate low-stock warning defaults to 20.
export const CRITICAL_STOCK_THRESHOLD = 5;
export type InventoryThresholds = {
  criticalStockAlertUnits?: number;
  lowStockAlertUnits?: number;
  expiryAlertDays?: number;
  nonMedicineCriticalStockAlertUnits?: number;
  nonMedicineLowStockAlertUnits?: number;
  nonMedicineExpiryAlertDays?: number;
  nonMedicineExpiryNotifications?: boolean;
};

const NON_MEDICINE_FORMS = new Set(['other', 'others', 'medical supply', 'medical device']);

export const isNonMedicineProduct = (medicine: Pick<Medicine, 'dosage_form'>) =>
  NON_MEDICINE_FORMS.has(String(medicine.dosage_form || '').trim().toLowerCase());

// Settings control the threshold used for critical stock. The constant is
// retained as the fallback for callers that do not provide settings.
export const getCriticalStockThreshold = (thresholds: InventoryThresholds = {}) =>
  Math.max(1, thresholds.criticalStockAlertUnits ?? CRITICAL_STOCK_THRESHOLD);

export const getMedicineLowStockThreshold = (medicine: Medicine, thresholds: InventoryThresholds = {}) =>
  Math.max(0, isNonMedicineProduct(medicine)
    ? thresholds.nonMedicineLowStockAlertUnits ?? 10
    : thresholds.lowStockAlertUnits ?? (medicine.reorderLevel ?? 0));

export const getProductCriticalStockThreshold = (medicine: Medicine, thresholds: InventoryThresholds = {}) =>
  Math.max(1, isNonMedicineProduct(medicine)
    ? thresholds.nonMedicineCriticalStockAlertUnits ?? 5
    : thresholds.criticalStockAlertUnits ?? CRITICAL_STOCK_THRESHOLD);

export const getMedicineExpiryAlertDays = (medicine: Medicine, thresholds: InventoryThresholds = {}) =>
  Math.max(0, isNonMedicineProduct(medicine)
    ? thresholds.nonMedicineExpiryNotifications === false
      ? 0
      : thresholds.nonMedicineExpiryAlertDays ?? 30
    : medicine.expiry_alert_days ?? thresholds.expiryAlertDays ?? 60);

export const getExpiryDays = (expiryDate: string): number | null => {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Expired batch dates remain the source for the Expired alert, including when
 * the batch is archived or the medicine also has another active batch.
 */
export const getMedicineExpiryDays = (medicine: Medicine): number | null => {
  const regularDays = getExpiryDays(medicine.expiry);
  if (!Array.isArray(medicine.supplies)) return regularDays;

  const expiredBatchDays = medicine.supplies
    .filter((supply) => supply.expiry_date)
    .map((supply) => getExpiryDays(supply.expiry_date))
    .filter((days): days is number => days !== null && days <= 0);
  // An archived expired batch is still an expired inventory record. Do not
  // hide it just because the same medicine has another active batch: the
  // archive and alert views must report the same expiry event.
  return expiredBatchDays.length > 0 ? Math.min(...expiredBatchDays) : regularDays;
};

/**
 * Return the quantity belonging to the batch that caused an expiry alert.
 *
 * `Medicine.stock` is the sellable/available stock total. It intentionally
 * excludes batches inside the not-for-sale window, so it must not be used as
 * the quantity shown beside an expiry warning. For medicines with batch data,
 * sum only the active batches that are inside their expiry alert window.
 */
export const getExpiryAlertStock = (medicine: Medicine, thresholds: InventoryThresholds = {}) => {
  const expiryAlertDays = getMedicineExpiryAlertDays(medicine, thresholds);
  const supplies = getMedicineSupplies(medicine);
  const hasBatchData = Array.isArray(medicine.supplies) && medicine.supplies.length > 0;

  if (!hasBatchData) return medicine.stock;

  // Expired stock is not sellable and must never be presented as available
  // stock in the alert table, including when the medicine was archived.
  const medicineDaysLeft = getMedicineExpiryDays(medicine);
  if (medicineDaysLeft !== null && medicineDaysLeft <= 0) return 0;

  const expiringQuantity = supplies.reduce((total, supply) => {
    if (supply.isArchived || Number(supply.quantity) <= 0 || !supply.expiry_date) return total;
    const daysLeft = getExpiryDays(supply.expiry_date);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= expiryAlertDays
      ? total + Number(supply.quantity)
      : total;
  }, 0);

  // Keep the normal product stock for rows that are not expiry-driven
  // (for example, a low-stock item whose expiry is still far away).
  return expiringQuantity > 0 ? expiringQuantity : medicine.stock;
};

export const evaluateMedicineStatus = (medicine: Medicine, thresholds: InventoryThresholds = {}) => {
  const daysLeft = getMedicineExpiryDays(medicine);
  const lowStockLimit = getMedicineLowStockThreshold(medicine, thresholds);
  const criticalStockLimit = getProductCriticalStockThreshold(medicine, thresholds);
  const expiryAlertDays = getMedicineExpiryAlertDays(medicine, thresholds);
  // Keep stock bands mutually exclusive: critical items must not also appear
  // in the Low stock alert/filter.
  const isLowStock = medicine.stock > criticalStockLimit && medicine.stock <= lowStockLimit;
  const isCriticalStock = medicine.stock > 0 && medicine.stock <= criticalStockLimit;
  const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= expiryAlertDays;
  const isNotForSale = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  return {
    isLowStock,
    isCriticalStock,
    isExpiringSoon,
    isNotForSale,
    isExpired,
  };
};

export const summarizeInventoryStatus = (medicines: Medicine[], thresholds: InventoryThresholds = {}) => {
  const lowStockLimit = (medicine: Medicine) => getMedicineLowStockThreshold(medicine, thresholds);
  const expiryAlertDays = (medicine: Medicine) => getMedicineExpiryAlertDays(medicine, thresholds);
  const criticalStock = medicines.filter(m => m.stock > 0 && m.stock <= getProductCriticalStockThreshold(m, thresholds));
  const lowStock = medicines.filter(
    m => m.stock > getProductCriticalStockThreshold(m, thresholds) && m.stock <= lowStockLimit(m)
  );
  const expiringSoon = medicines.filter(m => {
    const days = getMedicineExpiryDays(m);
    return days !== null && days > 0 && days <= expiryAlertDays(m);
  });
  const notForSale = medicines.filter(m => {
    const days = getMedicineExpiryDays(m);
    return days !== null && days > 0 && days <= 30;
  });
  const expired = medicines.filter(m => {
    const days = getMedicineExpiryDays(m);
    return days !== null && days <= 0;
  });
  const healthy = medicines.filter(
    m => !lowStock.includes(m) && 
         !expiringSoon.includes(m) && 
         !notForSale.includes(m) && 
         !expired.includes(m) && 
         !criticalStock.includes(m)
  );

  return {
    lowStock,
    criticalStock,
    expiringSoon,
    notForSale,
    expired,
    healthy,
    counts: {
      all: medicines.length,
      healthy: healthy.length,
      low_stock: lowStock.length,
      critical_stock: criticalStock.length,
      expiring_soon: expiringSoon.length,
      not_for_sale: notForSale.length,
      expired: expired.length,
    },
  };
};
