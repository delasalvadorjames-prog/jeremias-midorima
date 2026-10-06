import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_CATEGORIES } from '../data/constants';
import { CustomPromo, Medicine, MedicineSupply, PharmacySettings, PredictiveRow, UserRole } from '../types';
import { getExpiryDays, getMedicineExpiryAlertDays, getMedicineLowStockThreshold, getProductCriticalStockThreshold } from '../lib/inventory';
import { getFifoAvailableStock, getFifoAvailableSupplies, getFifoSupplies } from '../lib/fifo';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import { loadCustomPromos, saveCustomPromo } from '../lib/promoStorage';
import { getStrengthForDisplay, getVolumeForDisplay } from '../lib/productAttributes';

type Props = {
  medicines: Medicine[];
  lowStockMeds: Medicine[];
  expiringSoonMeds: Medicine[];
  purchaseNeededMeds: PredictiveRow[];
  addItemError: string;
  editError: string;
  editingMedicineId: number | null;
  savingMedicineId: number | null;
  deletingMedicineId: number | null;
  addingItem: boolean;
  isAddingMode: boolean;
  newItemName: string;
  newItemCategory: string;
  newItemStock: string;
  newItemReorderLevel: string;
  newItemExpiry: string;
  newItemAvgDailySales: string;
  newItemUnitPrice: string;
  newItemSupplier: string;
  newItemClassification: string;
  newItemDosageForm: string;
  newItemStrength: string;
  newItemVolume: string;
  newItemManufacturer?: string;
  newItemUnitType?: string;
  newItemConversionFactor?: string;
  newItemSellingPrice?: string;
  newItemLotNumber?: string;
  newItemReceivedDate?: string;
  onNewItemChange: (field: string, value: string) => void;
  onStartAddItem: () => void;
  onCancelAddItem: () => void;
  onAddItem: () => void;
  onAddChildProduct: (input: {
    motherName: string;
    category: string;
    dosageForm?: string;
    variantName: string;
    classification: string;
    sellingPrice: string;
    costPrice: string;
    reorderLevel: string;
    initialStock: string;
    lotNumber: string;
    expiryDate: string;
    supplier: string;
    receivedDate: string;
  }) => Promise<void>;
  onStartEditMedicine: (id: number) => void;
  onCancelEditMedicine: (id: number) => void;
  onMedicineInputChange: (id: number, field: keyof Medicine, value: string) => void;
  onSaveMedicine: (id: number) => void;
  onDeleteMedicine: (id: number) => void;
  onAddSupply: (id: number, quantity: number, expiry: string, receivedDate?: string, supplier?: string, sellingPrice?: number) => void;
  onUpdateSupplyPrice: (supplyId: number, price: number, reason?: string) => void;
  onAdjustSupply: (supplyId: number, quantity: number, adjustmentType: string, reason?: string) => void;
  onArchiveSupply: (supplyId: number, reason?: string) => Promise<boolean>;
  onArchiveMedicine: (medicineId: number, archived: boolean, reason?: string) => Promise<boolean>;
  onRefreshMedicines: () => Promise<void>;
  userRole?: UserRole;
  assignedCategory?: string | null;
  filterPreset?: { category: string; status: string; timestamp: number; staffId?: number; staffName?: string } | null;
  inventoryThresholds?: Pick<PharmacySettings, 'criticalStockAlertUnits' | 'lowStockAlertUnits' | 'expiryAlertDays' | 'shelfLifeDays' | 'nonMedicineCriticalStockAlertUnits' | 'nonMedicineLowStockAlertUnits' | 'nonMedicineShelfLifeDays' | 'nonMedicineExpiryAlertDays' | 'nonMedicineExpiryNotifications'>;

  availableCategories?: string[];
  promoCandidates?: Medicine[];
  promoRequestMedicineId?: number | null;
  onPromoRequestHandled?: () => void;
  onSavePromo?: (promo: { medicineId: number; medicineName: string; discountPercent: number; promoPrice: number; promoLabel: string; badgeText: string; isActive: boolean; createdAt: string; startDate: string; endDate: string }) => void;
};

const INPUT_CLASS =
  'w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-all shadow-[0_2px_0_0_rgba(148,163,184,0.35)] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/50 placeholder-slate-400';
const FIELD_LABEL_CLASS = 'text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500';
const REQUIRED_BADGE_CLASS =
  'inline-flex items-center rounded-full border-2 border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-rose-700 shadow-[0_2px_0_0_rgba(244,63,94,0.35)]';

// ── 3D Primary / Secondary buttons ──
const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-xl border border-emerald-700/80 bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_2px_0_0_rgba(4,120,87,0.9),0_6px_12px_-4px_rgba(5,150,105,0.55)] transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-[0_2px_0_0_rgba(4,120,87,0.9),0_8px_16px_-4px_rgba(5,150,105,0.65)] active:translate-y-[1px] active:shadow-[0_0px_0_0_rgba(4,120,87,0.9)] disabled:cursor-not-allowed disabled:opacity-60';
const SECONDARY_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-xl border border-slate-300 bg-gradient-to-b from-white to-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-[0_2px_0_0_rgba(148,163,184,0.9),0_6px_12px_-4px_rgba(100,116,139,0.4)] transition-all hover:from-slate-50 hover:to-slate-200 hover:shadow-[0_2px_0_0_rgba(148,163,184,0.9),0_8px_16px_-4px_rgba(100,116,139,0.5)] active:translate-y-[1px] active:shadow-[0_0px_0_0_rgba(148,163,184,0.9)] disabled:cursor-not-allowed disabled:opacity-60';

// ── Batch-action button styles (colored, 3D via layered shadow) ──
const PRICE_ACTION_BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-sky-600/80 bg-gradient-to-b from-sky-500 to-sky-600 px-4 py-2 text-xs font-extrabold text-white shadow-[0_2px_0_0_rgba(3,105,161,0.9),0_6px_12px_-4px_rgba(2,132,199,0.55)] transition-all hover:from-sky-400 hover:to-sky-500 hover:shadow-[0_2px_0_0_rgba(3,105,161,0.9),0_8px_16px_-4px_rgba(2,132,199,0.65)] active:translate-y-[1px] active:shadow-[0_0px_0_0_rgba(3,105,161,0.9)]';
const ADJUST_ACTION_BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-600/80 bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-2 text-xs font-extrabold text-white shadow-[0_2px_0_0_rgba(180,83,9,0.9),0_6px_12px_-4px_rgba(217,119,6,0.55)] transition-all hover:from-amber-300 hover:to-amber-400 hover:shadow-[0_2px_0_0_rgba(180,83,9,0.9),0_8px_16px_-4px_rgba(217,119,6,0.65)] active:translate-y-[1px] active:shadow-[0_0px_0_0_rgba(180,83,9,0.9)]';
const UNARCHIVE_ACTION_BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-600/80 bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-[0_2px_0_0_rgba(4,120,87,0.9),0_6px_12px_-4px_rgba(5,150,105,0.55)] transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-[0_2px_0_0_rgba(4,120,87,0.9),0_8px_16px_-4px_rgba(5,150,105,0.65)] active:translate-y-[1px] active:shadow-[0_0px_0_0_rgba(4,120,87,0.9)]';
const ARCHIVE_EXPIRED_BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-600/80 bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2 text-xs font-extrabold text-white shadow-[0_2px_0_0_rgba(159,18,57,0.9),0_6px_12px_-4px_rgba(225,29,72,0.55)] transition-all hover:from-rose-400 hover:to-rose-500 hover:shadow-[0_2px_0_0_rgba(159,18,57,0.9),0_8px_16px_-4px_rgba(225,29,72,0.65)] active:translate-y-[1px] active:shadow-[0_0px_0_0_rgba(159,18,57,0.9)]';
const VIEW_PRODUCT_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50 to-white px-4 py-2 text-xs font-bold text-indigo-700 transition-all hover:from-indigo-100 hover:to-indigo-50 hover:shadow-[0_2px_0_0_rgba(99,102,241,0.4),0_6px_12px_-4px_rgba(99,102,241,0.35)] active:translate-y-[1px] shadow-sm disabled:opacity-60';

// ── 3D Stepper button for +/- ──
const STEPPER_BUTTON_CLASS =
  'flex w-12 shrink-0 items-center justify-center bg-gradient-to-b from-slate-50 to-slate-200 text-xl font-black text-slate-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)] transition-all hover:from-slate-100 hover:to-slate-300 active:translate-y-[1px] active:from-slate-200 active:to-slate-300 active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)]';

const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Injectable',
  'Cream',
  'Ointment',
  'Drops',
  'Other',
];
const CLASSIFICATIONS = ['Generic', 'Branded'];
const isNonMedicineDosageForm = (form?: string) =>
  ['other', 'others', 'medical supply', 'medical device'].includes(String(form || '').trim().toLowerCase());
const DOSAGE_PRESETS: Record<string, string[]> = {
  Tablet: ['100mg', '200mg', '250mg', '500mg', '650mg', '1g'],
  Capsule: ['100mg', '200mg', '250mg', '500mg', '650mg', '1g'],
  Syrup: ['100mg/5mL', '125mg/5mL', '200mg/5mL', '250mg/5mL'],
  Suspension: ['100mg/5mL', '125mg/5mL', '200mg/5mL', '250mg/5mL'],
  Injectable: ['10mg/mL', '20mg/mL', '40mg/mL', '100mg/mL'],
  Cream: ['1%', '2%', '5%', '10%'],
  Ointment: ['1%', '2%', '5%', '10%'],
  Drops: ['10mg/mL', '20mg/mL', '50mg/mL'],
};

const VOLUME_FORMS = ['Syrup', 'Suspension', 'Injectable', 'Drops'];
const VOLUME_PRESETS: Record<string, string[]> = {
  Syrup: ['30mL', '60mL', '120mL', '250mL'],
  Suspension: ['30mL', '60mL', '120mL', '250mL'],
  Injectable: ['1mL', '2mL', '5mL', '10mL'],
  Drops: ['5mL', '10mL', '15mL'],
};
const UOM_OPTIONS: string[] = ['pcs', 'box', 'strip', 'bottle', 'vial', 'tube', 'sachet'];
const BASE_UNIT_LABELS: Record<Medicine['baseUnit'], string> = {
  pcs: 'pieces',
  box: 'boxes',
  strip: 'strips',
  bottle: 'bottles',
  vial: 'vials',
  tube: 'tubes',
  sachet: 'sachets',
};
const PURCHASE_UNIT_LABELS: Record<string, string> = {
  pcs: 'pieces',
  box: 'boxes',
  strip: 'strips',
  bottle: 'bottles',
  vial: 'vials',
  tube: 'tubes',
  sachet: 'sachets',
};
const UOM_GUIDANCE: Record<string, { factor: string; example: string }> = {
  pcs: { factor: '1', example: '1 piece = 1 base unit' },
  box: { factor: '100', example: '1 box = 100 tablets/capsules' },
  strip: { factor: '10', example: '1 strip = 10 tablets/capsules' },
  bottle: { factor: '100', example: '1 bottle = 100 base units or mL' },
  vial: { factor: '1', example: '1 vial = 1 base unit' },
  tube: { factor: '1', example: '1 tube = 1 base unit' },
  sachet: { factor: '1', example: '1 sachet = 1 base unit' },
};
const PURCHASE_UNITS_BY_DOSAGE_FORM: Record<string, string[]> = {
  Tablet: ['pcs', 'strip', 'box'],
  Capsule: ['pcs', 'strip', 'box'],
  Syrup: ['bottle'],
  Suspension: ['bottle'],
  Injectable: ['vial'],
  Cream: ['tube'],
  Ointment: ['tube'],
  Drops: ['bottle'],
  Other: UOM_OPTIONS,
};
const getMedicineConversionFactor = (medicine: Medicine) => Math.max(1, Number(medicine.conversionFactor) || 1);
const BASE_SUPPLY_UNIT_OPTIONS: Array<{ value: string; label: string; factor: number }> = [
  { value: 'pcs', label: 'pcs / pieces', factor: 1 },
  { value: 'strip', label: 'strip', factor: 10 },
  { value: 'box', label: 'box', factor: 100 },
  { value: 'bottle', label: 'bottle', factor: 1 },
  { value: 'vial', label: 'vial', factor: 1 },
  { value: 'tube', label: 'tube', factor: 1 },
  { value: 'sachet', label: 'sachet', factor: 1 },
];
const getSupplyUnitOptions = (medicine: Medicine) => {
  const dosageForm = String(medicine.dosage_form || '').toLowerCase();
  const configuredUnit = String(medicine.purchaseUnit || medicine.unitType || 'pcs').toLowerCase();
  const configuredFactor = getMedicineConversionFactor(medicine);
  if (dosageForm === 'tablet' || dosageForm === 'capsule') {
    return BASE_SUPPLY_UNIT_OPTIONS.slice(0, 3).map((option) => ({
      ...option,
      factor: option.value === configuredUnit && configuredFactor > 1 ? configuredFactor : option.factor,
    }));
  }
  const configuredOption = BASE_SUPPLY_UNIT_OPTIONS.find((option) => option.value === configuredUnit);
  return configuredOption && configuredUnit !== 'pcs'
    ? [BASE_SUPPLY_UNIT_OPTIONS[0], { ...configuredOption, factor: configuredFactor }]
    : [BASE_SUPPLY_UNIT_OPTIONS[0]];
};
const getDisplayBaseUnit = (mother: MotherProduct) => {
  if (mother.dosage_form === 'Capsule') return 'capsules';
  if (mother.dosage_form === 'Tablet') return 'tablets';
  return BASE_UNIT_LABELS[mother.baseUnit];
};

