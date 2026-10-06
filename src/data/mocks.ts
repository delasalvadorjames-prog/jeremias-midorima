import { Medicine, PredictiveRow, SalesPoint, InventoryStatusCounts } from '../types';

const detectDosageForm = (label: string = ''): string => {
  const normalized = (label || '').toLowerCase();
  if (/\b(tablet|tabs?)\b/.test(normalized)) return 'Tablet';
  if (/\b(capsule|caps?)\b/.test(normalized)) return 'Capsule';
  if (/\b(syrup)\b/.test(normalized)) return 'Syrup';
  if (/\b(suspension)\b/.test(normalized)) return 'Suspension';
  if (/\b(injectable|injection|vial|ampule|shot)\b/.test(normalized)) return 'Injectable';
  if (/\b(cream)\b/.test(normalized)) return 'Cream';
  if (/\b(ointment)\b/.test(normalized)) return 'Ointment';
  if (/\b(drops?)\b/.test(normalized)) return 'Drops';
  return 'Tablet';
};

const maybeDosageForm = (medicine: Medicine): Medicine => ({
  ...medicine,
  dosage_form: medicine.dosage_form || detectDosageForm(medicine.name || medicine.medicine_name || ''),
});

const mockMedicines: Medicine[] = [
  { id: 1, name: 'Amoxicillin 500mg', category: 'Antibiotics', stock: 150, reorderLevel: 50, expiry: '2025-12-01', avgDailySales: 12, unitPrice: 12.5, supplier: 'PharmaCorp' },
  { id: 2, name: 'Paracetamol 500mg', category: 'Analgesics', stock: 120, reorderLevel: 100, expiry: '2026-05-15', avgDailySales: 25, unitPrice: 2.0, supplier: 'MediSupplies Ltd' },
  { id: 3, name: 'Metformin 500mg', category: 'Antidiabetics', stock: 180, reorderLevel: 40, expiry: '2025-11-20', avgDailySales: 18, unitPrice: 8.75, supplier: 'PharmaCorp' },
  { id: 4, name: 'Atorvastatin 20mg', category: 'Statins', stock: 125, reorderLevel: 30, expiry: '2025-08-10', avgDailySales: 9, unitPrice: 22.0, supplier: 'HealthPlus Inc' },
  { id: 5, name: 'Azithromycin 500mg', category: 'Antibiotics', stock: 140, reorderLevel: 25, expiry: '2025-09-15', avgDailySales: 11, unitPrice: 18.5, supplier: 'MediSupplies Ltd' },
  { id: 6, name: 'Ibuprofen 200mg', category: 'Analgesics', stock: 280, reorderLevel: 80, expiry: '2026-03-20', avgDailySales: 22, unitPrice: 3.5, supplier: 'PharmaCorp' },
  { id: 7, name: 'Omeprazole 20mg', category: 'Antacids', stock: 175, reorderLevel: 40, expiry: '2025-11-10', avgDailySales: 14, unitPrice: 9.25, supplier: 'HealthPlus Inc' },
  { id: 8, name: 'Lisinopril 10mg', category: 'Antihypertensives', stock: 155, reorderLevel: 35, expiry: '2025-07-05', avgDailySales: 13, unitPrice: 15.75, supplier: 'MediSupplies Ltd' },
  { id: 9, name: 'Simvastatin 20mg', category: 'Statins', stock: 170, reorderLevel: 30, expiry: '2025-10-12', avgDailySales: 12, unitPrice: 19.5, supplier: 'HealthPlus Inc' },
  { id: 10, name: 'Cephalexin 500mg', category: 'Antibiotics', stock: 165, reorderLevel: 40, expiry: '2025-08-22', avgDailySales: 10, unitPrice: 16.0, supplier: 'PharmaCorp' },
  { id: 11, name: 'Ranitidine 150mg', category: 'Antacids', stock: 140, reorderLevel: 50, expiry: '2025-06-15', avgDailySales: 8, unitPrice: 7.5, supplier: 'MediSupplies Ltd' },
  { id: 12, name: 'Metoprolol 50mg', category: 'Antihypertensives', stock: 145, reorderLevel: 35, expiry: '2025-09-08', avgDailySales: 11, unitPrice: 14.25, supplier: 'HealthPlus Inc' },
  { id: 13, name: 'Aspirin 300mg', category: 'Analgesics', stock: 220, reorderLevel: 60, expiry: '2026-01-30', avgDailySales: 18, unitPrice: 2.75, supplier: 'PharmaCorp' },
  { id: 14, name: 'Ciprofloxacin 500mg', category: 'Antibiotics', stock: 135, reorderLevel: 25, expiry: '2025-05-18', avgDailySales: 9, unitPrice: 21.0, supplier: 'MediSupplies Ltd' },
  { id: 15, name: 'Vitamin C 500mg', category: 'Supplements', stock: 350, reorderLevel: 100, expiry: '2026-06-10', avgDailySales: 28, unitPrice: 4.5, supplier: 'HealthPlus Inc' },
  { id: 16, name: 'Calcium Carbonate 500mg', category: 'Supplements', stock: 280, reorderLevel: 70, expiry: '2026-02-28', avgDailySales: 15, unitPrice: 6.25, supplier: 'PharmaCorp' },
  { id: 17, name: 'Iron Supplement 325mg', category: 'Supplements', stock: 195, reorderLevel: 50, expiry: '2025-12-05', avgDailySales: 12, unitPrice: 8.5, supplier: 'MediSupplies Ltd' },
  { id: 18, name: 'Multivitamin', category: 'Supplements', stock: 240, reorderLevel: 60, expiry: '2026-05-15', avgDailySales: 16, unitPrice: 12.0, supplier: 'HealthPlus Inc' },
  { id: 19, name: 'Zinc Supplement 25mg', category: 'Supplements', stock: 210, reorderLevel: 50, expiry: '2025-11-20', avgDailySales: 10, unitPrice: 5.75, supplier: 'PharmaCorp' },
  { id: 20, name: 'Loratadine 10mg', category: 'Antihistamines', stock: 175, reorderLevel: 40, expiry: '2025-10-08', avgDailySales: 13, unitPrice: 11.5, supplier: 'HealthPlus Inc' },
  { id: 21, name: 'Cetirizine 10mg', category: 'Antihistamines', stock: 190, reorderLevel: 45, expiry: '2025-09-25', avgDailySales: 14, unitPrice: 10.25, supplier: 'MediSupplies Ltd' },
  { id: 22, name: 'Diphenhydramine 25mg', category: 'Antihistamines', stock: 160, reorderLevel: 30, expiry: '2025-08-12', avgDailySales: 8, unitPrice: 9.0, supplier: 'PharmaCorp' },
  { id: 23, name: 'Naproxen 250mg', category: 'Analgesics', stock: 230, reorderLevel: 60, expiry: '2025-11-30', avgDailySales: 16, unitPrice: 4.25, supplier: 'HealthPlus Inc' },
  { id: 24, name: 'Ketorolac 10mg', category: 'Analgesics', stock: 150, reorderLevel: 35, expiry: '2025-07-18', avgDailySales: 9, unitPrice: 13.75, supplier: 'MediSupplies Ltd' },
  { id: 25, name: 'Prednisone 5mg', category: 'Corticosteroids', stock: 145, reorderLevel: 25, expiry: '2025-06-22', avgDailySales: 6, unitPrice: 7.0, supplier: 'PharmaCorp' },
  { id: 26, name: 'Hydrocortisone 10mg', category: 'Corticosteroids', stock: 155, reorderLevel: 30, expiry: '2025-09-15', avgDailySales: 5, unitPrice: 8.5, supplier: 'HealthPlus Inc' },
  { id: 27, name: 'Dexamethasone 0.5mg', category: 'Corticosteroids', stock: 140, reorderLevel: 20, expiry: '2025-08-08', avgDailySales: 4, unitPrice: 10.0, supplier: 'MediSupplies Ltd' },
  { id: 28, name: 'Albuterol Inhaler 100mcg', category: 'Bronchodilators', stock: 135, reorderLevel: 20, expiry: '2025-10-30', avgDailySales: 7, unitPrice: 25.5, supplier: 'PharmaCorp' },
  { id: 29, name: 'Fluticasone Inhaler 110mcg', category: 'Bronchodilators', stock: 145, reorderLevel: 25, expiry: '2025-11-12', avgDailySales: 8, unitPrice: 28.0, supplier: 'HealthPlus Inc' },
  { id: 30, name: 'Salbutamol Syrup', category: 'Bronchodilators', stock: 130, reorderLevel: 15, expiry: '2025-07-20', avgDailySales: 6, unitPrice: 15.5, supplier: 'MediSupplies Ltd' },
  { id: 31, name: 'Levothyroxine 50mcg', category: 'Thyroid', stock: 185, reorderLevel: 40, expiry: '2025-12-18', avgDailySales: 11, unitPrice: 11.25, supplier: 'HealthPlus Inc' },
  { id: 32, name: 'Propranolol 40mg', category: 'Antihypertensives', stock: 170, reorderLevel: 35, expiry: '2025-10-05', avgDailySales: 9, unitPrice: 12.75, supplier: 'MediSupplies Ltd' },
  { id: 33, name: 'Amlodipine 5mg', category: 'Antihypertensives', stock: 195, reorderLevel: 50, expiry: '2025-11-28', avgDailySales: 12, unitPrice: 14.5, supplier: 'PharmaCorp' },
  { id: 34, name: 'Diltiazem 30mg', category: 'Antihypertensives', stock: 150, reorderLevel: 30, expiry: '2025-09-10', avgDailySales: 7, unitPrice: 16.25, supplier: 'HealthPlus Inc' },
  { id: 35, name: 'Furosemide 40mg', category: 'Diuretics', stock: 165, reorderLevel: 35, expiry: '2025-08-15', avgDailySales: 9, unitPrice: 9.75, supplier: 'MediSupplies Ltd' },
  { id: 36, name: 'Hydrochlorothiazide 25mg', category: 'Diuretics', stock: 180, reorderLevel: 40, expiry: '2025-10-20', avgDailySales: 11, unitPrice: 8.0, supplier: 'PharmaCorp' },
  { id: 37, name: 'Spironolactone 25mg', category: 'Diuretics', stock: 145, reorderLevel: 25, expiry: '2025-07-12', avgDailySales: 5, unitPrice: 11.5, supplier: 'HealthPlus Inc' },
  { id: 38, name: 'Warfarin 5mg', category: 'Anticoagulants', stock: 130, reorderLevel: 20, expiry: '2025-06-08', avgDailySales: 4, unitPrice: 18.0, supplier: 'MediSupplies Ltd' },
  { id: 39, name: 'Heparin 1000U/mL', category: 'Anticoagulants', stock: 125, reorderLevel: 15, expiry: '2025-05-15', avgDailySales: 3, unitPrice: 35.5, supplier: 'PharmaCorp' },
  { id: 40, name: 'Clopidogrel 75mg', category: 'Antiplatelet', stock: 160, reorderLevel: 30, expiry: '2025-09-22', avgDailySales: 7, unitPrice: 20.0, supplier: 'HealthPlus Inc' },
  { id: 41, name: 'Gabapentin 300mg', category: 'Anticonvulsants', stock: 155, reorderLevel: 40, expiry: '2025-11-10', avgDailySales: 9, unitPrice: 11.0, supplier: 'PharmaCorp' },
  { id: 42, name: 'Phenytoin 100mg', category: 'Anticonvulsants', stock: 140, reorderLevel: 35, expiry: '2025-10-05', avgDailySales: 6, unitPrice: 13.5, supplier: 'MediSupplies Ltd' },
  { id: 43, name: 'Amitriptyline 25mg', category: 'Antidepressants', stock: 175, reorderLevel: 45, expiry: '2025-09-20', avgDailySales: 11, unitPrice: 9.75, supplier: 'HealthPlus Inc' },
  { id: 44, name: 'Sertraline 50mg', category: 'Antidepressants', stock: 190, reorderLevel: 50, expiry: '2025-10-10', avgDailySales: 14, unitPrice: 12.5, supplier: 'PharmaCorp' },
  { id: 45, name: 'Fluoxetine 20mg', category: 'Antidepressants', stock: 185, reorderLevel: 48, expiry: '2025-09-30', avgDailySales: 12, unitPrice: 11.25, supplier: 'MediSupplies Ltd' },
  { id: 46, name: 'Paroxetine 20mg', category: 'Antidepressants', stock: 168, reorderLevel: 45, expiry: '2025-08-25', avgDailySales: 10, unitPrice: 10.75, supplier: 'HealthPlus Inc' },
  { id: 47, name: 'Citalopram 20mg', category: 'Antidepressants', stock: 172, reorderLevel: 42, expiry: '2025-09-15', avgDailySales: 9, unitPrice: 10.5, supplier: 'PharmaCorp' },
  { id: 48, name: 'Lorazepam 1mg', category: 'Anxiolytics', stock: 125, reorderLevel: 35, expiry: '2025-07-10', avgDailySales: 7, unitPrice: 14.0, supplier: 'MediSupplies Ltd' },
  { id: 49, name: 'Diazepam 5mg', category: 'Anxiolytics', stock: 140, reorderLevel: 40, expiry: '2025-08-15', avgDailySales: 8, unitPrice: 12.75, supplier: 'HealthPlus Inc' },
  { id: 50, name: 'Alprazolam 0.5mg', category: 'Anxiolytics', stock: 155, reorderLevel: 38, expiry: '2025-09-05', avgDailySales: 11, unitPrice: 13.5, supplier: 'PharmaCorp' },
  { id: 51, name: 'Donepezil 5mg', category: 'Nootropics', stock: 95, reorderLevel: 30, expiry: '2025-10-20', avgDailySales: 4, unitPrice: 18.0, supplier: 'MediSupplies Ltd' },
  { id: 52, name: 'Piracetam 800mg', category: 'Nootropics', stock: 110, reorderLevel: 32, expiry: '2025-11-05', avgDailySales: 5, unitPrice: 15.5, supplier: 'HealthPlus Inc' },
  { id: 53, name: 'Lisinopril-HCTZ 10/25', category: 'Antihypertensives', stock: 140, reorderLevel: 40, expiry: '2025-10-30', avgDailySales: 10, unitPrice: 18.0, supplier: 'PharmaCorp' },
  { id: 54, name: 'Metoprolol-HCTZ 50/25', category: 'Antihypertensives', stock: 130, reorderLevel: 38, expiry: '2025-09-20', avgDailySales: 8, unitPrice: 16.5, supplier: 'MediSupplies Ltd' },
  { id: 55, name: 'Amoxicillin-Clavulanate 500/125', category: 'Antibiotics', stock: 160, reorderLevel: 45, expiry: '2025-11-15', avgDailySales: 13, unitPrice: 16.0, supplier: 'HealthPlus Inc' },
  { id: 56, name: 'Trimethoprim-Sulfamethoxazole', category: 'Antibiotics', stock: 145, reorderLevel: 35, expiry: '2025-10-10', avgDailySales: 9, unitPrice: 14.5, supplier: 'PharmaCorp' },
  { id: 57, name: 'Gliclazide 80mg', category: 'Antidiabetics', stock: 165, reorderLevel: 42, expiry: '2025-09-30', avgDailySales: 10, unitPrice: 10.25, supplier: 'MediSupplies Ltd' },
  { id: 58, name: 'Pioglitazone 30mg', category: 'Antidiabetics', stock: 130, reorderLevel: 38, expiry: '2025-08-20', avgDailySales: 6, unitPrice: 15.75, supplier: 'HealthPlus Inc' },
  { id: 59, name: 'Glipizide 5mg', category: 'Antidiabetics', stock: 155, reorderLevel: 40, expiry: '2025-10-05', avgDailySales: 9, unitPrice: 11.0, supplier: 'PharmaCorp' },
  { id: 60, name: 'Acarbose 50mg', category: 'Antidiabetics', stock: 125, reorderLevel: 35, expiry: '2025-09-10', avgDailySales: 5, unitPrice: 12.5, supplier: 'MediSupplies Ltd' },
].map(maybeDosageForm);

