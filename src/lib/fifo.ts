import { Medicine, MedicineSupply } from '../types';

const today = () => new Date().toISOString().slice(0, 10);

export const getMedicineSupplies = (medicine: Medicine): MedicineSupply[] => {
  if (Array.isArray(medicine.supplies) && medicine.supplies.length > 0) {
    return medicine.supplies;
  }

  if (!medicine.stock && !medicine.expiry && !medicine.unitPrice) return [];

  return [{
    id: medicine.id,
    medicine_id: medicine.id,
    batch_number: medicine.product_code || `ID-${medicine.id}`,
    quantity: medicine.stock,
    supplier: medicine.supplier,
    expiry_date: medicine.expiry,
    unit_cost: medicine.unitPrice || 0,
    selling_price: medicine.unitPrice || 0,
    created_at: medicine.created_at || medicine.updated_at,
  }];
};

const dateValue = (value?: string) => value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;

/** FEFO order: earliest actual batch expiry first, received date as a tie-breaker. */
export const getFifoSupplies = (medicine: Medicine): MedicineSupply[] =>
  getMedicineSupplies(medicine)
    .sort((a, b) => {
      const expiry = dateValue(a.expiry_date) - dateValue(b.expiry_date);
      if (expiry !== 0) return expiry;
      const received = dateValue(a.received_date || a.created_at) - dateValue(b.received_date || b.created_at);
      if (received !== 0) return received;
      return a.id - b.id;
    });

export const getFifoAvailableSupplies = (medicine: Medicine): MedicineSupply[] => {
  const saleCutoff = new Date();
  saleCutoff.setDate(saleCutoff.getDate() + 30);
  const saleCutoffDate = saleCutoff.toISOString().slice(0, 10);
  return getFifoSupplies(medicine).filter((supply) =>
    !supply.isArchived && Number(supply.quantity) > 0 && (!supply.expiry_date || supply.expiry_date > saleCutoffDate)
  );
};

export const getFifoAvailableStock = (medicine: Medicine) =>
  getFifoAvailableSupplies(medicine).reduce((total, supply) => total + Math.max(0, Number(supply.quantity) || 0), 0);