const formatLotLabel = (batchNumber?: string) => {
  if (!batchNumber) return 'N/A';
  return batchNumber
    .replace(/^LOT:\s*/i, '')
    .replace(/^(?:PRD-BATCH|DATASET-BATCH)-/i, '');
};
function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate' }) {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border border-rose-200',
    sky: 'bg-sky-50 text-sky-700 border border-sky-200',
    violet: 'bg-violet-50 text-violet-700 border border-violet-200',
    slate: 'bg-slate-100 text-slate-600 border border-slate-200',
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${styles[tone]}`}>{children}</span>;
}

// Mother Product interface
interface MotherProduct {
  id: number;
  name: string;
  productCode: string;
  category: string;
  classification: 'generic' | 'branded';
  dosage_form?: string;
  manufacturer?: string;
  children: Medicine[];
  totalStock: number;
  totalPurchaseUnits: number;
  baseUnit: Medicine['baseUnit'];
  purchaseUnit: string;
  conversionFactor: number;
  variantCount: number;
  batchCount: number;
  nearestExpiry: string;
  status: 'normal' | 'low_stock' | 'critical_stock' | 'expiring_soon' | 'expired' | 'out_of_stock';
}

interface VariantGroup {
  medicine: Medicine;
  variant: string;
  lotCount: number;
}

export default function InventoryPanel({
  medicines,
  lowStockMeds,
  expiringSoonMeds,
  purchaseNeededMeds,
  addItemError,
  editError,
  editingMedicineId,
  savingMedicineId,
  deletingMedicineId,
  addingItem,
  isAddingMode,
  newItemName,
  newItemCategory,
  newItemStock,
  newItemReorderLevel,
  newItemExpiry,
  newItemAvgDailySales,
  newItemUnitPrice,
  newItemSupplier,
  newItemClassification,
  newItemDosageForm,
  newItemStrength,
  newItemVolume,
  newItemManufacturer,
  newItemUnitType,
  newItemConversionFactor,
  newItemSellingPrice,
  newItemLotNumber,
  newItemReceivedDate,
  onNewItemChange,
  onStartAddItem,
  onCancelAddItem,
  onAddItem,
  onAddChildProduct,
  onStartEditMedicine,
  onCancelEditMedicine,
  onMedicineInputChange,
  onSaveMedicine,
  onDeleteMedicine,
  onAddSupply,
  onUpdateSupplyPrice,
  onAdjustSupply,
  onArchiveSupply,
  onArchiveMedicine,
  onRefreshMedicines,
  userRole = 'admin',
  assignedCategory,
  filterPreset,
  inventoryThresholds,
  availableCategories = [],
  promoCandidates = [],
  promoRequestMedicineId = null,
  onPromoRequestHandled,
  onSavePromo,
}: Props) {
  const lowStockAlertUnits = inventoryThresholds?.lowStockAlertUnits ?? 0;
  const expiryAlertDays = Math.max(1, inventoryThresholds?.expiryAlertDays ?? 60);
  const shelfLifeDays = Math.max(1, inventoryThresholds?.shelfLifeDays ?? 365);
  const calculateShelfLifeExpiry = (receivedDate: string) => {
    const expiry = new Date(`${receivedDate}T00:00:00`);
    expiry.setDate(expiry.getDate() + shelfLifeDays);
    return expiry.toISOString().slice(0, 10);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical_stock' | 'low_stock' | 'expiring_soon' | 'expired' | 'healthy' | 'new_arrival'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [restockAmount, setRestockAmount] = useState('0');
  const [restockUnit, setRestockUnit] = useState('pcs');
  const [restockReceivedDate, setRestockReceivedDate] = useState('');
  const [restockExpiry, setRestockExpiry] = useState('');
  const [restockSupplier, setRestockSupplier] = useState('');
  const [restockPrice, setRestockPrice] = useState('');
  const [selectedSupply, setSelectedSupply] = useState<MedicineSupply | null>(null);
  const [supplyActionMode, setSupplyActionMode] = useState<'add' | 'updatePrice' | 'adjust'>('add');
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionPrice, setActionPrice] = useState('');
  const [actionQuantity, setActionQuantity] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'damages' | 'expired' | 'count_correction'>('count_correction');
  const [actionReason, setActionReason] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [staffFilter, setStaffFilter] = useState<{ id: number; name: string } | null>(null);
  const [viewMotherProduct, setViewMotherProduct] = useState<MotherProduct | null>(null);
  const [selectedChildProduct, setSelectedChildProduct] = useState<Medicine | null>(null);
  const [showAddChildForm, setShowAddChildForm] = useState(false);
  const [viewChildDetails, setViewChildDetails] = useState<Medicine | null>(null);
  const [expandedVariantId, setExpandedVariantId] = useState<number | null>(null);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [childFormData, setChildFormData] = useState(
    {
      variantName: '',
      classification: 'Generic',
      sellingPrice: '',
      costPrice: '',
      reorderLevel: '',
      initialStock: '',
      lotNumber: '',
      expiryDate: '',
      supplier: '',
      receivedDate: '',
    });
  const [classificationFilter, setClassificationFilter] = useState<'all' | 'generic' | 'branded'>('all');
  const [dosageFormFilter, setDosageFormFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(true);
  const [showCustomDosage, setShowCustomDosage] = useState(false);
  const [addModalStep, setAddModalStep] = useState(1);
  const [addModalError, setAddModalError] = useState('');
  // ============ PROMO STATES ============
  const [showPromoList, setShowPromoList] = useState(false);
  const [promoMedicine, setPromoMedicine] = useState<Medicine | null>(null);
  const [promoDiscount, setPromoDiscount] = useState('10');
  const [promoStart, setPromoStart] = useState('');
  const [promoEnd, setPromoEnd] = useState('');
  const [promoSaved, setPromoSaved] = useState(false);
  const [showPromoPicker, setShowPromoPicker] = useState(false);
  const [showPromoProductChooser, setShowPromoProductChooser] = useState(false);
  const [promoListTargetId, setPromoListTargetId] = useState<number | null>(null);
  const [savedPromos, setSavedPromos] = useState(() => loadCustomPromos());
  const [promoToday, setPromoToday] = useState(() => new Date().toISOString().slice(0, 10));
  // ================================================================================

  const resetSupplyAction = () => {
    setSelectedSupply(null);
    setSupplyActionMode('add');
    setActionPrice('');
    setActionQuantity('');
    setAdjustmentType('count_correction');
    setRestockReceivedDate('');
    setRestockSupplier('');
    setRestockPrice('');
  };

  const openSupplyDrawer = (product: Medicine, mode: 'add' | 'updatePrice' | 'adjust', supply?: MedicineSupply) => {
    setSelectedChildProduct(product);
    setSupplyActionMode(mode);
    setSelectedSupply(supply || null);

    if (mode === 'add') {
      const today = new Date().toISOString().slice(0, 10);
      setRestockAmount('0');
      const supplyOptions = getSupplyUnitOptions(product);
      const configuredUnit = String(product.purchaseUnit || product.unitType || 'pcs').toLowerCase();
      setRestockUnit(supplyOptions.some((option) => option.value === configuredUnit) ? configuredUnit : (supplyOptions[0]?.value || 'pcs'));
      setRestockReceivedDate(today);
      setRestockExpiry(calculateShelfLifeExpiry(today));
      setRestockSupplier(product.supplier && product.supplier !== 'Unknown' ? product.supplier : '');
      setRestockPrice(product.unitPrice ? String(product.unitPrice) : '');
      setActionPrice('');
      setActionQuantity('');
    } else if (mode === 'updatePrice') {
      setActionPrice(supply?.selling_price?.toString() || '');
      setRestockAmount('0');
      setRestockReceivedDate('');
      setRestockExpiry('');
      setActionQuantity('');
    } else if (mode === 'adjust') {
      setActionQuantity(supply?.quantity?.toString() || '');
      setAdjustmentType('count_correction');
      setRestockAmount('0');
      setRestockReceivedDate('');
      setRestockExpiry('');
      setActionPrice('');
    }
  };

  const openSupplyActionModal = (product: Medicine, mode: 'add' | 'updatePrice' | 'adjust', supply?: MedicineSupply) => {
    openSupplyDrawer(product, mode, supply);
    setActionModalOpen(true);
  };

  const closeSupplyActionModal = () => {
    setActionModalOpen(false);
    resetSupplyAction();
  };
  const validateStep = (step: number) => {
    setAddModalError('');
    if (step === 1) {
      return Boolean(newItemDosageForm);
    }
    if (step === 2) {
      return Boolean(newItemClassification);
    }
    if (step === 3) {
      const strengthRequired = !isNonMedicineDosageForm(newItemDosageForm);
      const strengthFilled = !strengthRequired || Boolean(newItemStrength.trim());
      const volumeFilled = !usesVolumeDosage || Boolean(newItemVolume.trim());
      const categoryFilled = Boolean(newItemCategory.trim()) || isNonMedicineDosageForm(newItemDosageForm);
      if (!newItemName.trim() || !categoryFilled || !strengthFilled || !volumeFilled) {
        setAddModalError(strengthRequired && !strengthFilled
          ? 'Please provide the required Strength.'
          : !volumeFilled
            ? 'Please provide the required Volume for this dosage form.'
            : 'Please fill required fields in Product Information.');
        return false;
      }
      return true;
    }
    if (step === 4) {
      if (!newItemStock || !newItemReorderLevel || !newItemUnitType || Number(newItemConversionFactor || 0) < 1) {
        setAddModalError('Please complete Inventory Information.');
        return false;
      }
      return true;
    }
    if (step === 5) {
      if (!newItemLotNumber || !newItemReceivedDate || !newItemExpiry) {
        setAddModalError('Please provide batch Lot number, Date received and Expiry Date.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(addModalStep)) setAddModalStep((s) => Math.min(5, s + 1));
  };

  const handlePrev = () => {
    setAddModalError('');
    setAddModalStep((s) => Math.max(1, s - 1));
  };

  const handleSaveMedicine = () => {
    const firstInvalidStep = [1, 2, 3, 4, 5].find((step) => !validateStep(step));
    if (firstInvalidStep) {
      setAddModalStep(firstInvalidStep);
      return;
    }
    onAddItem();
  };

  React.useEffect(() => {
    if (filterPreset) {
      if (filterPreset.staffId && filterPreset.staffName) {
        setStaffFilter({ id: filterPreset.staffId, name: filterPreset.staffName });
        setCategoryFilter(filterPreset.category || 'all');
      } else {
        setStaffFilter(null);
        setCategoryFilter(filterPreset.category);
      }
      setStatusFilter(filterPreset.status as any);
      setCurrentPage(1);
    }
  }, [filterPreset]);

  React.useEffect(() => {
    if (!isAddingMode) setShowCustomDosage(false);
  }, [isAddingMode]);

  React.useEffect(() => {
    if (isAddingMode) {
      setAddModalStep(1);
      setAddModalError('');
    }
  }, [isAddingMode]);

  React.useEffect(() => {
    setShowCustomDosage(false);
  }, [newItemDosageForm]);

  const itemsPerPage = 20;

  const buildSupplyRows = (med: Medicine): MedicineSupply[] => {
    return getFifoSupplies(med);
  };

  // Helper function to extract base name (remove size/variant)
  const extractBaseName = (name: string): string => {
    return name
      .replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1')
      .replace(/\s+-\s+\d+(?:\.\d+)?\s*(?:ml|mL|ML|mg|MG|g|G|l|L)\b.*$/i, '')
      .replace(/\s+\d+(?:\.\d+)?\s*(?:ml|mL|ML|mg|MG|g|G|l|L)\b.*$/i, '')
      .replace(/\s+(?:bottle|box|strip|pack|tube|vial|sachet)\s+medicine$/i, '')
      .replace(/\s+medicine$/i, '')
      .replace(/\s+(?:bottle|box|strip|pack|tube|vial|sachet)$/i, '')
      .trim();
  };

  const extractVariantStrength = (med: Medicine): string => {
    return getStrengthForDisplay(med);
  };
  const extractVariantVolume = (med: Medicine): string => {
    return getVolumeForDisplay(med);
  };
  const extractVariant = (med: Medicine): string => {
    const strength = extractVariantStrength(med);
    const volume = extractVariantVolume(med);
    return [strength, volume].filter(Boolean).join(' / ') || 'Standard';
  };
  const extractSellingUnit = (med: Medicine): string => {
    const unit = String(med.purchaseUnit || med.unitType || med.baseUnit || '').trim();
    if (!unit || unit.toLowerCase() === 'units') return '—';
    return unit.charAt(0).toUpperCase() + unit.slice(1);
  };

  const normalizeVariantValue = (value: string) => value.replace(/\s+/g, '').toLowerCase();
  const existingVariantValues = useMemo(() => {
    const baseName = extractBaseName(newItemName).toLowerCase();
    if (!baseName || !newItemDosageForm || !newItemClassification) return new Set<string>();

    return new Set(
      medicines
        .filter((medicine) => !medicine.isArchived)
        .filter((medicine) => extractBaseName(medicine.name).toLowerCase() === baseName)
        .filter((medicine) => (medicine.dosage_form || '').toLowerCase() === newItemDosageForm.toLowerCase())
        .filter((medicine) => (medicine.classification || 'Generic').toLowerCase() === newItemClassification.toLowerCase())
        .map((medicine) => normalizeVariantValue(extractVariant(medicine)))
    );
  }, [medicines, newItemName, newItemDosageForm, newItemClassification]);

  const isExistingVariant = (preset: string) => existingVariantValues.has(normalizeVariantValue(preset));

  // Build Mother Products from medicines
  const motherProducts = useMemo(() => {
    const mothers = new Map<string, MotherProduct>();

    medicines.filter((med) => !med.isArchived).forEach((med) => {
      const baseName = extractBaseName(med.name);
      const key = baseName.toLowerCase();

      if (!mothers.has(key)) {
        mothers.set(key, {
          id: med.id,
          name: baseName,
          productCode: `PRD-${String(med.id).padStart(4, '0')}`,
          category: med.category,
          classification: (med.classification || 'generic').toLowerCase() === 'branded' ? 'branded' : 'generic',
          dosage_form: med.dosage_form,
          manufacturer: med.manufacturer,
          children: [],
          totalStock: 0,
          totalPurchaseUnits: 0,
          baseUnit: med.baseUnit || 'pcs',
          purchaseUnit: med.purchaseUnit || med.unitType || 'pcs',
          conversionFactor: getMedicineConversionFactor(med),
          variantCount: 0,
          batchCount: 0,
          nearestExpiry: '',
          status: 'normal',
        });
      }

      const mother = mothers.get(key)!;
      mother.children.push(med);
      const conversionFactor = getMedicineConversionFactor(med);
      const purchaseQuantity = getFifoSupplies(med)
        .filter((supply) => !supply.expiry_date || supply.expiry_date >= new Date().toISOString().slice(0, 10))
        .reduce((total, supply) => total + Math.max(0, Number(supply.quantity) || 0), 0);
      mother.totalPurchaseUnits += purchaseQuantity / conversionFactor;
      mother.totalStock += purchaseQuantity;

      // Count batches
      const supplies = buildSupplyRows(med);
      mother.batchCount += supplies.length;

      // Update nearest expiry
      if (!mother.nearestExpiry || (med.expiry && new Date(med.expiry) < new Date(mother.nearestExpiry))) {
        mother.nearestExpiry = med.expiry || mother.nearestExpiry;
      }
    });

    const result = Array.from(mothers.values()).map(mother => {
      mother.variantCount = new Set(
        mother.children.map((child) => `${extractVariant(child).trim().toLowerCase()}|${(child.classification || '').trim().toLowerCase()}`)
      ).size;

      const hasExpired = mother.children.some(child => {
        const daysLeft = getExpiryDays(child.expiry);
        return daysLeft !== null && daysLeft < 0;
      });
      const hasCriticalStock = mother.children.some(child => {
        const stock = getFifoAvailableStock(child);
        return stock <= getProductCriticalStockThreshold(child, inventoryThresholds) && stock > 0;
      });
      const hasOutOfStock = mother.totalStock <= 0;
      const hasLowStock = mother.children.some(child => {
        const stock = getFifoAvailableStock(child);
        return stock > 0 && stock <= getMedicineLowStockThreshold(child, inventoryThresholds);
      });
      const hasExpiringSoon = mother.children.some(child => {
        const daysLeft = getExpiryDays(child.expiry);
        return daysLeft !== null && daysLeft >= 0 && daysLeft <= getMedicineExpiryAlertDays(child, inventoryThresholds);
      });

      if (hasOutOfStock) {
        mother.status = 'out_of_stock';
      } else if (hasExpired) {
        mother.status = 'expired';
      } else if (hasExpiringSoon) {
        mother.status = 'expiring_soon';
      } else if (hasCriticalStock) {
        mother.status = 'critical_stock';
      } else if (hasLowStock) {
        mother.status = 'low_stock';
      } else {
        mother.status = 'normal';
      }

      return mother;
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [medicines, inventoryThresholds, lowStockAlertUnits, expiryAlertDays]);

  const archivedBatches = useMemo(
    () => medicines.flatMap((medicine) =>
      (medicine.supplies || [])
        .filter((supply) => supply.isArchived)
        .map((supply) => ({ medicine, supply }))
    ),
    [medicines]
  );

  const groupedViewVariants = useMemo<VariantGroup[]>(() => {
    if (!viewMotherProduct) return [];
    const groups = new Map<string, VariantGroup>();

    viewMotherProduct.children.forEach((child) => {
      const variant = extractVariant(child);
      const key = variant.trim().toLowerCase() || 'standard';
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          medicine: {
            ...child,
            stock: getFifoAvailableStock(child),
            supplies: [...(child.supplies || [])],
          },
          variant,
          lotCount: 1,
        });
        return;
      }

      existing.medicine = {
        ...existing.medicine,
        stock: existing.medicine.stock + getFifoAvailableStock(child),
        supplies: [...(existing.medicine.supplies || []), ...(child.supplies || [])],
        expiry: [existing.medicine.expiry, child.expiry].filter(Boolean).sort()[0] || existing.medicine.expiry,
      };
      existing.lotCount += 1;
    });

    return Array.from(groups.values()).sort((a, b) => a.variant.localeCompare(b.variant));
  }, [viewMotherProduct]);

  useEffect(() => {
    if (!viewChildDetails) return;
    const refreshedChild = medicines.find((medicine) => medicine.id === viewChildDetails.id);
    if (refreshedChild && refreshedChild !== viewChildDetails) {
      setViewChildDetails(refreshedChild);
    }
  }, [medicines, viewChildDetails]);

  useEffect(() => {
    if (!viewMotherProduct) return;
    const refreshedMother = motherProducts.find((mother) => mother.name === viewMotherProduct.name);
    if (refreshedMother && refreshedMother !== viewMotherProduct) {
      setViewMotherProduct(refreshedMother);
    }
  }, [motherProducts, viewMotherProduct]);

  const openArchivedMedicines = async () => {
    await onRefreshMedicines();
    setShowArchivedModal(true);
  };

  const filteredMotherProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return motherProducts.filter((mother) => {
      const matchesSearch =
        !normalizedSearch ||
        mother.name.toLowerCase().includes(normalizedSearch) ||
        mother.category.toLowerCase().includes(normalizedSearch) ||
        (mother.manufacturer || '').toLowerCase().includes(normalizedSearch) ||
        mother.productCode.toLowerCase().includes(normalizedSearch);

      const matchesCategory = categoryFilter === 'all' || mother.category.trim() === categoryFilter;

      const matchesClassification = classificationFilter === 'all' ||
        mother.classification === classificationFilter;

      const matchesDosageForm = dosageFormFilter === 'all' ||
        (mother.dosage_form || '').toLowerCase() === dosageFormFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'critical_stock' && mother.status === 'critical_stock') ||
        (statusFilter === 'low_stock' && mother.status === 'low_stock') ||
        (statusFilter === 'expiring_soon' && mother.status === 'expiring_soon') ||
        (statusFilter === 'expired' && mother.status === 'expired') ||
        (statusFilter === 'healthy' && mother.status === 'normal');

      return matchesSearch && matchesCategory && matchesClassification && matchesDosageForm && matchesStatus;
    });
  }, [motherProducts, searchTerm, categoryFilter, classificationFilter, dosageFormFilter, statusFilter]);

  const isStaffView = userRole === 'staff';
  const assignedCategories = useMemo(() => {
    if (!assignedCategory) return [];
    return assignedCategory.split(',').map((s) => s.trim()).filter(Boolean);
  }, [assignedCategory]);
  const hasStaffAssignment = !isStaffView || assignedCategories.length > 0;

  const categoryOptions = useMemo(() => {
    const categories = [
      ...DEFAULT_CATEGORIES,
      ...availableCategories,
      ...medicines.map((med) => med.category.trim()),
    ].filter(Boolean);

    if (assignedCategories.length > 0) {
      categories.push(...assignedCategories);
    }

    return Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b));
  }, [assignedCategories, availableCategories, medicines]);

  const addCategoryOptions = useMemo(() => {
    if (isStaffView && assignedCategories.length > 0) {
      return Array.from(new Set(assignedCategories)).sort((a, b) => a.localeCompare(b));
    }
    return categoryOptions;
  }, [assignedCategories, categoryOptions, isStaffView]);

  const totalPages = Math.ceil(filteredMotherProducts.length / itemsPerPage);
  const paginatedMothers = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredMotherProducts.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredMotherProducts, currentPage, itemsPerPage]);

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setClassificationFilter('all');
    setDosageFormFilter('all');
    setStatusFilter('all');
    setStaffFilter(null);
    setCurrentPage(1);
  };

  const isFilterActive = Boolean(searchTerm.trim()) || categoryFilter !== 'all' || classificationFilter !== 'all' || dosageFormFilter !== 'all' || statusFilter !== 'all' || staffFilter !== null;

  const getStockTone = (stock: number, reorderLevel = 0, dosageForm = '') => {
    if (stock <= 0) return 'danger';
    const criticalThreshold = getProductCriticalStockThreshold({ dosage_form: dosageForm } as Medicine, inventoryThresholds);
    const lowThreshold = getMedicineLowStockThreshold({ dosage_form: dosageForm, reorderLevel } as Medicine, inventoryThresholds);
    return stock <= criticalThreshold ? 'danger' : stock <= lowThreshold ? 'warning' : 'safe';
  };

  const getExpiryTone = (expiry: string) => {
    const daysLeft = getExpiryDays(expiry);
    if (daysLeft === null) return 'muted';
    if (daysLeft <= 30) return 'danger';
    if (daysLeft <= expiryAlertDays) return 'warning';
    return 'safe';
  };

  const getExpiryStatusText = (expiry: string) => {
    const daysLeft = getExpiryDays(expiry);
    if (daysLeft === null) return 'Unknown date';
    if (daysLeft <= 0) return 'Expired';
    if (daysLeft <= 30) return 'Not For Sale';
    if (daysLeft <= expiryAlertDays) return 'Near Expiry';
    return 'Good';
  };

  const getMedicineStatus = (med: Medicine) => {
    const availableStock = getFifoAvailableStock(med);
    if (availableStock <= 0) {
      return {
        label: 'Out of Stock',
        detail: 'No available units left',
        tone: 'danger',
      };
    }
    const daysLeft = getExpiryDays(med.expiry);
    if (daysLeft !== null && daysLeft <= 0) {
      return {
        label: 'Expired',
        detail: 'Immediate review needed',
        tone: 'danger',
      };
    }
    if (daysLeft !== null && daysLeft <= 30) {
      return {
        label: 'Not For Sale',
        detail: `${daysLeft} days remaining`,
        tone: 'danger',
      };
    }
    if (daysLeft !== null && daysLeft <= getMedicineExpiryAlertDays(med, inventoryThresholds)) {
      return {
        label: 'Near Expiry',
        detail: `${daysLeft} days remaining`,
        tone: 'warning',
      };
    }
    if (availableStock <= getProductCriticalStockThreshold(med, inventoryThresholds) && availableStock > 0) {
      return {
        label: 'Critical',
        detail: `Only ${availableStock} non-expired units left`,
        tone: 'danger',
      };
    }
    const lowStockLimit = getMedicineLowStockThreshold(med, inventoryThresholds);
    if (availableStock > 0 && availableStock <= lowStockLimit) {
      return {
        label: 'Low Stock',
        detail: `At or below ${lowStockLimit} non-expired units`,
        tone: 'warning',
      };
    }
    return {
      label: 'Normal',
      detail: daysLeft !== null ? `${daysLeft} days remaining` : 'Healthy levels',
      tone: 'safe',
    };
  };

  const getMotherStatus = (mother: MotherProduct) => {
    switch (mother.status) {
      case 'out_of_stock':
        return { label: 'Out of Stock', tone: 'danger' as const };
      case 'expired':
        return { label: 'Expired', tone: 'danger' as const };
      case 'expiring_soon':
        return { label: 'Near Expiry', tone: 'warning' as const };
      case 'critical_stock':
        return { label: 'Critical', tone: 'danger' as const };
      case 'low_stock':
        return { label: 'Low Stock', tone: 'warning' as const };
      default:
        return { label: 'Normal', tone: 'safe' as const };
    }
  };

  const missingRequiredFields = [
    !newItemName.trim() ? 'Medicine Name' : null,
    !newItemCategory.trim() ? 'Category' : null,
    !newItemStock ? 'Opening Stock' : null,
    !newItemConversionFactor || Number(newItemConversionFactor) < 1 ? 'Conversion Factor' : null,
    !newItemReorderLevel ? 'Low Stock Alert' : null,
    !newItemLotNumber ? 'Lot Number' : null,
    !newItemReceivedDate ? 'Date Received' : null,
    !newItemExpiry ? 'Expiry Date' : null,
  ].filter(Boolean) as string[];

  const UNIT_TYPE_DEFAULTS: Record<string, string> = {
    Tablet: 'strip',
    Capsule: 'strip',
    Syrup: 'bottle',
    Suspension: 'bottle',
    Injectable: 'vial',
    Cream: 'tube',
    Ointment: 'tube',
    Drops: 'bottle',
    Other: 'pcs',
    'Medical Supply': 'pack',
    'Medical Device': 'piece',
  };

  const inferredUnitType = UNIT_TYPE_DEFAULTS[newItemDosageForm] || 'units';
  const purchaseUnitOptions = PURCHASE_UNITS_BY_DOSAGE_FORM[newItemDosageForm] || UOM_OPTIONS;
  const dosagePresetOptions = DOSAGE_PRESETS[newItemDosageForm] || [];
  const usesVolumeDosage = VOLUME_FORMS.includes(newItemDosageForm);
  const volumePresetOptions = VOLUME_PRESETS[newItemDosageForm] || [];
  const dosageValue = newItemStrength || newItemVolume;

  const handleFormSelect = (form: string) => {
    onNewItemChange('dosageForm', form);
    onNewItemChange('classification', '');
    onNewItemChange('strength', '');
    onNewItemChange('volume', '');
    onNewItemChange('category', isNonMedicineDosageForm(form) ? 'Others' : '');
    const unit = UNIT_TYPE_DEFAULTS[form] || 'units';
    onNewItemChange('unitType', unit);
    onNewItemChange('conversionFactor', UOM_GUIDANCE[unit]?.factor || '1');
  };

  const handleUnitSelect = (unit: string) => {
    onNewItemChange('unitType', unit);
    onNewItemChange('conversionFactor', UOM_GUIDANCE[unit]?.factor || '1');
  };

  const handleDosageSelect = (preset: string) => {
    if (isExistingVariant(preset)) {
      setAddModalError(`${newItemName.trim()} ${preset} already exists. Add stock from Inventory instead.`);
      return;
    }
    setShowCustomDosage(false);
    onNewItemChange('strength', preset);
  };

  const handleVolumeSelect = (preset: string) => {
    onNewItemChange('volume', preset);
  };

  const handleAddChildProduct = async () => {
    if (
      !viewMotherProduct ||
      !childFormData.variantName.trim() ||
      !childFormData.sellingPrice ||
      !childFormData.costPrice ||
      !childFormData.reorderLevel ||
      !childFormData.initialStock ||
      !childFormData.lotNumber.trim() ||
      !childFormData.expiryDate ||
      !childFormData.receivedDate
    ) {
      setAddModalError('Please complete all required variant and batch fields.');


      return;
    }

    try {
      await onAddChildProduct({
        motherName: viewMotherProduct.name,
        category: viewMotherProduct.category,
        dosageForm: viewMotherProduct.dosage_form,
        ...childFormData,
      });

    } catch (error) {
      setAddModalError(error instanceof Error ? error.message : 'Failed to add variant.');
      return;
    }
    setShowAddChildForm(false);
    setAddModalError('');
    setChildFormData({
      variantName: '',
      classification: 'Generic',
      sellingPrice: '',
      costPrice: '',
      reorderLevel: '',
      initialStock: '',
      lotNumber: '',
      expiryDate: '',
      supplier: '',
      receivedDate: '',
    });
  };

  // ============ PROMO FUNCTIONS ============
  const openPromoForMedicine = (medicine: Medicine) => {
    if (!medicine || typeof medicine.id !== 'number') return;
    setShowPromoPicker(false);
    setShowPromoProductChooser(false);
    setShowPromoList(true);
    setPromoMedicine(medicine);
    const existingPromo = loadCustomPromos()[medicine.id];
    setPromoDiscount(String(existingPromo?.discountPercent || 10));
    setPromoSaved(false);
    const today = new Date();
    setPromoStart(existingPromo?.startDate || today.toISOString().slice(0, 10));
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
    setPromoEnd(existingPromo?.endDate || endDate.toISOString().slice(0, 10));
  };

  const addPromoToPos = (medicine: Medicine) => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
    const promo: CustomPromo = {
      medicineId: medicine.id,
      medicineName: medicine.name,
      discountPercent: 10,
      promoPrice: (medicine.unitPrice || 0) * 0.9,
      promoLabel: '10% off',
      badgeText: 'Promo',
      isActive: true,
      createdAt: new Date().toISOString(),
      startDate: today.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    };
    saveCustomPromo(promo);
    setSavedPromos(loadCustomPromos());
    setShowPromoPicker(false);
    setShowPromoList(true);
  };

  const createPromo = () => {
    if (!promoMedicine) return;
    if (!promoStart || !promoEnd) {
      alert('Please set both start and end dates for the promo.');
      return;
    }
    if (new Date(promoEnd) < new Date(promoStart)) {
      alert('End date cannot be before start date.');
      return;
    }
    const discountPercent = Math.max(1, Math.min(50, Number(promoDiscount) || 10));
    const promo = {
      medicineId: promoMedicine.id,
      medicineName: promoMedicine.name,
      discountPercent,
      promoPrice: (promoMedicine.unitPrice || 0) * (1 - discountPercent / 100),
      promoLabel: `${discountPercent}% off`,
      badgeText: 'Promo',
      isActive: true,
      createdAt: new Date().toISOString(),
      startDate: promoStart,
      endDate: promoEnd,
    };
    if (onSavePromo) onSavePromo(promo);
    else saveCustomPromo(promo);
    setSavedPromos(loadCustomPromos());
    setShowPromoList(true);
    setPromoSaved(true);
    setTimeout(() => {
      setPromoMedicine(null);
      setPromoSaved(false);
    }, 1500);
  };

  React.useEffect(() => {
    const handleNavigateToPromo = (event: any) => {
      const { medicineId } = event.detail;
      const medicine = medicines.find((m) => m.id === medicineId);
      if (medicine) {
        setPromoListTargetId(medicineId);
        setShowPromoList(true);
        setShowPromoPicker(true);
        setShowPromoProductChooser(true);
      }
    };
    window.addEventListener('navigate-to-inventory-promo', handleNavigateToPromo);
    return () => window.removeEventListener('navigate-to-inventory-promo', handleNavigateToPromo);
  }, [medicines]
  );

  React.useEffect(() => {
    if (promoRequestMedicineId === null) return;
    setPromoListTargetId(promoRequestMedicineId);
    setShowPromoList(true);
    setShowPromoPicker(true);
    setShowPromoProductChooser(true);
    onPromoRequestHandled?.();
  }, [onPromoRequestHandled, promoRequestMedicineId]);

  React.useEffect(() => {
    const syncPromos = () => setSavedPromos(loadCustomPromos());
    window.addEventListener('five_l_promos_updated', syncPromos);
    return () => window.removeEventListener('five_l_promos_updated', syncPromos);
  }, []);

  React.useEffect(() => {
    const timer = window.setInterval(() => setPromoToday(new Date().toISOString().slice(0, 10)), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleSavedPromos = Object.values(savedPromos).filter((promo) => !promo.endDate || promo.endDate >= promoToday);

  const promoChooserMedicines = [...medicines].sort((a, b) => {
    if (promoListTargetId === a.id) return -1;
    if (promoListTargetId === b.id) return 1;
    return a.name.localeCompare(b.name);
  });

  const renderBatchHistory = (medicine: Medicine) => (
    <div className="border-y-2 border-indigo-200 bg-indigo-50/50 p-5">
      <h4 className="mb-4 text-sm font-extrabold text-slate-900">
        {medicine.name} - Batch History
      </h4>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-gradient-to-r from-emerald-700 to-slate-900">
            <tr>
              <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Batch #</th>
              <th className="px-3 py-2.5 text-center font-extrabold text-slate-100">Qty</th>
              <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Received</th>
              <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Price</th>
              <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Supplier</th>
              <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Expiry</th>
              <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Status</th>
              <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {(buildSupplyRows(medicine) ?? []).map((supply) => {
              const expiryTone = getExpiryTone(supply.expiry_date?.toString() || '');
              const nextFefoSupplyId = getFifoAvailableSupplies(medicine)[0]?.id;
              return (
                <tr key={supply.id} className={`hover:bg-slate-50 transition-all ${supply.isArchived ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2">
                    {supply.id === nextFefoSupplyId && (
                      <span className="mr-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 shadow-sm">FEFO Next</span>
                    )}
                    <span className="inline-flex items-center rounded-lg border-2 border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700 font-mono shadow-sm">
                      {supply.batch_number}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-extrabold text-slate-900">{supply.quantity}</td>
                  <td className="px-3 py-2 text-slate-600 font-medium">{supply.received_date || '—'}</td>
                  <td className="px-3 py-2 text-slate-900 font-bold">₱{supply.selling_price?.toFixed(2) || '0.00'}</td>
                  <td className="px-3 py-2 text-slate-600">{supply.supplier || '—'}</td>
                  <td className="px-3 py-2">{supply.expiry_date || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold border-2 shadow-sm ${
                      supply.isArchived ? 'border-slate-200 bg-slate-100 text-slate-600' :
                      Number(supply.quantity) <= 0 ? 'border-slate-300 bg-slate-100 text-slate-600' :
                      expiryTone === 'danger' ? 'border-rose-200 bg-rose-100 text-rose-700' :
                      expiryTone === 'warning' ? 'border-amber-200 bg-amber-100 text-amber-700' :
                      'border-emerald-200 bg-emerald-100 text-emerald-700'
                    }`}>
                      {supply.isArchived ? 'Archived' : Number(supply.quantity) <= 0 ? 'Out of Stock' : getExpiryStatusText(supply.expiry_date?.toString() || '')}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className={PRICE_ACTION_BUTTON_CLASS}
                        onClick={() => openSupplyActionModal(medicine, 'updatePrice', supply)}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5-1.343 1.5-3 1.5m0-6V6m0 1.5V16m0 1.5V16m-6.938-4a9 9 0 1113.876 0" />
                        </svg>
                        Price
                      </button>
                      <button
                        type="button"
                        className={ADJUST_ACTION_BUTTON_CLASS}
                        onClick={() => openSupplyActionModal(medicine, 'adjust', supply)}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a7 7 0 100 14 7 7 0 000-14zm0 0v3m0 0L9 5.5M11 7l2-1.5M4 20l3.5-3.5" />
                        </svg>
                        Adjust
                      </button>
                      {supply.isArchived && (
                        <button
                          type="button"
                          className={UNARCHIVE_ACTION_BUTTON_CLASS}
                          onClick={() => {
                            const restore = medicine.isArchived
                              ? onArchiveMedicine(medicine.id, false, `Unarchived batch ${supply.batch_number || supply.id}`)
                              : onArchiveSupply(supply.id, `Unarchived batch ${supply.batch_number || supply.id}`);
                            void restore.then((success) => {
                              if (!success) return;
                              setViewChildDetails(null);
                              setExpandedVariantId(null);
                              setViewMotherProduct(null);
                            });
                          }}
                        >
                          ↩ Unarchive
                        </button>
                      )}
                      {getExpiryDays(supply.expiry_date?.toString() || '') !== null &&
                        getExpiryDays(supply.expiry_date?.toString() || '')! <= 0 &&
                        !supply.isArchived && !medicine.isArchived && (
                        <button
                          type="button"
                          className={ARCHIVE_EXPIRED_BUTTON_CLASS}
                          onClick={() => { void onArchiveSupply(supply.id, `Archived expired batch ${supply.batch_number || supply.id}`); }}
                        >
                          Archive Expired
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-3">
        <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => openSupplyActionModal(medicine, 'add')}>
          Add Supply
        </button>
        <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => {
          setViewChildDetails(null);
          setExpandedVariantId(null);
        }}>
          Close
        </button>
      </div>
    </div>
  );

  return (
    <section className="relative min-w-0 space-y-6 overflow-hidden rounded-3xl border-2 border-slate-200 bg-gradient-to-br from-white via-white to-slate-50/70 p-4 shadow-[0_2px_0_0_rgba(148,163,184,0.5),0_20px_40px_-12px_rgba(15,23,42,0.15)] sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-500" />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-5 border-b-2 border-slate-100">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 h-10 w-1.5 rounded-full bg-gradient-to-b from-emerald-500 via-sky-500 to-emerald-500 shrink-0" />
          <div className="space-y-1">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Inventory Management</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Medicine Inventory</h3>
            <p className="text-sm text-slate-500 max-w-2xl">
              {isStaffView
                ? `Assigned responsibility: ${(assignedCategory || '').trim() || 'Waiting for admin assignment'}`
                : 'Manage product variants, stock levels, and expiry dates efficiently.'}
            </p>
          </div>
        </div>
        {!isAddingMode && (
          <div className="flex w-full flex-wrap gap-3 shrink-0 sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setPromoMedicine(null);
                setShowPromoProductChooser(false);
                setShowPromoPicker(true);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-600/80 bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-3 text-sm font-bold text-white shadow-[0_2px_0_0_rgba(180,83,9,0.9),0_8px_16px_-4px_rgba(217,119,6,0.5)] transition-all hover:from-amber-300 hover:to-amber-400 hover:shadow-[0_2px_0_0_rgba(180,83,9,0.9),0_10px_20px_-4px_rgba(217,119,6,0.6)] active:translate-y-[1px] active:shadow-[0_0px_0_0_rgba(180,83,9,0.9)] sm:flex-none sm:px-5"
            >
              Add Promo
            </button>

            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-700/80 bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-[0_2px_0_0_rgba(4,120,87,0.9),0_8px_16px_-4px_rgba(5,150,105,0.5)] transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-[0_2px_0_0_rgba(4,120,87,0.9),0_10px_20px_-4px_rgba(5,150,105,0.6)] active:translate-y-[1px] active:shadow-[0_0px_0_0_rgba(4,120,87,0.9)] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-6"
              onClick={onStartAddItem}
              disabled={!hasStaffAssignment}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Medicine
            </button>
          </div>
        )}
      </div>

      {isStaffView && !hasStaffAssignment && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50/80 to-white px-5 py-4 text-sm font-bold text-amber-800 shadow-[0_2px_0_0_rgba(251,191,36,0.4)]">
          <span className="sr-only">Warning</span>
          <span>Your inventory responsibility has not been assigned yet. Ask the admin to assign your medicine category.</span>
        </div>
      )}

      {/* Add Medicine Modal - 5-step modal */}
      {isAddingMode && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="add-medicine-title" className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[1.5rem] border-2 border-emerald-300/60 bg-white shadow-2xl shadow-slate-950/40 animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-700/80 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/80 px-6 py-5 text-white backdrop-blur-sm">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-emerald-600">Add Medicine</p>
                <h3 id="add-medicine-title" className="mt-0.5 text-xl font-black tracking-tight text-white">New medicine record</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Step {addModalStep} of 5</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div key={step} className={`h-1.5 w-6 rounded-full transition-all ${step <= addModalStep ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { onCancelAddItem(); setAddModalStep(1); setAddModalError(''); }}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                  aria-label="Close add medicine dialog"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-4 p-6">
              {(addModalError || addItemError) && (
                <div className="flex items-center gap-3 rounded-xl border-2 border-rose-200 bg-rose-50/80 p-4 text-sm font-semibold text-rose-700 shadow-[0_2px_0_0_rgba(244,63,94,0.35)]">
                  <span className="sr-only">Warning</span>
                  {addModalError || addItemError}
                </div>
              )}

              {/* STEP 1: Medicine Form */}
              {addModalStep === 1 && (
                <div className={`rounded-2xl border-2 p-5 transition-all duration-300 ${newItemDosageForm ? 'border-emerald-200 bg-emerald-50/50 shadow-[0_2px_0_0_rgba(16,185,129,0.4)]' : 'border-slate-200 bg-white shadow-[0_2px_0_0_rgba(148,163,184,0.4)]'}`}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${newItemDosageForm ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
                        {newItemDosageForm ? 'Complete' : '1'}
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-700">Step 1</p>
                        <h4 className="text-base font-black text-slate-950">Select Medicine Form</h4>
                      </div>
                    </div>
                    {newItemDosageForm && (
                      <span className="rounded-full border-2 border-emerald-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 shadow-[0_2px_0_0_rgba(16,185,129,0.4)]">
                        Completed
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {DOSAGE_FORMS.map((form) => (
                      <button
                        key={form}
                        type="button"
                        onClick={() => handleFormSelect(form)}
                        aria-pressed={newItemDosageForm === form}
                        className={`min-h-10 rounded-xl border-2 px-4 py-2.5 text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-100 active:translate-y-[1px] ${
                          newItemDosageForm === form
                            ? 'border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_2px_0_0_rgba(4,120,87,0.9),0_6px_12px_-4px_rgba(5,150,105,0.55)]'
                            : 'border-slate-200 bg-white text-slate-700 shadow-[0_2px_0_0_rgba(148,163,184,0.5)] hover:from-emerald-50 hover:to-white hover:border-emerald-200'
                        }`}
                      >
                        {form}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: Classification */}
              {addModalStep === 2 && (
                <div className="animate-in slide-in-from-top-2 duration-200 rounded-2xl border-2 border-sky-200 bg-white p-5 shadow-[0_2px_0_0_rgba(14,165,233,0.4)] transition-all duration-300">
                  <div className="mb-4 flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${newItemClassification ? 'bg-sky-600 text-white' : 'bg-slate-900 text-white'}`}>
                      {newItemClassification ? 'Complete' : '2'}
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-700">Step 2</p>
                      <h4 className="text-base font-black text-slate-950">Medicine Classification</h4>
                      <p className="text-xs text-slate-500 font-medium">Select the type of medicine</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {CLASSIFICATIONS.map((classification) => (
                      <button
                        key={classification}
                        type="button"
                        onClick={() => onNewItemChange('classification', classification)}
                        aria-pressed={newItemClassification === classification}
                        className={`min-h-10 rounded-xl border-2 px-4 py-2.5 text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-sky-100 active:translate-y-[1px] ${
                          newItemClassification === classification
                            ? 'border-sky-600 bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-[0_2px_0_0_rgba(3,105,161,0.9),0_6px_12px_-4px_rgba(14,165,233,0.55)]'
                            : 'border-slate-200 bg-white text-slate-700 shadow-[0_2px_0_0_rgba(148,163,184,0.5)] hover:border-sky-200 hover:from-sky-50 hover:to-white'
                        }`}
                      >
                        {classification}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: Product Information */}
              {addModalStep === 3 && (
                <div className="animate-in slide-in-from-top-2 duration-200 rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-[0_2px_0_0_rgba(148,163,184,0.4)] transition-all duration-300">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">3</div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Step 3</p>
                      <h4 className="text-base font-black text-slate-950">Product Information</h4>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Medicine Name */}
                    <label className="grid gap-1.5">
                      <span className="flex items-center gap-2">
                        <span className={FIELD_LABEL_CLASS}>Medicine / Product Name</span>
                        <span className={REQUIRED_BADGE_CLASS}>Required</span>
                      </span>
                      <input
                        className={INPUT_CLASS}
                        placeholder={newItemDosageForm === 'Medical Supply' || newItemDosageForm === 'Medical Device'
                          ? 'e.g. Facemask, Alcohol, BP Apparatus'
                          : 'e.g. Amoxicillin'}
                        value={newItemName}
                        onChange={(e) => onNewItemChange('name', e.target.value)}
                        aria-invalid={!!missingRequiredFields.find(f => f === 'Medicine Name')}
                      />
                      <p className={`text-xs font-medium ${missingRequiredFields.find((f) => f === 'Medicine Name') ? 'text-rose-600' : 'text-slate-400'}`}>
                        {missingRequiredFields.find((f) => f === 'Medicine Name') ? 'Product name is required.' : 'Enter the full product name.'}
                      </p>
                    </label>

                    {/* Category */}
                    <label className="grid gap-1.5">
                      <span className="flex items-center gap-2">
                        <span className={FIELD_LABEL_CLASS}>Category</span>
                        <span className={REQUIRED_BADGE_CLASS}>Required</span>
                      </span>
                      <select
                        className={INPUT_CLASS}
                        value={newItemCategory}
                        onChange={(e) => onNewItemChange('category', e.target.value)}
                      >
                        <option value="">Select category...</option>
                        <option value="PPE">PPE</option>
                        <option value="Surgical">Surgical</option>
                        <option value="Diagnostic">Diagnostic</option>
                        <option value="First Aid">First Aid</option>
                        <option value="Others">Others</option>
                        {addCategoryOptions.filter(cat =>
                          !['Medical Supplies', 'Medical Devices', 'PPE', 'Surgical', 'Diagnostic', 'First Aid'].includes(cat)
                        ).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {isStaffView && assignedCategories.length > 0 && (
                        <p className="text-[10px] text-slate-400 font-medium">Only categories assigned to you are shown here.</p>
                      )}
                    </label>

                    {/* Dosage / Strength OR Product Type */}
                    {!isNonMedicineDosageForm(newItemDosageForm) && (
                      <div className={`rounded-xl border-2 p-4 ${
                        newItemDosageForm === 'Medical Supply' || newItemDosageForm === 'Medical Device'
                          ? 'border-emerald-200 bg-emerald-50/50 shadow-[0_2px_0_0_rgba(16,185,129,0.35)]'
                          : 'border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-[0_2px_0_0_rgba(99,102,241,0.25)]'
                      }`}>
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] ${
                            newItemDosageForm === 'Medical Supply' || newItemDosageForm === 'Medical Device'
                              ? 'text-emerald-700'
                              : 'text-indigo-700'
                          }">
                            {newItemDosageForm === 'Medical Supply' || newItemDosageForm === 'Medical Device'
                              ? 'Product Type / Description'
                              : 'Dosage / Strength'}
                          </p>
                          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-2 ring-slate-200 shadow-[0_2px_0_0_rgba(148,163,184,0.4)]">
                            <span className="text-slate-400">Unit:</span>
                            <span>{inferredUnitType}</span>
                          </div>
                        </div>

                        {newItemDosageForm !== 'Medical Supply' &&
                          newItemDosageForm !== 'Medical Device' && (
                          <>
                            <div className="flex flex-wrap gap-2">
                              {dosagePresetOptions.map(preset => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => handleDosageSelect(preset)}
                                  disabled={isExistingVariant(preset)}
                                  title={isExistingVariant(preset) ? 'Already exists — add stock from Inventory instead' : undefined}
                                  className={`rounded-full border-2 px-4 py-1.5 text-xs font-bold transition-all active:translate-y-[1px] ${
                                    isExistingVariant(preset)
                                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through'
                                      : dosageValue === preset
                                      ? 'border-indigo-600 bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_2px_0_0_rgba(67,56,202,0.9),0_6px_12px_-4px_rgba(99,102,241,0.5)]'
                                      : 'border-slate-200 bg-white text-slate-700 shadow-[0_2px_0_0_rgba(148,163,184,0.4)] hover:border-indigo-200 hover:bg-indigo-50'
                                  }`}
                                >
                                  {preset}{isExistingVariant(preset) ? ' · Exists' : ''}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => { setShowCustomDosage(true); onNewItemChange('strength', ''); }}
                                className={`rounded-full border-2 border-dashed px-4 py-1.5 text-xs font-bold transition-all active:translate-y-[1px] ${
                                  showCustomDosage ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-[0_2px_0_0_rgba(99,102,241,0.3)]' : 'border-slate-300 text-slate-500 shadow-[0_2px_0_0_rgba(148,163,184,0.3)] hover:border-slate-400'
                                }`}
                              >
                                + Custom
                              </button>
                            </div>
                            {(showCustomDosage || newItemDosageForm === 'Other' || !dosagePresetOptions.length) && (
                              <label className="mt-3 grid gap-1.5">
                                <span className={FIELD_LABEL_CLASS}>
                                  {newItemDosageForm === 'Other' ? 'Strength (optional)' : 'Strength'}
                                  {newItemDosageForm !== 'Other' && <span className="text-rose-600"> *</span>}
                                </span>
                                <input
                                  className={INPUT_CLASS}
                                  value={newItemStrength}
                                  onChange={(e) => onNewItemChange('strength', e.target.value)}
                                  placeholder={newItemDosageForm === 'Other' ? 'Optional — leave blank if not applicable' : 'e.g. 500mg, 100mg/5mL, or 1%'}
                                />
                              </label>
                            )}
                            {usesVolumeDosage && (
                              <div className="mt-4 border-t border-indigo-100 pt-3">
                                <p className={FIELD_LABEL_CLASS}>Volume <span className="text-rose-600">*</span></p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {volumePresetOptions.map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => handleVolumeSelect(preset)}
                                      className={`rounded-full border-2 px-4 py-1.5 text-xs font-bold transition-all active:translate-y-[1px] ${
                                        newItemVolume === preset
                                          ? 'border-sky-600 bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-[0_2px_0_0_rgba(3,105,161,0.9),0_6px_12px_-4px_rgba(14,165,233,0.5)]'
                                          : 'border-slate-200 bg-white text-slate-700 shadow-[0_2px_0_0_rgba(148,163,184,0.4)] hover:border-sky-200 hover:bg-sky-50'
                                      }`}
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>
                                <input
                                  className={`${INPUT_CLASS} mt-3`}
                                  value={newItemVolume}
                                  onChange={(e) => onNewItemChange('volume', e.target.value)}
                                  placeholder="e.g. 60mL"
                                />
                              </div>
                            )}
                          </>
                        )}

                        {/* Medical Supplies */}
                        {newItemDosageForm === 'Medical Supply' && (
                          <div>
                            <label className="grid gap-1.5">
                              <span className={FIELD_LABEL_CLASS}>Supply Type</span>
                              <select
                                className={INPUT_CLASS}
                                value={dosageValue || ''}
                                onChange={(e) => onNewItemChange('strength', e.target.value)}
                              >
                                <option value="">Select supply type...</option>
                                {DOSAGE_PRESETS['Medical Supply'].map((item) => (
                                  <option key={item} value={item}>{item}</option>
                                ))}
                                <option value="Other">Other (type below)</option>
                              </select>
                            </label>
                            {dosageValue === 'Other' && (
                              <label className="mt-3 grid gap-1.5">
                                <span className={FIELD_LABEL_CLASS}>Custom Supply Type</span>
                                <input
                                  className={INPUT_CLASS}
                                  placeholder="e.g. Surgical Tape, Plaster, etc."
                                  onChange={(e) => onNewItemChange('strength', e.target.value)}
                                />
                              </label>
                            )}
                            <p className="mt-2 text-[10px] font-medium text-slate-400">
                              Examples: Facemask, Alcohol, Cotton, Bandage, Gauze, Gloves, Syringe, IV Set
                            </p>
                          </div>
                        )}

                        {/* Medical Devices */}
                        {newItemDosageForm === 'Medical Device' && (
                          <div>
                            <label className="grid gap-1.5">
                              <span className={FIELD_LABEL_CLASS}>Device Type</span>
                              <select
                                className={INPUT_CLASS}
                                value={dosageValue || ''}
                                onChange={(e) => onNewItemChange('strength', e.target.value)}
                              >
                                <option value="">Select device type...</option>
                                {DOSAGE_PRESETS['Medical Device'].map((item) => (
                                  <option key={item} value={item}>{item}</option>
                                ))}
                                <option value="Other">Other (type below)</option>
                              </select>
                            </label>
                            {dosageValue === 'Other' && (
                              <label className="mt-3 grid gap-1.5">
                                <span className={FIELD_LABEL_CLASS}>Custom Device Type</span>
                                <input
                                  className={INPUT_CLASS}
                                  placeholder="e.g. Pulse Oximeter, etc."
                                  onChange={(e) => onNewItemChange('strength', e.target.value)}
                                />
                              </label>
                            )}
                            <p className="mt-2 text-[10px] font-medium text-slate-400">
                              Examples: BP Apparatus, Thermometer, Stethoscope, Nebulizer, Oximeter
                            </p>
                          </div>
                        )}

                      </div>
                    )}

                    {/* Non-medicine products can still have a physical size/volume. */}
                    {isNonMedicineDosageForm(newItemDosageForm) && (
                      <div className="rounded-xl border-2 border-slate-200 bg-slate-50/70 p-4 shadow-[0_2px_0_0_rgba(148,163,184,0.4)]">
                        <label className="grid gap-1.5">
                          <span className={FIELD_LABEL_CLASS}>Volume / Size (optional)</span>
                          <input
                            className={INPUT_CLASS}
                            value={newItemVolume}
                            onChange={(e) => onNewItemChange('volume', e.target.value)}
                            placeholder="e.g. 250mL, 500mL, or 1L"
                          />
                        </label>
                        <p className="mt-2 text-[10px] font-medium text-slate-400">
                          For water and other non-medicine products, enter the container size here. Strength remains blank.
                        </p>
                      </div>
                    )}

                    {/* Manufacturer */}
                    <label className="grid gap-1.5">
                      <span className={FIELD_LABEL_CLASS}>
                        {newItemDosageForm === 'Medical Supply' || newItemDosageForm === 'Medical Device'
                          ? 'Brand / Manufacturer'
                          : 'Manufacturer'}
                      </span>
                      <input
                        className={INPUT_CLASS}
                        value={newItemManufacturer || ''}
                        onChange={(e) => onNewItemChange('manufacturer', e.target.value)}
                        placeholder={newItemDosageForm === 'Medical Supply' || newItemDosageForm === 'Medical Device'
                          ? 'e.g. 3M, BD, Medtronic'
                          : 'e.g. Pfizer, Inc.'}
                      />
                    </label>

                    {/* Supplier */}
                    <label className="grid gap-1.5">
                      <span className={FIELD_LABEL_CLASS}>Supplier</span>
                      <input
                        className={INPUT_CLASS}
                        value={newItemSupplier}
                        onChange={(e) => onNewItemChange('supplier', e.target.value)}
                        placeholder="e.g. PharmaCorp Supplies"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 4: Inventory Information */}
              {addModalStep === 4 && (
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-[0_2px_0_0_rgba(148,163,184,0.4)]">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">4</div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Step 4</p>
                      <h4 className="text-base font-black text-slate-950">Inventory Information</h4>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-4 shadow-[0_2px_0_0_rgba(16,185,129,0.35)]">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Stock unit setup</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">Connect the quantity, purchase unit, and conversion factor.</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200 shadow-[0_2px_0_0_rgba(16,185,129,0.35)]">
                          Base stock conversion
                        </span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-1.5">
                          <span className="flex items-center gap-2">
                            <span className={FIELD_LABEL_CLASS}>Opening Stock</span>
                            <span className={REQUIRED_BADGE_CLASS}>Required</span>
                          </span>
                          <input
                            className={INPUT_CLASS}
                            type="number"
                            min="0"
                            value={newItemStock}
                            onChange={(e) => onNewItemChange('stock', e.target.value)}
                            aria-invalid={!!missingRequiredFields.find(f => f === 'Opening Stock')}
                            placeholder="0"
                          />
                          <span className="text-[10px] font-medium text-slate-400">
                            Quantity received in {PURCHASE_UNIT_LABELS[newItemUnitType || 'pcs'] || 'purchase units'}.
                          </span>
                        </label>

                        <label className="grid gap-1.5">
                          <span className={FIELD_LABEL_CLASS}>Purchase Unit</span>
                          <select
                            className={INPUT_CLASS}
                            value={newItemUnitType || 'pcs'}
                            onChange={(e) => handleUnitSelect(e.target.value)}
                          >
                            {purchaseUnitOptions.map((unit) => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                          <span className="text-[10px] font-medium text-slate-400">Choose the unit used when purchasing this medicine.</span>
                        </label>

                        <label className="grid gap-1.5 sm:col-span-2">
                          <span className="flex items-center gap-2">
                            <span className={FIELD_LABEL_CLASS}>Conversion Factor</span>
                            <span className={REQUIRED_BADGE_CLASS}>Required</span>
                          </span>
                          <input
                            className={INPUT_CLASS}
                            type="number"
                            min="1"
                            step="1"
                            value={newItemConversionFactor || '1'}
                            onChange={(e) => onNewItemChange('conversionFactor', e.target.value)}
                            placeholder="100"
                          />
                          <p className="text-[10px] font-medium text-slate-400">
                            {UOM_GUIDANCE[newItemUnitType || 'pcs']?.example || 'Choose a unit and enter how many base units it contains.'}
                          </p>
                          <div className="mt-2 rounded-xl border-2 border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800 shadow-[0_2px_0_0_rgba(16,185,129,0.35)]">
                            {newItemStock || '0'} {PURCHASE_UNIT_LABELS[newItemUnitType || 'pcs'] || 'units'} × {newItemConversionFactor || '1'} = {Number(newItemStock || 0) * Math.max(1, Number(newItemConversionFactor) || 1)} base units
                          </div>
                        </label>
                      </div>
                    </div>

                    <label className="grid gap-1.5">
                      <span className="flex items-center gap-2">
                        <span className={FIELD_LABEL_CLASS}>Low Stock Alert</span>
                        <span className={REQUIRED_BADGE_CLASS}>Required</span>
                      </span>
                      <input
                        className={INPUT_CLASS}
                        type="number"
                        min="0"
                        value={newItemReorderLevel}
                        onChange={(e) => onNewItemChange('reorderLevel', e.target.value)}
                        aria-invalid={!!missingRequiredFields.find(f => f === 'Low Stock Alert')}
                        placeholder="10"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className={FIELD_LABEL_CLASS}>Selling Price</span>
                      <input
                        className={INPUT_CLASS}
                        type="number"
                        step="0.01"
                        value={newItemSellingPrice || ''}
                        onChange={(e) => onNewItemChange('sellingPrice', e.target.value)}
                        placeholder="Required"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 5: Batch Information */}
              {addModalStep === 5 && (
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-[0_2px_0_0_rgba(148,163,184,0.4)]">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">5</div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Step 5</p>
                      <h4 className="text-base font-black text-slate-950">Batch Information</h4>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 sm:col-span-2">
                      <span className="flex items-center gap-2">
                        <span className={FIELD_LABEL_CLASS}>Lot Number</span>
                        <span className={REQUIRED_BADGE_CLASS}>Required</span>
                      </span>
                      <input
                        className={INPUT_CLASS}
                        value={newItemLotNumber || ''}
                        onChange={(e) => onNewItemChange('lotNumber', e.target.value)}
                        aria-invalid={!!missingRequiredFields.find(f => f === 'Lot Number')}
                        placeholder="e.g. BATCH-001"
                      />
                    </label>

                    <label className="grid gap-1.5">
                      <span className={FIELD_LABEL_CLASS}>Date Received</span>
                      <input
                        className={INPUT_CLASS}
                        type="date"
                        value={newItemReceivedDate || ''}
                        onChange={(e) => onNewItemChange('receivedDate', e.target.value)}
                        aria-invalid={!!missingRequiredFields.find(f => f === 'Date Received')}
                      />
                    </label>

                    <label className="grid gap-1.5">
                      <span className="flex items-center gap-2">
                        <span className={FIELD_LABEL_CLASS}>Actual Expiry Date</span>
                        <span className={REQUIRED_BADGE_CLASS}>Required</span>
                      </span>
                      <input
                        className={INPUT_CLASS}
                        type="date"
                        value={newItemExpiry}
                        min={newItemReceivedDate || undefined}
                        onChange={(e) => onNewItemChange('expiry', e.target.value)}
                        title="Defaults from Shelf Life, but can be changed to the date printed on the batch"
                        aria-invalid={!!missingRequiredFields.find(f => f === 'Expiry Date')}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between border-t-2 border-slate-100 pt-5">
                <div>
                  {addModalStep > 1 && (
                    <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={handlePrev}>
                      ← Previous
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={SECONDARY_BUTTON_CLASS}
                    onClick={() => { onCancelAddItem(); setAddModalStep(1); setAddModalError(''); }}
                    disabled={addingItem}
                  >
                    Cancel
                  </button>
                  {addModalStep < 5 ? (
                    <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={handleNext}>
                      Next →
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={PRIMARY_BUTTON_CLASS}
                      onClick={handleSaveMedicine}
                      disabled={addingItem}
                    >
                      {addingItem ? 'Saving...' : 'Save Medicine'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Inventory Table & Filters */}
      <div className="rounded-3xl border-2 border-slate-200/80 bg-white shadow-[0_2px_0_0_rgba(148,163,184,0.5),0_20px_40px_-12px_rgba(15,23,42,0.15)] overflow-hidden">
        {/* Filter Toggle Header */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center h-9 w-9 rounded-xl border-2 border-slate-200 bg-white shadow-[0_2px_0_0_rgba(148,163,184,0.5)] hover:bg-slate-100 transition-all text-slate-600 active:translate-y-[1px]"
              aria-label={showFilters ? 'Hide filters' : 'Show filters'}
            >
              <svg className={`h-5 w-5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <span className="text-sm font-black text-slate-800">Find inventory</span>
            {isFilterActive && (
              <span className="inline-flex h-6 items-center rounded-full bg-emerald-100 px-3 text-[10px] font-black text-emerald-700 border border-emerald-200">
                Active
              </span>
            )}
          </div>
          <button
            type="button"
            className="rounded-xl border-2 border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 shadow-[0_2px_0_0_rgba(148,163,184,0.5)] transition-all hover:bg-slate-100 hover:text-slate-900 active:translate-y-[1px] disabled:opacity-50"
            onClick={clearFilters}
            disabled={!isFilterActive}
          >
            Reset All
          </button>
          <button
            type="button"
            onClick={() => void openArchivedMedicines()}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-[0_2px_0_0_rgba(148,163,184,0.5)] transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:translate-y-[1px]"
          >
            <span aria-hidden="true" className="sr-only">Archive</span>
            Archived Medicines
            {archivedBatches.length > 0 && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700">
                {archivedBatches.length}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="space-y-4 border-b-2 border-slate-100 bg-slate-50/50 p-5">
            <div>
              <label className="grid gap-2">
                <span className="text-xs font-bold text-slate-600">Search products</span>
                <input
                  type="text"
                  placeholder="Search by product name, code, category..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-xs font-bold text-slate-600">Medicine type</span>
                <select
                  value={classificationFilter}
                  onChange={(e) => setClassificationFilter(e.target.value as any)}
                  className={INPUT_CLASS}
                >
                  <option value="all">All Classifications</option>
                  <option value="generic">Generic</option>
                  <option value="branded">Branded</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold text-slate-600">Stock status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    const val = event.target.value as any;
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                  className={INPUT_CLASS}
                >
                  <option value="all">All Status</option>
                  <option value="critical_stock">Critical Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="expiring_soon">Expiring Soon</option>
                  <option value="expired">Expired</option>
                  <option value="healthy">Healthy</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold text-slate-600">Category</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="all">All Categories</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {/* Mother Products Table */}
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-emerald-800 text-xs uppercase tracking-widest text-white shadow-lg">
              <tr>
                <th className="px-4 py-3.5 text-left font-bold">Code</th>
                <th className="px-4 py-3.5 text-left font-bold">Product</th>
                <th className="px-4 py-3.5 text-left font-bold">Stock status</th>
                <th className="px-4 py-3.5 text-left font-bold">Type</th>
                <th className="px-4 py-3.5 text-center font-bold">Variants</th>
                <th className="px-4 py-3.5 text-center font-bold">Available stock</th>
                <th className="px-4 py-3.5 text-center font-bold">Batches</th>
                <th className="px-4 py-3.5 text-left font-bold">Earliest expiry</th>
                <th className="px-4 py-3.5 text-center font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedMothers.map((mother) => {
                const status = getMotherStatus(mother);
                const expiryTone = getExpiryTone(mother.nearestExpiry);

                return (
                  <tr
                    key={mother.id}
                    className="align-middle transition-all border-b border-slate-200/50 odd:bg-white even:bg-slate-50/60 hover:bg-sky-50/40"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-lg border-2 border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-sky-700 font-mono shadow-[0_2px_0_0_rgba(14,165,233,0.3)]">
                        {mother.productCode}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-900 text-base">{mother.name}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          {mother.dosage_form && (
                            <span className="text-[10px] text-slate-400 font-medium">{mother.dosage_form}</span>
                          )}
                          {mother.manufacturer && (
                            <span className="text-[10px] text-slate-400 font-medium">• {mother.manufacturer}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1 text-[11px] font-black tracking-wide ${
                          status.tone === 'danger'
                            ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-[0_2px_0_0_rgba(244,63,94,0.35)]'
                            : status.tone === 'warning'
                              ? 'border-amber-300 bg-amber-50 text-amber-700 shadow-[0_2px_0_0_rgba(245,158,11,0.35)]'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-[0_2px_0_0_rgba(16,185,129,0.35)]'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full inline-block ${
                          status.tone === 'danger' ? 'bg-rose-500 animate-pulse' :
                          status.tone === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        {status.label}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide border-2 ${
                        mother.classification === 'branded'
                          ? 'border-violet-200 bg-violet-50 text-violet-700 shadow-[0_2px_0_0_rgba(139,92,246,0.3)]'
                          : 'border-sky-200 bg-sky-50 text-sky-700 shadow-[0_2px_0_0_rgba(14,165,233,0.3)]'
                      }`}>
                        {mother.classification}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full border-2 border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 shadow-[0_2px_0_0_rgba(99,102,241,0.3)]">
                        {mother.variantCount} variant{mother.variantCount !== 1 ? 's' : ''}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <p className="text-lg font-black text-slate-900">
                        {mother.totalStock.toLocaleString()}
                        <span className="text-[10px] font-normal text-slate-400 block">
                          {getDisplayBaseUnit(mother)}
                          {mother.conversionFactor > 1 && (
                            <span> ({mother.totalPurchaseUnits.toLocaleString()} {PURCHASE_UNIT_LABELS[mother.purchaseUnit] || mother.purchaseUnit})</span>
                          )}
                        </span>
                      </p>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full border-2 border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 shadow-[0_2px_0_0_rgba(148,163,184,0.4)]">
                        {mother.batchCount} batch{mother.batchCount !== 1 ? 'es' : ''}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">{mother.nearestExpiry || 'N/A'}</p>
                        <span className={`inline-block text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-lg border-2 ${
                          expiryTone === 'danger' ? 'border-rose-200 bg-rose-50 text-rose-600 shadow-[0_2px_0_0_rgba(244,63,94,0.3)]' :
                          expiryTone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-600 shadow-[0_2px_0_0_rgba(245,158,11,0.3)]' :
                          'border-emerald-200 bg-emerald-50 text-emerald-600 shadow-[0_2px_0_0_rgba(16,185,129,0.3)]'
                        }`}>
                          {getExpiryStatusText(mother.nearestExpiry)}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-wrap justify-center gap-1.5">
                        <button
                          type="button"
                          className={VIEW_PRODUCT_BUTTON_CLASS}
                          onClick={() => setViewMotherProduct(mother)}
                          title="View product variants"
                        >
                          View Product
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredMotherProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="mx-auto max-w-md rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                      <span className="sr-only">No products</span>
                      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">No Records Found</p>
                      <p className="mt-2 text-base font-extrabold text-slate-900">
                        {medicines.length === 0 ? 'No products have been added yet.' : 'No inventory records matched your current filters.'}
                      </p>
                      <p className="mt-2 text-sm text-slate-500 font-medium">
                        {medicines.length === 0
                          ? 'Use the "Add Medicine" button to create your first product.'
                          : 'Adjust your search terms or clear the filters to see more records.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PROMO LIST SECTION */}
        {showPromoList && (
          <div id="promo-section" className="border-t-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-white p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_2px_0_0_rgba(180,83,9,0.9),0_8px_16px_-4px_rgba(217,119,6,0.5)]">
                <span className="sr-only">Promotion</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">Promo Management</p>
                <h2 className="text-xl font-black text-slate-900">Create Promo for Products</h2>
                <p className="text-xs text-slate-500 mt-0.5">Pumili ng product para gawan ng promo.</p>
              </div>
            </div>

            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Saved Promotions</p>
            {visibleSavedPromos.filter((promo) => medicines.some((medicine) => medicine.id === promo.medicineId)).length === 0 ? (
              <p className="mb-5 rounded-xl bg-white p-4 text-xs font-semibold text-slate-400">Wala pang saved promotions. Gamitin ang Add Promo para gumawa ng bago.</p>
            ) : (
              <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {visibleSavedPromos.map((promo) => {
                  const medicine = medicines.find((item) => item.id === promo.medicineId);
                  if (!medicine) return null;
                  return <div key={promo.medicineId} className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 shadow-[0_2px_0_0_rgba(16,185,129,0.35)]"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-900">{medicine.name}</p><p className="mt-1 text-xs text-slate-500">{promo.discountPercent}% off · Promo price ₱{Number(promo.promoPrice || 0).toFixed(2)}</p><p className="mt-1 text-[11px] font-semibold text-slate-400">{promo.startDate || 'No start date'} → {promo.endDate || 'No end date'}</p></div><Badge tone="emerald">{promo.isActive ? 'Active' : 'Inactive'}</Badge></div><button type="button" onClick={() => openPromoForMedicine(medicine)} className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 shadow-[0_2px_0_0_rgba(16,185,129,0.35)] hover:bg-emerald-100 active:translate-y-[1px]">Customize</button></div>;
                })}
              </div>
            )}
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Recommended Products</p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {promoCandidates.map((medicine) => (
                <div
                  key={medicine.id}
                  className={`rounded-2xl border-2 p-4 transition-all ${
                    promoListTargetId === medicine.id
                      ? 'border-amber-500 bg-amber-50 shadow-[0_2px_0_0_rgba(180,83,9,0.6),0_8px_16px_-4px_rgba(217,119,6,0.5)] ring-2 ring-amber-300'
                      : 'border-slate-200 bg-white shadow-[0_2px_0_0_rgba(148,163,184,0.4)] hover:border-amber-200 hover:shadow-[0_2px_0_0_rgba(245,158,11,0.4),0_8px_16px_-4px_rgba(217,119,6,0.3)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">{medicine.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{medicine.category}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="font-bold text-slate-700">Stock: {medicine.stock}</span>
                        <span className="font-bold text-amber-600">₱{medicine.unitPrice || 0}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openPromoForMedicine(medicine)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-black transition-all active:translate-y-[1px] ${
                        promoMedicine?.id === medicine.id
                          ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-[0_2px_0_0_rgba(180,83,9,0.9)]'
                          : 'bg-amber-100 text-amber-700 shadow-[0_2px_0_0_rgba(245,158,11,0.4)] hover:bg-amber-200'
                      }`}
                    >
                      Customize
                    </button>
                  </div>
                </div>
              ))}
              {promoCandidates.length === 0 && (
                <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                  <p className="text-3xl">&nbsp;</p>
                  <p className="mt-2 text-sm font-black text-slate-700">Walang kailangang i-promote ngayon.</p>
                  <p className="mt-1 text-xs text-slate-400">Products are selected from actual sales movement and current stock.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {totalPages > 0 && (
          <div className="border-t-2 border-slate-100 bg-white px-4 py-5 flex justify-center">
            <Stack spacing={2}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, value) => setCurrentPage(value)}
                color="primary"
                variant="outlined"
                shape="rounded"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontWeight: 700,
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    '&.Mui-selected': {
                      background: '#059669',
                      color: 'white',
                      borderColor: '#059669',
                      '&:hover': {
                        background: '#047857',
                      }
                    }
                  }
                }}
              />
            </Stack>
          </div>
        )}

        {/* Mother Product Details MODAL */}
        {viewMotherProduct && createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-6 sm:py-5">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Product Details</p>
                  <h2 className="mt-1 max-w-[75vw] break-words text-xl font-black text-slate-900 sm:text-2xl">
                    {viewMotherProduct.name}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">
                    Product Code: {viewMotherProduct.productCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewMotherProduct(null);
                    setSelectedChildProduct(null);
                    setShowAddChildForm(false);
                    setViewChildDetails(null);
                  }}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                  aria-label="Close product details"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar sm:p-6">
                {/* Add Child Product Form */}
                {showAddChildForm && (
                  <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5 shadow-[0_2px_0_0_rgba(16,185,129,0.35)]">
                    <h4 className="text-sm font-extrabold text-slate-900 mb-4">
                      Add Variant to {viewMotherProduct.name}
                    </h4>
                    {addModalError && (
                      <div className="mb-4 rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-[0_2px_0_0_rgba(244,63,94,0.35)]">
                        {addModalError}
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Variant/Size</span>
                        <input
                          className={INPUT_CLASS}
                          placeholder="e.g. 200ml"
                          value={childFormData.variantName}
                          onChange={(e) => setChildFormData({...childFormData, variantName: e.target.value})}
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Classification</span>
                        <select
                          className={INPUT_CLASS}
                          value={childFormData.classification}
                          onChange={(e) => setChildFormData({...childFormData, classification: e.target.value})}
                        >
                          {CLASSIFICATIONS.map((classification) => (
                            <option key={classification} value={classification}>{classification}</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Selling Price</span>
                        <input
                          className={INPUT_CLASS}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={childFormData.sellingPrice}
                          onChange={(e) => setChildFormData({...childFormData, sellingPrice: e.target.value})}
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Cost Price</span>
                        <input
                          className={INPUT_CLASS}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={childFormData.costPrice}
                          onChange={(e) => setChildFormData({...childFormData, costPrice: e.target.value})}
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Reorder Level</span>
                        <input
                          className={INPUT_CLASS}
                          type="number"
                          placeholder="10"
                          value={childFormData.reorderLevel}
                          onChange={(e) => setChildFormData({...childFormData, reorderLevel: e.target.value})}
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Initial Stock</span>
                        <input
                          className={INPUT_CLASS}
                          type="number"
                          placeholder="0"
                          value={childFormData.initialStock}
                          onChange={(e) => setChildFormData({...childFormData, initialStock: e.target.value})}
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Lot Number</span>
                        <input
                          className={INPUT_CLASS}
                          placeholder="e.g. BATCH-001"
                          value={childFormData.lotNumber}
                          onChange={(e) => setChildFormData({...childFormData, lotNumber: e.target.value})}
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Expiry Date</span>
                        <input
                          className={INPUT_CLASS}
                          type="date"
                          value={childFormData.expiryDate}
                          onChange={(e) => setChildFormData({...childFormData, expiryDate: e.target.value})}
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Supplier</span>
                        <input
                          className={INPUT_CLASS}
                          placeholder="Supplier name"
                          value={childFormData.supplier}
                          onChange={(e) => setChildFormData({...childFormData, supplier: e.target.value})}
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Date Received</span>
                        <input
                          className={INPUT_CLASS}
                          type="date"
                          value={childFormData.receivedDate}
                          onChange={(e) => setChildFormData({...childFormData, receivedDate: e.target.value})}
                        />
                      </label>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        type="button"
                        className={PRIMARY_BUTTON_CLASS}
                        onClick={handleAddChildProduct}
                      >
                        Save Variant
                      </button>
                      <button
                        type="button"
                        className={SECONDARY_BUTTON_CLASS}
                        onClick={() => setShowAddChildForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Child Products List */}
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                    Product Variants
                  </h4>
                  {viewMotherProduct.children.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                      <span className="sr-only">No variants</span>
                      <p className="text-sm font-semibold text-slate-500">No variants added yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-sm">
                      <table className="w-full text-xs">
                        <thead className="bg-gradient-to-r from-emerald-700 to-emerald-700">
                          <tr>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Product / Variant</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Strength</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Form</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Volume</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Selling Unit</th>
                            <th className="px-3 py-2.5 text-center font-extrabold text-slate-100">Stock</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Status</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Expiry</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Lot Number</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-100">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {groupedViewVariants.map(({ medicine: child, lotCount }) => {
                            const childStatus = getMedicineStatus(child);
                            const strength = extractVariantStrength(child) || '—';
                            const volume = extractVariantVolume(child) || '—';

                            return (
                              <React.Fragment key={child.id}>
                                <tr className="hover:bg-slate-50 transition-all">
                                  <td className="px-3 py-2.5">
                                    <div className="font-extrabold text-slate-900">{viewMotherProduct.name}</div>
                                  </td>
                                  <td className="px-3 py-2.5 font-bold text-indigo-700">{strength}</td>
                                  <td className="px-3 py-2.5 font-semibold text-slate-700">{child.dosage_form || '—'}</td>
                                  <td className="px-3 py-2.5 font-semibold text-slate-700">{volume}</td>
                                  <td className="px-3 py-2.5 font-semibold text-slate-700">{extractSellingUnit(child)}</td>
                                  <td className="px-3 py-2.5 text-center font-extrabold text-slate-900">
                                    {child.stock}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1 text-[11px] font-black tracking-wide ${
                                      childStatus.tone === 'danger'
                                        ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-[0_2px_0_0_rgba(244,63,94,0.35)]'
                                        : childStatus.tone === 'warning'
                                          ? 'border-amber-300 bg-amber-50 text-amber-700 shadow-[0_2px_0_0_rgba(245,158,11,0.35)]'
                                          : 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-[0_2px_0_0_rgba(16,185,129,0.35)]'
                                    }`}>
                                      {childStatus.label}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-600 font-medium">
                                    {child.expiry || 'N/A'}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="text-xs font-bold text-slate-800">
                                      {lotCount === 1
                                        ? formatLotLabel(child.supplies?.[0]?.batch_number)
                                        : `${lotCount} lots`}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex gap-1.5">
                                      <button
                                        type="button"
                                        className={VIEW_PRODUCT_BUTTON_CLASS}
                                        onClick={() => {
                                          const isExpanded = expandedVariantId === child.id;
                                          setExpandedVariantId(isExpanded ? null : child.id);
                                          setViewChildDetails(isExpanded ? null : child);
                                        }}
                                      >
                                        {expandedVariantId === child.id ? 'Hide' : 'View'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {expandedVariantId === child.id && viewChildDetails?.id === child.id && (
                                  <tr>
                                    <td colSpan={10} className="bg-indigo-50/40 p-0">
                                      {renderBatchHistory(child)}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {false && viewChildDetails && (
                  <div className="mt-6 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-5">
                    <h4 className="text-sm font-extrabold text-slate-900 mb-4">
                      {viewChildDetails.name} - Batch History
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gradient-to-r from-slate-100 to-white">
                          <tr>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-700">Batch #</th>
                            <th className="px-3 py-2.5 text-center font-extrabold text-slate-700">Qty</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-700">Received</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-700">Price</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-700">Supplier</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-700">Expiry</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-700">Status</th>
                            <th className="px-3 py-2.5 text-left font-extrabold text-slate-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(buildSupplyRows(viewChildDetails) ?? []).map((supply) => {
                            const expiryTone = getExpiryTone(supply.expiry_date?.toString() || '');
                            const nextFefoSupplyId = getFifoAvailableSupplies(viewChildDetails)[0]?.id;
                            return (
                              <tr key={supply.id} className={`hover:bg-slate-50 transition-all ${supply.isArchived ? 'opacity-60' : ''}`}>
                                <td className="px-3 py-2">
                                  {supply.id === nextFefoSupplyId && (
                                    <span className="mr-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700">FEFO Next</span>
                                  )}
                                  <span className="inline-flex items-center rounded-lg border-2 border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700 font-mono shadow-[0_2px_0_0_rgba(14,165,233,0.3)]">
                                    {supply.batch_number}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center font-extrabold text-slate-900">{supply.quantity}</td>
                                <td className="px-3 py-2 text-slate-600 font-medium">{supply.received_date || '—'}</td>
                                <td className="px-3 py-2 text-slate-900 font-bold">₱{supply.selling_price?.toFixed(2) || '0.00'}</td>
                                <td className="px-3 py-2 text-slate-600">{supply.supplier || '—'}</td>
                                <td className="px-3 py-2">{supply.expiry_date || '—'}</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold border-2 ${
                                    expiryTone === 'danger' ? 'border-rose-200 bg-rose-100 text-rose-700' :
                                    expiryTone === 'warning' ? 'border-amber-200 bg-amber-100 text-amber-700' :
                                    'border-emerald-200 bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {supply.isArchived ? 'Archived' : getExpiryStatusText(supply.expiry_date?.toString() || '')}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    <button
                                      type="button"
                                      className="inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-700 shadow-[0_2px_0_0_rgba(148,163,184,0.5)] transition-all hover:bg-slate-50 active:translate-y-[1px]"
                                      onClick={() => openSupplyActionModal(viewChildDetails, 'updatePrice', supply)}
                                    >
                                      Price
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex items-center justify-center rounded-lg border-2 border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-[0_2px_0_0_rgba(148,163,184,0.5)] transition-all hover:bg-slate-50 active:translate-y-[1px]"
                                      onClick={() => openSupplyActionModal(viewChildDetails, 'adjust', supply)}
                                    >
                                      Adjust
                                    </button>
                                    {supply.isArchived && (
                                      <button
                                        type="button"
                                        className="inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-emerald-200 bg-white px-4 py-2 text-xs font-extrabold text-emerald-700 shadow-[0_2px_0_0_rgba(16,185,129,0.35)] transition-all hover:bg-emerald-50 active:translate-y-[1px]"
                                        onClick={() => {
                                          const restore = viewChildDetails.isArchived
                                            ? onArchiveMedicine(viewChildDetails.id, false, `Unarchived batch ${supply.batch_number || supply.id}`)
                                            : onArchiveSupply(supply.id, `Unarchived batch ${supply.batch_number || supply.id}`);
                                          void restore.then((unarchivedSuccessfully) => {
                                            if (!unarchivedSuccessfully) return;
                                            setViewChildDetails(null);
                                            setViewMotherProduct(null);
                                          });
                                        }}
                                        title="Unarchive medicine"
                                      >
                                        ↩ Unarchive
                                      </button>
                                    )}
                                    {getExpiryDays(supply.expiry_date?.toString() || '') !== null &&
                                      getExpiryDays(supply.expiry_date?.toString() || '')! <= 0 &&
                                      !supply.isArchived &&
                                      !viewChildDetails.isArchived && (
                                      <button
                                        type="button"
                                        className="inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-rose-200 bg-white px-4 py-2 text-xs font-extrabold text-rose-700 shadow-[0_2px_0_0_rgba(244,63,94,0.35)] transition-all hover:bg-rose-50 active:translate-y-[1px]"
                                        onClick={() => {
                                          void onArchiveSupply(supply.id, `Archived expired batch ${supply.batch_number || supply.id}`).then((archivedSuccessfully) => {
                                            if (!archivedSuccessfully) return;
                                          });
                                        }}
                                        title="Archive expired medicine"
                                      >
                                        Archive Expired
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        type="button"
                        className={PRIMARY_BUTTON_CLASS}
                        onClick={() => openSupplyActionModal(viewChildDetails, 'add')}
                      >
                        Add Supply
                      </button>
                      <button
                        type="button"
                        className={SECONDARY_BUTTON_CLASS}
                        onClick={() => setViewChildDetails(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    className={SECONDARY_BUTTON_CLASS}
                    onClick={() => {
                      setViewMotherProduct(null);
                      setSelectedChildProduct(null);
                      setShowAddChildForm(false);
                      setViewChildDetails(null);
                      setExpandedVariantId(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Supply Action Modal - WITH 3D +/- STEPPER */}
{actionModalOpen && selectedChildProduct && createPortal(
  <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="w-full max-w-5xl overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
      
      {/* Modal Header */}
      <div className="border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Supply Action</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          {supplyActionMode === 'add'
            ? 'Add Supply'
            : supplyActionMode === 'updatePrice'
            ? 'Update Batch Price'
            : 'Adjust Batch Quantity'}
        </h2>
        <p className="mt-1 text-sm text-slate-600 font-medium">
          {selectedChildProduct.name}
          {supplyActionMode === 'add'
            ? ' — Add a new supply batch'
            : supplyActionMode === 'updatePrice'
            ? ' — Update the selected batch price'
            : " — Adjust the selected batch's quantity"}
        </p>
      </div>

      {/* Modal Body */}
      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-2">
            {supplyActionMode === 'add' ? (
              /* ─── 3-COLUMN LAYOUT ─── */
              <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                
                {/* Date Received */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Date Received
                  </label>
                  <input
                    type="date"
                    className={`${INPUT_CLASS} mt-1.5`}
                    value={restockReceivedDate}
                    onChange={(e) => {
                      setRestockReceivedDate(e.target.value);
                      setRestockExpiry(calculateShelfLifeExpiry(e.target.value));
                    }}
                  />
                </div>

                {/* Quantity with Stepper */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Quantity
                  </label>
                  <div className="mt-1.5 flex items-stretch overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-[0_2px_0_0_rgba(148,163,184,0.6)]">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() =>
                        setRestockAmount((prev) => {
                          const next = Math.max(0, (parseInt(prev, 10) || 0) - 1);
                          return String(next);
                        })
                      }
                      className={`${STEPPER_BUTTON_CLASS} border-r-2 border-slate-200`}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 text-center text-sm font-black text-slate-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={restockAmount}
                      onChange={(e) => setRestockAmount(e.target.value)}
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() =>
                        setRestockAmount((prev) => String((parseInt(prev, 10) || 0) + 1))
                      }
                      className={`${STEPPER_BUTTON_CLASS} border-l-2 border-slate-200`}
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                    Units to receive
                  </p>
                </div>

                {/* Unit Selector */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Unit
                  </label>
                  <select
                    className={`${INPUT_CLASS} mt-1.5`}
                    value={restockUnit}
                    onChange={(e) => setRestockUnit(e.target.value)}
                  >
                    {getSupplyUnitOptions(selectedChildProduct).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const option = getSupplyUnitOptions(selectedChildProduct).find(
                      (item) => item.value === restockUnit
                    ) || getSupplyUnitOptions(selectedChildProduct)[0];
                    const baseQuantity = Number(restockAmount || 0) * (option?.factor || 1);
                    return (
                      <p className="mt-1.5 text-[10px] font-medium text-emerald-700">
                        = {baseQuantity} base units
                      </p>
                    );
                  })()}
                </div>

                {/* Actual Expiry Date */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Actual Expiry Date
                  </label>
                  <input
                    type="date"
                    className={`${INPUT_CLASS} mt-1.5`}
                    value={restockExpiry}
                    onChange={(e) => setRestockExpiry(e.target.value)}
                    min={restockReceivedDate || undefined}
                    title="Defaults from Shelf Life, but can be changed to the date printed on the batch"
                  />
                  <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                    From Shelf Life — edit if needed
                  </p>
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Supplier
                  </label>
                  <input
                    type="text"
                    className={`${INPUT_CLASS} mt-1.5`}
                    value={restockSupplier}
                    onChange={(e) => setRestockSupplier(e.target.value)}
                    placeholder="Supplier name"
                  />
                  <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                    Who delivered this batch
                  </p>
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Selling Price
                  </label>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      ₱
                    </span>
                    <input
                      type="number"
                      className={`${INPUT_CLASS} pl-8`}
                      value={restockPrice}
                      onChange={(e) => setRestockPrice(e.target.value)}
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                    Price per unit for this batch
                  </p>
                </div>
              </div>
            ) : supplyActionMode === 'updatePrice' ? (
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    New Price
                  </label>
                  <input
                    type="number"
                    className={`${INPUT_CLASS} mt-1.5`}
                    value={actionPrice}
                    onChange={(e) => setActionPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Reason
                  </label>
                  <textarea
                    className={`${INPUT_CLASS} mt-1.5 min-h-[84px] resize-none`}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Optional reason for this price update"
                  />
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Current Batch
                  </p>
                  <p className="mt-1.5 text-sm font-bold text-slate-900">
                    {selectedSupply?.batch_number || 'No batch selected'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Adjustment Type
                  </label>
                  <select
                    className={`${INPUT_CLASS} mt-1.5`}
                    value={adjustmentType}
                    onChange={(e) =>
                      setAdjustmentType(e.target.value as 'damages' | 'expired' | 'count_correction')
                    }
                  >
                    <option value="damages">Damages</option>
                    <option value="expired">Expired</option>
                    <option value="count_correction">Count Correction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    {adjustmentType === 'count_correction'
                      ? 'Final Actual Quantity'
                      : 'Quantity to Deduct'}
                  </label>
                  <input
                    type="number"
                    className={`${INPUT_CLASS} mt-1.5`}
                    value={actionQuantity}
                    onChange={(e) => setActionQuantity(e.target.value)}
                    min="0"
                    placeholder={
                      adjustmentType === 'count_correction'
                        ? 'Final stock count'
                        : 'Units to remove'
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Reason
                  </label>
                  <textarea
                    className={`${INPUT_CLASS} mt-1.5 min-h-[84px] resize-none`}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Optional reason for this adjustment"
                  />
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Current Batch
                  </p>
                  <p className="mt-1.5 text-sm font-bold text-slate-900">
                    {selectedSupply?.batch_number || 'No batch selected'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Batch Summary */}
          <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 text-sm text-slate-700 shadow-[0_2px_0_0_rgba(148,163,184,0.4)]">
            <p className="font-extrabold text-slate-900">Batch Summary</p>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Product</p>
                <p className="mt-1 text-sm font-extrabold text-slate-900">
                  {selectedChildProduct.name}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Batch</p>
                <p className="mt-1 text-sm font-extrabold text-slate-900">
                  {selectedSupply?.batch_number || 'New batch'}
                </p>
              </div>
              {selectedSupply && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    Actual Expiry
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    {selectedSupply.expiry_date || '—'}
                  </p>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    Current Qty
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    {selectedSupply?.quantity ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    Current Price
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    ₱{selectedSupply?.selling_price?.toFixed(2) ?? '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="flex flex-col gap-3 border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          className={`${SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
          onClick={closeSupplyActionModal}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
          disabled={
            (supplyActionMode === 'add' &&
              (parseInt(restockAmount, 10) <= 0 ||
                !restockExpiry ||
                !restockReceivedDate ||
                !restockSupplier.trim() ||
                Number(restockPrice) <= 0)) ||
            (supplyActionMode === 'updatePrice' &&
              (!actionPrice || Number(actionPrice) <= 0)) ||
            (supplyActionMode === 'adjust' &&
              (!actionQuantity || Number(actionQuantity) < 0))
          }
          onClick={() => {
            if (!selectedChildProduct) return;

            if (supplyActionMode === 'add') {
              const qty = parseInt(restockAmount, 10);
              const selectedUnit =
                getSupplyUnitOptions(selectedChildProduct).find(
                  (option) => option.value === restockUnit
                ) || getSupplyUnitOptions(selectedChildProduct)[0];
              const baseQty = qty * (selectedUnit?.factor || 1);
              if (qty > 0 && restockExpiry && restockReceivedDate) {
                onAddSupply(
                  selectedChildProduct.id,
                  baseQty,
                  restockExpiry,
                  restockReceivedDate,
                  restockSupplier.trim(),
                  Number(restockPrice)
                );
                closeSupplyActionModal();
              }
              return;
            }

            if (!selectedSupply) return;

            if (supplyActionMode === 'updatePrice') {
              const price = Number(actionPrice);
              if (!isNaN(price) && price > 0) {
                onUpdateSupplyPrice(selectedSupply.id, price, actionReason || undefined);
                closeSupplyActionModal();
              }
              return;
            }

            if (supplyActionMode === 'adjust') {
              const quantity = Number(actionQuantity);
              if (!isNaN(quantity) && quantity >= 0) {
                onAdjustSupply(
                  selectedSupply.id,
                  quantity,
                  adjustmentType,
                  actionReason || undefined
                );
                closeSupplyActionModal();
              }
            }
          }}
        >
          {supplyActionMode === 'add'
            ? 'Add Supply'
            : supplyActionMode === 'updatePrice'
            ? 'Update Price'
            : adjustmentType === 'count_correction'
            ? 'Correct Count'
            : 'Record Adjustment'}
        </button>
      </div>
    </div>
  </div>,
  document.body
)}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId !== null && createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-sm overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-br from-rose-50 to-white p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-[0_2px_0_0_rgba(244,63,94,0.4)] ring-4 ring-rose-100/50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-slate-900">Confirm Deletion</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed font-medium">
                  Are you sure you want to remove <span className="font-extrabold text-rose-700">{medicines.find(m => m.id === deleteConfirmId)?.name}</span>?
                  <br />
                  <span className="text-rose-600">This action cannot be undone.</span>
                </p>
              </div>
              <div className="flex gap-3 p-6 bg-slate-50">
                <button
                  className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-[0_2px_0_0_rgba(148,163,184,0.5)] transition-all hover:bg-slate-50 active:translate-y-[1px]"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-xl border border-rose-700/80 bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-3 text-sm font-bold text-white shadow-[0_2px_0_0_rgba(159,18,57,0.9),0_6px_12px_-4px_rgba(225,29,72,0.55)] transition-all hover:from-rose-400 hover:to-rose-500 active:translate-y-[1px] active:shadow-[0_0px_0_0_rgba(159,18,57,0.9)]"
                  onClick={() => {
                    if (deleteConfirmId) {
                      onDeleteMedicine(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {showPromoPicker && createPortal(
        <div className="fixed inset-0 z-[280] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true">
          <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">

            {/* Fixed Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-amber-100 bg-gradient-to-r from-amber-50/50 to-white px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
              <div className="flex items-center gap-4">
                <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-3xl text-white shadow-[0_2px_0_0_rgba(180,83,9,0.9),0_8px_16px_-4px_rgba(217,119,6,0.5)] sm:flex" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-600">Promo Management</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Create Promo for Products</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">Pumili ng product para gawan ng promo.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowPromoPicker(false)} className="rounded-xl px-3 py-1 text-3xl text-slate-400 hover:bg-amber-50">×</button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">

              {/* Saved Promotions */}
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Saved Promotions</p>
              {visibleSavedPromos.filter((promo) => medicines.some((medicine) => medicine.id === promo.medicineId)).length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-400">
                  Wala pang saved promotions. Pumili ng product sa ibaba para gumawa ng bago.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {visibleSavedPromos.map((promo) => {
                    const medicine = medicines.find((item) => item.id === promo.medicineId);
                    if (!medicine) return null;
                    return (
                      <div key={promo.medicineId} className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 shadow-[0_2px_0_0_rgba(16,185,129,0.35)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">{medicine.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{promo.discountPercent}% off · Promo price ₱{Number(promo.promoPrice || 0).toFixed(2)}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-400">{promo.startDate || 'No start date'} → {promo.endDate || 'No end date'}</p>
                          </div>
                          <Badge tone="emerald">{promo.isActive ? 'Active' : 'Inactive'}</Badge>
                        </div>
                        <button type="button" onClick={() => openPromoForMedicine(medicine)} className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 shadow-[0_2px_0_0_rgba(16,185,129,0.35)] hover:bg-emerald-100 active:translate-y-[1px]">Edit</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Product Section */}
              <div className="mt-7 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Add Product</p>
                <button type="button" onClick={() => setShowPromoProductChooser((value) => !value)} className="rounded-xl border border-emerald-700/80 bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-black text-white shadow-[0_2px_0_0_rgba(4,120,87,0.9),0_6px_12px_-4px_rgba(5,150,105,0.55)] hover:from-emerald-400 hover:to-emerald-500 active:translate-y-[1px] active:shadow-[0_0px_0_0_rgba(4,120,87,0.9)]">
                  {showPromoProductChooser ? 'Hide Products' : '＋ Add Product'}
                </button>
              </div>

              {showPromoProductChooser && (
                <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {promoChooserMedicines.map((medicine) => {
                    const selectedFromInsights = promoListTargetId === medicine.id;
                    const alreadyPromoted = Boolean(savedPromos[medicine.id]?.isActive && (!savedPromos[medicine.id]?.endDate || savedPromos[medicine.id]?.endDate >= promoToday));
                    return (
                      <div key={medicine.id} className={`rounded-2xl border-2 p-4 transition-all ${selectedFromInsights ? 'border-amber-500 bg-amber-50 shadow-[0_2px_0_0_rgba(180,83,9,0.6),0_8px_16px_-4px_rgba(217,119,6,0.5)] ring-2 ring-amber-300' : 'border-slate-200 bg-white shadow-[0_2px_0_0_rgba(148,163,184,0.4)] hover:border-emerald-200 hover:shadow-[0_2px_0_0_rgba(16,185,129,0.4),0_8px_16px_-4px_rgba(5,150,105,0.3)]'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">{medicine.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{medicine.category}</p>
                            <p className="mt-2 text-xs font-bold text-slate-700">Stock: {medicine.stock} · ₱{Number(medicine.unitPrice || 0).toFixed(2)}</p>
                          </div>
                          {selectedFromInsights && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase text-amber-700 shadow-[0_2px_0_0_rgba(245,158,11,0.4)]">Recommended</span>}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => openPromoForMedicine(medicine)} className="rounded-xl bg-emerald-100 px-2 py-2 text-[11px] font-black text-emerald-700 shadow-[0_2px_0_0_rgba(16,185,129,0.4)] hover:bg-emerald-200 active:translate-y-[1px]">Customize</button>
                          <button type="button" onClick={() => addPromoToPos(medicine)} className="rounded-xl border border-amber-600/80 bg-gradient-to-b from-amber-400 to-amber-500 px-2 py-2 text-[11px] font-black text-white shadow-[0_2px_0_0_rgba(180,83,9,0.9)] hover:from-amber-300 hover:to-amber-400 active:translate-y-[1px]">{alreadyPromoted ? 'Added' : 'Add to POS'}</button>
                        </div>
                      </div>
                    );
                  })}
                  {medicines.length === 0 && (
                    <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                      <p className="text-3xl">&nbsp;</p>
                      <p className="mt-2 text-sm font-black text-slate-700">No inventory products available.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PROMO MODAL */}
      {promoMedicine && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-600">Promo Setup</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">{promoMedicine.name}</h2>
              </div>
              <button type="button" onClick={() => setPromoMedicine(null)} className="rounded-lg px-2 text-2xl text-slate-400 hover:bg-slate-100">×</button>
            </div>

            <div className="mt-5">
              <label className="text-xs font-bold text-slate-600">Discount Percentage</label>
              <select
                value={promoDiscount}
                onChange={(event) => setPromoDiscount(event.target.value)}
                className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-bold text-slate-800 outline-none shadow-[0_2px_0_0_rgba(148,163,184,0.4)] focus:border-amber-500"
              >
                {[5, 10, 15, 20, 25, 30, 50].map((value) => (
                  <option key={value} value={value}>{value}% OFF</option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-slate-600">Start Date</label>
                <input
                  type="date"
                  value={promoStart}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setPromoStart(event.target.value)}
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none shadow-[0_2px_0_0_rgba(148,163,184,0.4)] focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">End Date</label>
                <input
                  type="date"
                  value={promoEnd}
                  min={promoStart || new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setPromoEnd(event.target.value)}
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none shadow-[0_2px_0_0_rgba(148,163,184,0.4)] focus:border-amber-500"
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border-2 border-amber-100 bg-amber-50 p-4 shadow-[0_2px_0_0_rgba(245,158,11,0.35)]">
              <p className="text-xs font-bold text-amber-700">Pricing Preview</p>
              <p className="mt-1 text-sm font-black text-slate-900">
                ₱{(Number(promoMedicine.unitPrice) || 0).toFixed(2)}{' '}
                <span className="text-amber-700">→ ₱{((Number(promoMedicine.unitPrice) || 0) * (1 - (Number(promoDiscount) || 0) / 100)).toFixed(2)}</span>
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {promoDiscount}% off · {promoStart || 'No start date'} to {promoEnd || 'No end date'}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setPromoMedicine(null)} className="rounded-xl border-2 border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 shadow-[0_2px_0_0_rgba(148,163,184,0.5)] hover:bg-slate-50 active:translate-y-[1px]">
                Cancel
              </button>
              <button
                type="button"
                onClick={createPromo}
                disabled={!promoStart || !promoEnd}
                className="rounded-xl border border-amber-600/80 bg-gradient-to-b from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-black text-white shadow-[0_2px_0_0_rgba(180,83,9,0.9),0_6px_12px_-4px_rgba(217,119,6,0.55)] hover:from-amber-300 hover:to-amber-400 active:translate-y-[1px] active:shadow-[0_0px_0_0_rgba(180,83,9,0.9)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {promoSaved ? 'Saved!' : 'Create Promo'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showArchivedModal && createPortal(
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="archived-medicines-title">
          <div className="w-full max-w-2xl rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b-2 border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Medicine Archive</p>
                <h2 id="archived-medicines-title" className="mt-1 text-xl font-black text-slate-900">Archived Medicines</h2>
                <p className="mt-1 text-sm text-slate-500">Only archived batches are shown here. Valid batches remain active.</p>
              </div>
              <button type="button" onClick={() => setShowArchivedModal(false)} className="rounded-lg px-2 text-2xl text-slate-400 hover:bg-slate-100">×</button>
            </div>
            <div className="mt-5 max-h-[55vh] space-y-3 overflow-y-auto">
              {archivedBatches.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 px-5 py-10 text-center text-sm font-semibold text-slate-400">No archived batches.</div>
              ) : archivedBatches.map(({ medicine, supply }) => (
                <div key={`${medicine.id}-${supply.id}`} className="flex items-center justify-between gap-4 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 shadow-[0_2px_0_0_rgba(148,163,184,0.4)]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{medicine.name}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{medicine.category} · Batch {supply.batch_number || supply.id} · Qty {supply.quantity}</p>
                    <p className="mt-1 text-[11px] font-semibold text-rose-600">Expired: {supply.expiry_date || '—'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const restore = medicine.isArchived
                        ? onArchiveMedicine(medicine.id, false, `Unarchived batch ${supply.batch_number || supply.id}`)
                        : onArchiveSupply(supply.id, `Unarchived batch ${supply.batch_number || supply.id}`);
                      void restore;
                    }}
                    className={UNARCHIVE_ACTION_BUTTON_CLASS}
                  >
                    ↩ Unarchive
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setShowArchivedModal(false)} className={SECONDARY_BUTTON_CLASS}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-top-2 {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoom-in-95 {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-in {
          animation-duration: 0.25s;
          animation-fill-mode: both;
        }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-top-2 { animation-name: slide-in-from-top-2; }
        .zoom-in-95 { animation-name: zoom-in-95; }
      `}</style>
    </section>
  );
}