const mockPredictiveRows: PredictiveRow[] = mockMedicines.map(m => ({
  ...m,
  daysLeft: (m.avgDailySales ?? 0) > 0 ? Math.floor(m.stock / (m.avgDailySales ?? 0)) : 999,
  suggestedRestock: Math.max(0, (m.reorderLevel ?? 0) * 2 - m.stock)
}));

const mockSalesSeries: SalesPoint[] = [
  { label: 'Jan', value: 68500 },
  { label: 'Feb', value: 75200 },
  { label: 'Mar', value: 82100 },
  { label: 'Apr', value: 91600 },
];

export const mockStatusCounts: InventoryStatusCounts = {
  all: 60,
  healthy: 48,
  low_stock: 8,
  critical_stock: 0,
  expiring_soon: 3,
  expired: 1,
};

export const mocks = {
  mockDashboardProps: {
    lowStockCount: 8,
    expiringSoonCount: 3,
    todaySales: 28750,
    salesSeries: mockSalesSeries,
    predictiveRows: mockPredictiveRows,
    monthOverMonth: 33.8,
  },
  mockSalesProps: {
    todaySales: 28750,
    weekSales: 145600,
    monthSales: 575000,
    averageBasket: 1200,
    salesProgress: 82,
    monthlyForecast: 750000,
    monthOverMonth: 33.8,
  },
   mockInventoryProps: {
     medicines: mockMedicines,
     lowStockMeds: mockMedicines.filter(m => m.stock <= (m.reorderLevel ?? 0)),
     criticalStockMeds: mockMedicines.filter(m => m.stock > 0 && m.stock <= 50),
     expiringSoonMeds: mockMedicines.filter(m => m.id === 2),
     purchaseNeededMeds: mockPredictiveRows.filter(r => r.daysLeft < 14),
     addItemError: '',
     editError: '',
     editingMedicineId: null as number | null,
     savingMedicineId: null as number | null,
     deletingMedicineId: null as number | null,
     addingItem: false,
     isAddingMode: false,
     newItemName: '',
     newItemCategory: '',
     newItemStock: '',
     newItemReorderLevel: '',
     newItemExpiry: '',
     newItemAvgDailySales: '',
     newItemUnitPrice: '',
     newItemSupplier: '',
     newItemManufacturer: '',
     newItemLotNumber: '',
     newItemReceivedDate: '',
     newItemSellingPrice: '',
     onNewItemChange: (field: string, value: string) => {
       const map: Record<string, string> = {
         name: 'newItemName',
         category: 'newItemCategory',
         stock: 'newItemStock',
         reorderLevel: 'newItemReorderLevel',
         expiry: 'newItemExpiry',
         avgDailySales: 'newItemAvgDailySales',
         unitPrice: 'newItemUnitPrice',
         supplier: 'newItemSupplier',
         classification: 'newItemClassification',
         dosageForm: 'newItemDosageForm',
         strength: 'newItemStrength',
         volume: 'newItemVolume',
         manufacturer: 'newItemManufacturer',
         lotNumber: 'newItemLotNumber',
         receivedDate: 'newItemReceivedDate',
         sellingPrice: 'newItemSellingPrice',
       };
       const prop = map[field] || `newItem${field.charAt(0).toUpperCase() + field.slice(1)}`;
       // @ts-ignore demo mutation
       (mocks.mockInventoryProps as any)[prop] = value;
     },
     onStartAddItem: () => {},
     onCancelAddItem: () => {
       (mocks.mockInventoryProps as any).newItemName = '';
       (mocks.mockInventoryProps as any).newItemCategory = '';
       (mocks.mockInventoryProps as any).newItemStock = '';
       (mocks.mockInventoryProps as any).newItemReorderLevel = '';
       (mocks.mockInventoryProps as any).newItemExpiry = '';
     },
     onAddItem: () => {
       const props: any = mocks.mockInventoryProps;
       const id = Date.now();
       const name = (props.newItemName || `New Item ${id}`).toString();
       const stock = Number(props.newItemStock) || 0;
       const unitPrice = Number(props.newItemUnitPrice) || 0;
       const newMed: any = {
         id,
         name,
         category: props.newItemCategory || 'Uncategorized',
         stock,
         reorderLevel: Number(props.newItemReorderLevel) || 0,
         expiry: props.newItemExpiry || undefined,
         avgDailySales: Number(props.newItemAvgDailySales) || 0,
         unitPrice,
         supplier: props.newItemSupplier || undefined,
         manufacturer: props.newItemManufacturer || undefined,
       };
       if (props.newItemLotNumber || props.newItemReceivedDate) {
         newMed.supplies = [{
           batch_number: props.newItemLotNumber || undefined,
           received_date: props.newItemReceivedDate || undefined,
           expiry_date: props.newItemExpiry || undefined,
           quantity: stock,
         }];
       }
       (mocks.mockInventoryProps.medicines as any[]).unshift(newMed);
       props.newItemName = '';
       props.newItemCategory = '';
       props.newItemStock = '';
       props.newItemReorderLevel = '';
       props.newItemExpiry = '';
       props.newItemUnitPrice = '';
       props.newItemSupplier = '';
       props.newItemManufacturer = '';
       props.newItemLotNumber = '';
       props.newItemReceivedDate = '';
       props.newItemSellingPrice = '';
     },
     onStartEditMedicine: (id: number) => {},
     onCancelEditMedicine: (id: number) => {},
     onMedicineInputChange: (id: number, field: keyof Medicine, value: string) => {},
     onSaveMedicine: (id: number) => {},
     onDeleteMedicine: (id: number) => {},
   }
 };
