import React, { useLayoutEffect, useMemo, useState, useEffect } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { CustomerRecord, CustomerType, Medicine, PharmacySettings, ProductSaleEntry, ProductSaleItem, UserRole, DosageFormFilter, CustomPromo } from '../types';
import { createCustomer, findCustomer, getCustomersByType } from '../services/CustomerService';
import { loadCustomPromos } from '../lib/promoStorage';
import Receipt from './Receipt';
import { getFifoAvailableStock, getFifoAvailableSupplies } from '../lib/fifo';
import { getStrengthForDisplay, getVolumeForDisplay } from '../lib/productAttributes';

type ProductTypeFilter = 'all' | 'generic' | 'branded';

type Props = {
  medicines: Medicine[];
  settings?: PharmacySettings;
  onCompleteSale: (items: ProductSaleItem[], cashReceived?: number, changeAmount?: number) => Promise<void>;
  salesTrend: ProductSaleEntry[];
  onModalOpenChange?: (open: boolean) => void;
  userRole?: UserRole;
  assignedCategory?: string | null;
  productTypeFilter: ProductTypeFilter;
  dosageFormFilter: DosageFormFilter;
  onProductTypeFilterChange: (value: ProductTypeFilter) => void;
  onDosageFormFilterChange: (value: DosageFormFilter) => void;
};

type DiscountType = 'none' | 'senior' | 'pwd';
type VariantSelectionAction = 'cart' | 'buy';

const DISCOUNT_OPTIONS: Record<DiscountType, { label: string; description: string; rate: number }> = {
  none: { label: 'No discount', description: 'Standard price, no deductions', rate: 0 },
  senior: { label: 'Senior citizen', description: 'VAT-exempt + 20% discount on VAT-exempt base', rate: 0.20 },
  pwd: { label: 'PWD', description: 'VAT-exempt + 20% discount on VAT-exempt base', rate: 0.20 },
};

const VAT_RATE = 0.12;
const SENIOR_RATE = 0.20;
const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// ─── 3D Button base classes (shared across the POS) ──────────────────────────
const BTN_3D_BASE = `
  relative inline-flex items-center justify-center
  transition-all duration-150 ease-out
  active:translate-y-[2px] active:shadow-none
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0
`;

const BTN_3D_PRIMARY = `
  ${BTN_3D_BASE}
  rounded-xl
  bg-gradient-to-b from-emerald-500 to-emerald-600
  text-white font-bold
  shadow-[0_4px_0_0_#047857,0_6px_12px_-2px_rgba(4,120,87,0.4)]
  hover:from-emerald-400 hover:to-emerald-500
  hover:shadow-[0_4px_0_0_#047857,0_8px_16px_-2px_rgba(4,120,87,0.5)]
  focus-visible:ring-emerald-500
`;

const BTN_3D_SECONDARY = `
  ${BTN_3D_BASE}
  rounded-xl
  bg-gradient-to-b from-white to-slate-50
  text-slate-700 font-bold
  border border-slate-200
  shadow-[0_4px_0_0_#cbd5e1,0_6px_12px_-2px_rgba(15,23,42,0.15)]
  hover:from-slate-50 hover:to-slate-100
  hover:shadow-[0_4px_0_0_#94a3b8,0_8px_16px_-2px_rgba(15,23,42,0.2)]
  focus-visible:ring-slate-400
`;

const BTN_3D_AMBER = `
  ${BTN_3D_BASE}
  rounded-xl
  bg-gradient-to-b from-amber-400 to-amber-500
  text-white font-bold
  border border-amber-300
  shadow-[0_4px_0_0_#b45309,0_6px_12px_-2px_rgba(180,83,9,0.35)]
  hover:from-amber-300 hover:to-amber-400
  hover:shadow-[0_4px_0_0_#b45309,0_8px_16px_-2px_rgba(180,83,9,0.45)]
  focus-visible:ring-amber-400
`;

const BTN_3D_GHOST = `
  ${BTN_3D_BASE}
  rounded-full
  p-2
  text-slate-400
  hover:bg-slate-100 hover:text-slate-600
  focus-visible:ring-slate-400
`;

const BTN_3D_SMALL_ICON = `
  ${BTN_3D_BASE}
  rounded-xl
  border border-slate-200
  bg-gradient-to-b from-white to-slate-50
  text-slate-700
  shadow-[0_3px_0_0_#cbd5e1,0_4px_8px_-2px_rgba(15,23,42,0.15)]
  hover:from-slate-50 hover:to-slate-100
  hover:text-emerald-700
  hover:border-emerald-300
  hover:shadow-[0_3px_0_0_#94a3b8,0_5px_10px_-2px_rgba(15,23,42,0.2)]
  focus-visible:ring-emerald-500
`;

const calculateLinePricing = (unitPrice: number, quantity: number, discountType: DiscountType, promoRate = 0, discountEligible = true) => {
  const originalPrice = roundCurrency(unitPrice * quantity);
  if (discountType === 'senior' || discountType === 'pwd') {
    if (!discountEligible) {
      return { originalPrice, vatExemptBase: 0, vatExemption: 0, seniorDiscount: 0, discountAmount: 0, payable: originalPrice };
    }
    const vatExemptBase = roundCurrency(originalPrice / (1 + VAT_RATE));
    const vatExemption = roundCurrency(originalPrice - vatExemptBase);
    const seniorDiscount = roundCurrency(vatExemptBase * SENIOR_RATE);
    const payable = roundCurrency(vatExemptBase - seniorDiscount);
    return { originalPrice, vatExemptBase, vatExemption, seniorDiscount, discountAmount: roundCurrency(vatExemption + seniorDiscount), payable };
  }

  const rate = Math.max(0, promoRate);
  const discountAmount = roundCurrency(originalPrice * rate);
  return { originalPrice, vatExemptBase: 0, vatExemption: 0, seniorDiscount: 0, discountAmount, payable: roundCurrency(originalPrice - discountAmount) };
};

const DOSAGE_FORMS: { label: string; value: DosageFormFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Tablet', value: 'tablet' },
  { label: 'Capsule', value: 'capsule' },
  { label: 'Syrup', value: 'syrup' },
  { label: 'Suspension', value: 'suspension' },
  { label: 'Injectable', value: 'injectable' },
  { label: 'Cream', value: 'cream' },
  { label: 'Ointment', value: 'ointment' },
  { label: 'Drops', value: 'drops' },
  { label: 'Other', value: 'other' },
  { label: 'Promos', value: 'promo' },
];

type CartRow = {
  medicineId: number;
  groupKey: string;
  name: string;
  category: string;
  classification: string;
  dosageForm?: string;
  unitPrice: number;
  saleUnit: string;
  unitFactor: number;
  quantity: number;
  discountType: DiscountType;
  discountAmount: number;
  rowTotal: number;
  stockBefore: number;
  discountEligible: boolean;
};

type CompletedSale = {
  rows: CartRow[];
  timestamp: Date;
  receiptNo: string;
  cashReceived: number;
  discountType: DiscountType;
  customerType?: 'regular' | 'senior_citizen' | 'pwd';
  customerName?: string;
  customerIdNumber?: string;
  eligibleSubtotal?: number;
  nonEligibleSubtotal?: number;
};

type DeductionAllocation = {
  medicineId: number;
  productName: string;
  batchNumber: string;
  expiryDate?: string;
  quantity: number;
  remainingAfter: number;
};

type ProductGroup = {
  key: string;
  name: string;
  category: string;
  dosageForm: string;
  classification: 'Generic' | 'Branded' | 'Mixed';
  variants: Medicine[];
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  reorderLevel?: number;
};

const formatPeso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value);

const genReceiptNo = () => `RX-${Date.now().toString(36).toUpperCase()}`;
const UNIT_FACTORS: Record<string, number> = { pcs: 1, strip: 10, box: 100, bottle: 100, vial: 1, tube: 1, sachet: 1 };
const isStripMedicine = (medicine: Medicine) => {
  const purchaseUnit = String(medicine.purchaseUnit || medicine.unitType || '').toLowerCase();
  const dosageForm = String(medicine.dosage_form || '').toLowerCase();
  return purchaseUnit === 'strip' || dosageForm === 'tablet' || dosageForm === 'capsule';
};
const getUnitOptions = (medicine: Medicine) => {
  if (!isStripMedicine(medicine)) return [{ label: 'pcs', factor: 1 }];
  const configuredFactor = Number(medicine.conversionFactor) || 0;
  const purchaseUnit = String(medicine.purchaseUnit || medicine.unitType || '').toLowerCase();
  const stripFactor = purchaseUnit === 'box' && configuredFactor >= UNIT_FACTORS.strip
    ? Math.max(1, Math.round(configuredFactor / UNIT_FACTORS.strip))
    : purchaseUnit === 'strip' && configuredFactor > 1
      ? configuredFactor
      : UNIT_FACTORS.strip;
  return [{ label: 'pcs', factor: 1 }, { label: 'strip', factor: stripFactor }, { label: 'box', factor: stripFactor * 10 }];
};

const OTHER_DOSAGE_INDICATORS = ['shampoo', 'facemask', 'soap', 'skincare', 'personal care', 'lotion', 'gel', 'wipes', 'spray', 'powder'];
const normalizeText = (value = '') => value.trim().replace(/\s+/g, ' ').toLowerCase();
const getVariantLabel = (medicine: Medicine) => {
  const value = (medicine.classification || '').toString().trim().toLowerCase();
  return value === 'branded' ? 'Branded' : 'Generic';
};
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const getBaseMedicineName = (medicine: Medicine) => {
  const source = medicine.medicine_name?.trim() || medicine.name;
  const suffixes = [medicine.strength, medicine.volume, medicine.dosage_form]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);

  return suffixes.reduce((value, suffix) =>
    value.replace(new RegExp(`\\s*(?:-|/)??\\s*${escapeRegExp(suffix)}(?=\\s|$)`, 'i'), ''), source)
    .replace(/\s*[-/]\s*$/, '')
    .replace(/\s*-\s*.+$/, '')
    .replace(/\b(generic|branded)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || medicine.name;
};
const getVariantDisplayName = (medicine: Medicine) => {
  const original = medicine.name?.trim() || '';
  const base = getBaseMedicineName(medicine);
  const suffix = getStrengthForDisplay(medicine) || getVolumeForDisplay(medicine) || medicine.dosage_form || '';

  if (!original || original.toLowerCase() === base.toLowerCase()) {
    return suffix ? `${base} - ${suffix}` : base;
  }

  return original;
};
const getGroupKey = (medicine: Medicine) => [
  normalizeText(getBaseMedicineName(medicine)),
  normalizeText(medicine.dosage_form || ''),
  normalizeText(medicine.classification || ''),
].join('|');

const getVariantKey = (medicine: Medicine) => [
  normalizeText(getVariantDisplayName(medicine)),
  normalizeText(medicine.category),
  normalizeText(medicine.dosage_form || ''),
  normalizeText(medicine.classification || ''),
].join('|');

const dedupeVariants = (variants: Medicine[]) => {
  const unique = new Map<string, Medicine>();
  variants.forEach((variant) => {
    const key = getVariantKey(variant);
    const existing = unique.get(key);
    if (!existing || (getFifoAvailableStock(existing) <= 0 && getFifoAvailableStock(variant) > 0) || getFifoAvailableStock(variant) > getFifoAvailableStock(existing)) {
      unique.set(key, variant);
    }
  });
  return Array.from(unique.values());
};

const getGroupClassifications = (group: ProductGroup) =>
  Array.from(new Set(group.variants.map(getVariantLabel)));

export default function ProductPanel({
  medicines,
  settings,
  onCompleteSale,
  salesTrend,
  onModalOpenChange,
  userRole = 'admin',
  assignedCategory,
  productTypeFilter,
  dosageFormFilter,
  onProductTypeFilterChange,
  onDosageFormFilterChange
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [saleUnitByMed, setSaleUnitByMed] = useState<Record<number, string>>({});
  const [unitDialogMedicine, setUnitDialogMedicine] = useState<Medicine | null>(null);
  const [unitDialogAction, setUnitDialogAction] = useState<VariantSelectionAction>('cart');
  const [unitDialogQuantity, setUnitDialogQuantity] = useState(1);
  const [unitDialogSelectedUnit, setUnitDialogSelectedUnit] = useState('pcs');
  const [variantDialogGroup, setVariantDialogGroup] = useState<ProductGroup | null>(null);
  const [variantSelectionAction, setVariantSelectionAction] = useState<VariantSelectionAction>('cart');
  const [cartRows, setCartRows] = useState<CartRow[]>([]);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountType>('none');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [customerCandidate, setCustomerCandidate] = useState<CustomerRecord | null>(null);
  const [registeredCustomers, setRegisteredCustomers] = useState<CustomerRecord[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerDialogType, setCustomerDialogType] = useState<CustomerType | null>(null);
  const [customerIdInput, setCustomerIdInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerDialogError, setCustomerDialogError] = useState('');
  const [customerDialogLoading, setCustomerDialogLoading] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [cashReceivedStr, setCashReceivedStr] = useState('');

  const [customPromos, setCustomPromos] = useState<Record<number, CustomPromo>>(() => loadCustomPromos());

  useEffect(() => {
    const sync = () => setCustomPromos(loadCustomPromos());
    window.addEventListener('five_l_promos_updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('five_l_promos_updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const filteredVariantDialogOptions = useMemo(() => {
    if (!variantDialogGroup) return [];
    return variantDialogGroup.variants
      .filter((variant) => dosageFormFilter !== 'promo' || Boolean(customPromos[variant.id]?.isActive || variant.is_promo))
      .sort((a, b) => {
        const labelA = getVariantDisplayName(a).toLowerCase();
        const labelB = getVariantDisplayName(b).toLowerCase();
        if (labelA !== labelB) return labelA.localeCompare(labelB);
        return (a.unitPrice ?? 0) - (b.unitPrice ?? 0);
      });
  }, [variantDialogGroup, dosageFormFilter, customPromos]);

  const [view, setView] = useState<'products' | 'summary' | 'confirm' | 'deduction' | 'receipt'>('products');
  const [completedSales, setCompletedSales] = useState<CompletedSale[]>([]);
  const [lastReceipt, setLastReceipt] = useState<CompletedSale | null>(null);

  const assignedCategories = useMemo(() =>
    (assignedCategory || '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean),
    [assignedCategory]
  );

  const categoryOptions = useMemo(() => {
    const categories = new Map<string, { name: string; count: number; stock: number }>();

    medicines.forEach((medicine) => {
      const name = medicine.category.trim() || 'Uncategorized';
      const key = name.toLowerCase();
      const current = categories.get(key) || { name, count: 0, stock: 0 };
      categories.set(key, {
        name: current.name,
        count: current.count + 1,
        stock: current.stock + getFifoAvailableStock(medicine),
      });
    });

    let values = Array.from(categories.values());
    if (userRole === 'staff') {
      if (assignedCategories.length === 0) {
        values = [];
      } else {
        values = values.filter((category) => assignedCategories.includes(category.name.toLowerCase()));
      }
    }

    return values.sort((a, b) => a.name.localeCompare(b.name));
  }, [assignedCategories, medicines, userRole]);

  React.useEffect(() => {
    if (selectedCategory === 'all') return;

    const categoryExists = categoryOptions.some((category) => category.name === selectedCategory);
    if (!categoryExists) {
      setSelectedCategory('all');
    }
  }, [categoryOptions, selectedCategory]);

  const isModal = view === 'summary' || view === 'confirm' || view === 'deduction' || view === 'receipt' || Boolean(customerDialogType) || showRegisterModal;
  useLayoutEffect(() => { onModalOpenChange?.(isModal); }, [isModal, onModalOpenChange]);
  useLayoutEffect(() => { return () => { onModalOpenChange?.(false); }; }, [onModalOpenChange]);

  React.useEffect(() => {
    setCartRows(prev => prev.map(row => {
      const customPromo = customPromos[row.medicineId];
      const promoRate = customPromo?.isActive ? customPromo.discountPercent / 100 : 0;
      const effectiveDiscountType = selectedDiscount === 'senior' || selectedDiscount === 'pwd' || promoRate <= 0 ? selectedDiscount : 'promo';
      const pricing = calculateLinePricing(row.unitPrice * row.unitFactor, row.quantity, effectiveDiscountType, promoRate, row.discountEligible);
      return { ...row, discountType: effectiveDiscountType, discountAmount: pricing.discountAmount, rowTotal: pricing.payable };
    }));
  }, [customPromos, selectedDiscount]);

  const isOtherProduct = (medicine: Medicine): boolean => {
    const dosageFormLower = (medicine.dosage_form || '').toLowerCase();
    const nameLower = medicine.name.toLowerCase();
    const categoryLower = medicine.category.toLowerCase();

    const knownForms = ['tablet', 'capsule', 'syrup', 'suspension', 'injectable', 'cream', 'ointment', 'drops'];
    if (knownForms.some(form => dosageFormLower.includes(form))) return false;

    return OTHER_DOSAGE_INDICATORS.some(indicator =>
      nameLower.includes(indicator) || categoryLower.includes(indicator)
    ) || !dosageFormLower;
  };

  // Reuse the existing product classification: therapeutic dosage forms are
  // discount-eligible, while supplies/personal-care items are not.
  const isSeniorPwdEligible = (medicine: Medicine): boolean => {
    const dosageForm = String(medicine.dosage_form || '').trim().toLowerCase();
    const nonTherapeuticForms = new Set(['other', 'others', 'medical supply', 'medical device']);
    return !nonTherapeuticForms.has(dosageForm) && !isOtherProduct(medicine);
  };

  const productGroups = useMemo<ProductGroup[]>(() => {
    const groups = new Map<string, ProductGroup>();

    medicines.forEach((medicine) => {
      const key = getGroupKey(medicine);
      const current = groups.get(key);
      const price = medicine.unitPrice ?? 0;

      if (!current) {
        groups.set(key, {
          key,
          name: getBaseMedicineName(medicine),
          category: medicine.category.trim() || 'Uncategorized',
          dosageForm: medicine.dosage_form || '',
          classification: getVariantLabel(medicine),
          variants: [medicine],
          totalStock: getFifoAvailableStock(medicine),
          minPrice: price,
          maxPrice: price,
          reorderLevel: medicine.reorderLevel,
        });
        return;
      }

      current.variants.push(medicine);
      current.totalStock += getFifoAvailableStock(medicine);
      current.minPrice = Math.min(current.minPrice, price);
      current.maxPrice = Math.max(current.maxPrice, price);
      current.reorderLevel = Math.min(current.reorderLevel ?? medicine.reorderLevel ?? 0, medicine.reorderLevel ?? current.reorderLevel ?? 0);
    });

    return Array.from(groups.values()).map((group) => {
      const uniqueVariants = dedupeVariants(group.variants);
      return {
        ...group,
        classification: uniqueVariants.length > 1 ? 'Mixed' : group.classification,
        variants: uniqueVariants.sort((a, b) => {
        const classCompare = getVariantLabel(a).localeCompare(getVariantLabel(b));
        if (classCompare !== 0) return classCompare;
        return (a.unitPrice ?? 0) - (b.unitPrice ?? 0);
      }),
      };
    });
  }, [medicines]);

  const filteredProductGroups = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return productGroups
      .filter((group) => {
        const categoryName = group.category;
        const matchesCategory =
          selectedCategory === 'all' || group.variants.some((medicine) => medicine.category.trim() === selectedCategory);

        const matchesStaffCategory =
          userRole !== 'staff' ||
          (assignedCategories.length > 0 && group.variants.some((medicine) => assignedCategories.includes(medicine.category.trim().toLowerCase())));

        let matchesDosageForm = false;
        if (dosageFormFilter === 'all') {
          matchesDosageForm = true;
        } else if (dosageFormFilter === 'other') {
          matchesDosageForm = group.variants.some(isOtherProduct);
        } else if (dosageFormFilter === 'promo') {
          matchesDosageForm = group.variants.some((m) => Boolean((customPromos[m.id] && customPromos[m.id].isActive) || m.is_promo));
        } else {
          matchesDosageForm = group.variants.some((medicine) => (medicine.dosage_form || '').toLowerCase() === dosageFormFilter.toLowerCase());
        }

        const matchesClassification =
          productTypeFilter === 'all' ||
          group.variants.some((medicine) => getVariantLabel(medicine).toLowerCase() === productTypeFilter);

        const matchesSearch =
          !q ||
          group.name.toLowerCase().includes(q) ||
          categoryName.toLowerCase().includes(q) ||
          group.variants.some((medicine) => medicine.name.toLowerCase().includes(q));

        return matchesCategory && matchesDosageForm && matchesClassification && matchesSearch && matchesStaffCategory;
      })
      .sort((a, b) => {
        const categoryCompare = a.category.localeCompare(b.category);
        if (categoryCompare !== 0) return categoryCompare;
        return a.name.localeCompare(b.name);
      });
  }, [productGroups, searchTerm, selectedCategory, dosageFormFilter, productTypeFilter, assignedCategories, userRole]);

  const cartTotals = useMemo(() => cartRows.reduce((totals, row) => {
    const customPromo = customPromos[row.medicineId];
    const pricing = calculateLinePricing(row.unitPrice * row.unitFactor, row.quantity, selectedDiscount, customPromo?.isActive ? customPromo.discountPercent / 100 : 0, row.discountEligible);
    return {
      base: totals.base + pricing.originalPrice,
      vatExemptBase: totals.vatExemptBase + pricing.vatExemptBase,
      vatExemption: totals.vatExemption + pricing.vatExemption,
      seniorDiscount: totals.seniorDiscount + pricing.seniorDiscount,
      discount: totals.discount + pricing.discountAmount,
      payable: totals.payable + pricing.payable,
      eligibleSubtotal: totals.eligibleSubtotal + (row.discountEligible ? pricing.originalPrice : 0),
      nonEligibleSubtotal: totals.nonEligibleSubtotal + (row.discountEligible ? 0 : pricing.originalPrice),
    };
  }, { base: 0, vatExemptBase: 0, vatExemption: 0, seniorDiscount: 0, discount: 0, payable: 0, eligibleSubtotal: 0, nonEligibleSubtotal: 0 }), [cartRows, customPromos, selectedDiscount]);

  const eligibleCartRows = useMemo(() => cartRows.filter(row => row.discountEligible), [cartRows]);
  const nonEligibleCartRows = useMemo(() => cartRows.filter(row => !row.discountEligible), [cartRows]);

  const cartPieceCount = useMemo(
    () => cartRows.reduce((total, row) => total + row.quantity * row.unitFactor, 0),
    [cartRows]
  );

  const deductionPlan = useMemo<DeductionAllocation[]>(() => {
    const simulated = new Map<number, ReturnType<typeof getFifoAvailableSupplies>>();
    const plan: DeductionAllocation[] = [];

    cartRows.forEach((row) => {
      const medicine = medicines.find((item) => item.id === row.medicineId);
      if (!medicine) return;
      if (!simulated.has(medicine.id)) {
        simulated.set(medicine.id, getFifoAvailableSupplies(medicine).map((supply) => ({ ...supply })));
      }

      let remainingToDeduct = row.quantity * row.unitFactor;
      const supplies = simulated.get(medicine.id) || [];
      supplies.forEach((supply) => {
        if (remainingToDeduct <= 0) return;
        const available = Math.max(0, Number(supply.quantity) || 0);
        const quantity = Math.min(available, remainingToDeduct);
        if (quantity <= 0) return;
        supply.quantity = available - quantity;
        remainingToDeduct -= quantity;
        plan.push({
          medicineId: medicine.id,
          productName: row.name,
          batchNumber: supply.batch_number || `Batch #${supply.id}`,
          expiryDate: supply.expiry_date,
          quantity,
          remainingAfter: supply.quantity,
        });
      });
    });

    return plan;
  }, [cartRows, medicines]);

  const plannedDeductionPieces = useMemo(
    () => deductionPlan.reduce((total, allocation) => total + allocation.quantity, 0),
    [deductionPlan]
  );

  const getPreferredVariant = (group: ProductGroup) => {
    const availableVariants = group.variants.filter((variant) => getFifoAvailableStock(variant) > 0);
    const variants = availableVariants.length ? availableVariants : group.variants;
    const promoVariant = variants.find((variant) => Boolean(customPromos[variant.id]?.isActive || variant.is_promo));
    if (promoVariant) return promoVariant;
    const genericVariant = variants.find((variant) => getVariantLabel(variant) === 'Generic');
    return genericVariant || variants[0];
  };

  const buildCartRow = (medicine: Medicine, quantity: number, discountType: DiscountType, unitOverride?: string): CartRow => {
    const customPromo = customPromos[medicine.id];
    const promoRate = customPromo && customPromo.isActive ? customPromo.discountPercent / 100 : 0;
    const effectiveDiscountType = discountType === 'senior' || discountType === 'pwd' || promoRate <= 0 ? discountType : 'promo';

    const unitRate = medicine.unitPrice ?? 0;
    const availableStock = getFifoAvailableStock(medicine);
    const unitOptions = getUnitOptions(medicine);
    const selectedUnit = unitOverride || saleUnitByMed[medicine.id] || unitOptions[0].label;
    const unitFactor = unitOptions.find((option) => option.label === selectedUnit)?.factor || 1;
    const maxQuantity = Math.floor(availableStock / unitFactor);
    const safeQuantity = Math.max(1, Math.min(quantity, maxQuantity || quantity));
    const discountEligible = isSeniorPwdEligible(medicine);
    const pricing = calculateLinePricing(unitRate * unitFactor, safeQuantity, effectiveDiscountType, promoRate, discountEligible);

    return {
      medicineId: medicine.id,
      groupKey: getGroupKey(medicine),
      name: getVariantDisplayName(medicine),
      category: medicine.category,
      classification: getVariantLabel(medicine),
      dosageForm: medicine.dosage_form,
      unitPrice: unitRate,
      saleUnit: selectedUnit,
      unitFactor,
      quantity: safeQuantity,
      discountType: effectiveDiscountType,
      discountAmount: pricing.discountAmount,
      rowTotal: pricing.payable,
      stockBefore: availableStock,
      discountEligible,
    };
  };

  const handleOpenVariantDialog = (group: ProductGroup, action: VariantSelectionAction = 'cart') => {
    setVariantDialogGroup(group);
    setVariantSelectionAction(action);
  };

  const handleCloseVariantDialog = () => {
    setVariantDialogGroup(null);
    setVariantSelectionAction('cart');
  };

  const handleSelectVariant = (variant: Medicine) => {
    const quantity = 1;
    const action = variantSelectionAction;
    handleCloseVariantDialog();
    if (isStripMedicine(variant)) {
      setUnitDialogMedicine(variant);
      setUnitDialogAction(action);
      setUnitDialogQuantity(quantity);
      setUnitDialogSelectedUnit(getUnitOptions(variant)[0].label);
      return;
    }
    handleAddToCart(variant, quantity);
    setView(action === 'buy' ? 'summary' : 'products');
  };

  const handleAddToCart = (medicine: Medicine, quantityOverride?: number, unitOverride?: string) => {
    setCheckoutError('');
    const availableStock = getFifoAvailableStock(medicine);
    const unitOptions = getUnitOptions(medicine);
    const selectedUnit = unitOverride || saleUnitByMed[medicine.id] || unitOptions[0].label;
    const unitFactor = unitOptions.find((option) => option.label === selectedUnit)?.factor || 1;
    const maxQuantity = Math.floor(availableStock / unitFactor);
    if (maxQuantity < 1) return;
    const desiredQty = Math.max(1, Math.min(quantityOverride ?? 1, maxQuantity));
    if (desiredQty <= 0) return;
    setCartRows(prev => {
      const existingIdx = prev.findIndex(r => r.medicineId === medicine.id && r.saleUnit === selectedUnit);
      const unitRate = medicine.unitPrice ?? 0;
      if (existingIdx >= 0) {
        const merged = [...prev];
        const existing = merged[existingIdx];
        const newQty = Math.min(Math.floor(availableStock / existing.unitFactor), existing.quantity + desiredQty);
        const customPromo = customPromos[medicine.id];
        const effectiveDiscountType = selectedDiscount === 'senior' || selectedDiscount === 'pwd' || !customPromo?.isActive ? selectedDiscount : 'promo';
        const pricing = calculateLinePricing(unitRate * existing.unitFactor, newQty, effectiveDiscountType, customPromo?.isActive ? customPromo.discountPercent / 100 : 0, existing.discountEligible);
        merged[existingIdx] = { ...existing, quantity: newQty, discountAmount: pricing.discountAmount, rowTotal: pricing.payable, discountType: effectiveDiscountType };
        return merged;
      }
      return [...prev, buildCartRow(medicine, desiredQty, selectedDiscount, selectedUnit)];
    });
  };

  const handleCartQuantityChange = (medicineId: number, saleUnit: string, value: string) => {
    const requestedQuantity = Math.floor(Number(value) || 1);
    setCartRows((previousRows) => previousRows.map((row) => {
      if (row.medicineId !== medicineId || row.saleUnit !== saleUnit) return row;

      const maxQuantity = Math.floor(row.stockBefore / row.unitFactor);
      const quantity = Math.max(1, Math.min(requestedQuantity, Math.max(1, maxQuantity)));
      const customPromo = customPromos[row.medicineId];
      const promoRate = customPromo?.isActive ? customPromo.discountPercent / 100 : 0;
      const effectiveDiscountType = selectedDiscount === 'senior' || selectedDiscount === 'pwd' || promoRate <= 0 ? selectedDiscount : 'promo';
      const pricing = calculateLinePricing(row.unitPrice * row.unitFactor, quantity, effectiveDiscountType, promoRate, row.discountEligible);

      return {
        ...row,
        quantity,
        discountType: effectiveDiscountType,
        discountAmount: pricing.discountAmount,
        rowTotal: pricing.payable,
      };
    }));
  };

  const handleUnitSelected = (unit: string, actionOverride?: VariantSelectionAction) => {
    if (!unitDialogMedicine) return;
    const action = actionOverride || unitDialogAction;
    const selectedOption = getUnitOptions(unitDialogMedicine).find((option) => option.label === unit) || getUnitOptions(unitDialogMedicine)[0];
    const maxQuantity = Math.floor(getFifoAvailableStock(unitDialogMedicine) / selectedOption.factor);
    if (maxQuantity < 1) return;
    const safeQuantity = Math.max(1, Math.min(unitDialogQuantity, maxQuantity));
    setSaleUnitByMed((prev) => ({ ...prev, [unitDialogMedicine.id]: unit }));
    handleAddToCart(unitDialogMedicine, safeQuantity, unit);
    setUnitDialogMedicine(null);
    setUnitDialogQuantity(1);
    setUnitDialogSelectedUnit('pcs');
    setView(action === 'buy' ? 'summary' : 'products');
  };

  const handleAddMore = () => {
    setView('products');
  };

  const openCustomerVerification = (type: CustomerType) => {
    setCustomerDialogType(type);
    setCustomerIdInput('');
    setCustomerNameInput('');
    setCustomerDialogError('');
    setCustomerNotFound(false);
    setCustomerCandidate(null);
    setCustomerSearchTerm('');
    setShowRegisterModal(false);
  };

  useEffect(() => {
    if (!customerDialogType) return;

    let active = true;
    setCustomersLoading(true);
    setRegisteredCustomers([]);
    setCustomerSearchTerm('');
    setCustomerDialogError('');

    getCustomersByType(customerDialogType)
      .then((customers) => {
        if (active) setRegisteredCustomers(customers);
      })
      .catch((err: any) => {
        if (active) setCustomerDialogError(err.message || 'Unable to load registered customers.');
      })
      .finally(() => {
        if (active) setCustomersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [customerDialogType]);

  const filteredCustomers = useMemo(() => {
    const search = customerSearchTerm.trim().toLowerCase();
    if (!search) return registeredCustomers;
    return registeredCustomers.filter((customer) =>
      customer.full_name.toLowerCase().includes(search) ||
      customer.id_number.toLowerCase().includes(search)
    );
  }, [customerSearchTerm, registeredCustomers]);

  const handleCustomerSearch = async () => {
    if (!customerDialogType || !customerIdInput.trim()) {
      setCustomerDialogError('Enter a valid ID number.');
      return;
    }
    setCustomerDialogLoading(true);
    setCustomerDialogError('');
    try {
      const customer = await findCustomer(customerDialogType, customerIdInput);
      if (customer) {
        setCustomerCandidate(customer);
        setCustomerNotFound(false);
      } else {
        setCustomerNotFound(true);
      }
    } catch (err: any) {
      setCustomerDialogError(err.message || 'Unable to verify customer ID.');
    } finally {
      setCustomerDialogLoading(false);
    }
  };

  const handleCustomerRegister = async () => {
    if (!customerDialogType || !customerIdInput.trim() || !customerNameInput.trim()) {
      setCustomerDialogError('Enter both the customer name and ID number.');
      return;
    }
    setCustomerDialogLoading(true);
    setCustomerDialogError('');
    try {
      const customer = await createCustomer({
        customer_type: customerDialogType,
        id_number: customerIdInput.trim(),
        full_name: customerNameInput.trim(),
      });
      // ✅ Auto-select customer + close BOTH modals
      setSelectedCustomer(customer);
      setSelectedDiscount(customerDialogType === 'pwd' ? 'pwd' : 'senior');
      setShowRegisterModal(false);
      setCustomerDialogType(null);
      setCustomerCandidate(null);
      setCustomerSearchTerm('');
      setCustomerIdInput('');
      setCustomerNameInput('');
      setCustomerNotFound(false);
    } catch (err: any) {
      setCustomerDialogError(err.message || 'Unable to register customer.');
    } finally {
      setCustomerDialogLoading(false);
    }
  };

  const useCustomerCandidate = () => {
    if (!customerCandidate || !customerDialogType) return;
    setSelectedCustomer(customerCandidate);
    setSelectedDiscount(customerDialogType === 'pwd' ? 'pwd' : 'senior');
    setCustomerDialogType(null);
    setCustomerCandidate(null);
    setCustomerSearchTerm('');
  };

  const selectRegisteredCustomer = (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
    setSelectedDiscount(customer.customer_type === 'pwd' ? 'pwd' : 'senior');
    setCustomerDialogType(null);
    setCustomerCandidate(null);
    setCustomerSearchTerm('');
  };

  const handleDiscountChange = (value: DiscountType) => {
    if (value === 'none') {
      setSelectedDiscount('none');
      setSelectedCustomer(null);
      return;
    }
    if (selectedCustomer?.customer_type === value || (value === 'senior' && selectedCustomer?.customer_type === 'senior_citizen')) {
      setSelectedDiscount(value);
      return;
    }
    openCustomerVerification(value === 'pwd' ? 'pwd' : 'senior_citizen');
  };

  const handleCheckout = async () => {
    if (!cartRows.length || checkoutLoading) return;

    const cash = parseFloat(cashReceivedStr);
    if (isNaN(cash) || cash < cartTotals.payable) {
      setCheckoutError('Insufficient cash received.');
      return;
    }

    setCheckoutError('');
    setView('deduction');
  };

  const handleConfirmDeduction = async () => {
    if (!cartRows.length || checkoutLoading) return;
    const cash = parseFloat(cashReceivedStr);
    if (isNaN(cash) || cash < cartTotals.payable) {
      setCheckoutError('Insufficient cash received.');
      setView('confirm');
      return;
    }

    setCheckoutError('');
    setCheckoutLoading(true);
    try {
      await onCompleteSale(cartRows.map(r => ({
        ...(() => {
          const pricing = calculateLinePricing(r.unitPrice * r.unitFactor, r.quantity, r.discountType, 0, r.discountEligible);
          return {
            seniorCitizenDiscount: pricing.seniorDiscount,
            discountEligible: r.discountEligible,
            eligibleSubtotal: r.discountEligible ? pricing.originalPrice : 0,
            nonEligibleSubtotal: r.discountEligible ? 0 : pricing.originalPrice,
          };
        })(),
        medicineId: r.medicineId,
        quantity: r.quantity * r.unitFactor,
        unitPrice: r.quantity > 0 ? r.rowTotal / (r.quantity * r.unitFactor) : r.unitPrice,
        grossUnitPrice: r.unitPrice,
        discountAmount: r.discountAmount,
          saleUnit: r.saleUnit,
          unitFactor: r.unitFactor,
          category: r.category,
          classification: r.classification,
          dosageForm: r.dosageForm,
          customerType: r.discountType === 'senior' ? 'senior_citizen' : r.discountType === 'pwd' ? 'pwd' : 'regular',
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.full_name,
          customerIdNumber: selectedCustomer?.id_number,
        })), cash, cash - cartTotals.payable);
      const sale: CompletedSale = {
        rows: [...cartRows],
        timestamp: new Date(),
        receiptNo: genReceiptNo(),
        cashReceived: cash,
        discountType: selectedDiscount,
        customerType: selectedCustomer?.customer_type || 'regular',
        customerName: selectedCustomer?.full_name,
        customerIdNumber: selectedCustomer?.id_number,
        eligibleSubtotal: cartTotals.eligibleSubtotal,
        nonEligibleSubtotal: cartTotals.nonEligibleSubtotal,
      };
      setCompletedSales(prev => [sale, ...prev]);
      setLastReceipt(sale);
      setCartRows([]);
      setCashReceivedStr('');
      setView('receipt');
    } catch (err: any) {
      setCheckoutError(err?.message || 'Transaction failed. Please try again.');
      setView('deduction');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const renderMedicineCard = (group: ProductGroup) => {
    const isOutOfStock = group.totalStock === 0;
    const isLowStock = group.totalStock > 0 && group.totalStock <= (group.reorderLevel ?? 0);
    const defaultVariant = getPreferredVariant(group);
    const rawPrice = defaultVariant?.unitPrice ?? 0;
    const priceLabel = formatPeso(rawPrice);

    const activePromoVariant = group.variants.find(m => customPromos[m.id] && customPromos[m.id].isActive);
    const promo = activePromoVariant ? customPromos[activePromoVariant.id] : null;
    const promoPrice = promo ? rawPrice * (1 - promo.discountPercent / 100) : rawPrice;

    return (
      <article key={group.key} className="group relative overflow-hidden rounded-2xl border border-emerald-500 bg-white p-5 transition-all hover:border-sky-500 hover:shadow-lg hover:-translate-y-0.5">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-emerald-50/30 blur-2xl" />

        <div className="relative space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="break-words text-sm font-black leading-tight text-slate-900">{group.name}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  {group.category || 'Uncategorized'}
                </span>
                {group.dosageForm && (
                  <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 border border-sky-200">
                    {group.dosageForm}
                  </span>
                )}
                {getGroupClassifications(group).map((classification) => (
                  <span
                    key={classification}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
                      classification === 'Branded'
                        ? 'border-violet-200 bg-violet-50 text-violet-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {classification}
                  </span>
                ))}
                {promo && (
                  <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm animate-pulse">
                    {promo.badgeText || 'PROMO'}
                  </span>
                )}
                {group.variants.length > 1 && (
                  <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                    {group.variants.length} variants
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              {promo ? (
                <div>
                  <span className="text-xs text-slate-400 line-through mr-1.5">{priceLabel}</span>
                  <span className="text-lg font-black text-amber-600">{formatPeso(promoPrice)}</span>
                </div>
              ) : (
                <>
                  <p className="text-lg font-black text-slate-900">{priceLabel}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">starting price / pcs</p>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] border ${
                isOutOfStock
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : isLowStock
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                {isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'Available'}
              </span>
              <span className="font-semibold text-slate-700">{group.totalStock} on hand</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`${BTN_3D_PRIMARY} h-9 px-4 text-xs font-black uppercase tracking-wide`}
                disabled={isOutOfStock}
                onClick={() => handleOpenVariantDialog(group, 'buy')}
                title="Buy this medicine now"
                aria-label={`Buy ${group.name} now`}
              >
                Buy
              </button>
              <button
                type="button"
                className={`${BTN_3D_SECONDARY} h-9 px-4 text-xs font-black uppercase tracking-wide`}
                disabled={isOutOfStock}
                onClick={() => handleOpenVariantDialog(group, 'cart')}
                title="Select variant and add to cart"
                aria-label={`Add ${group.name} to cart`}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-5">
      {/* Medicines Grid */}
      {view === 'products' && (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/30">
          <header className="mb-6 flex flex-col gap-5 border-b-2 border-slate-100 pb-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.4em] text-emerald-600">Dispensing</p>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Purchase Medicines</h2>
                <p className="text-sm text-slate-500 font-medium">Select a medicine, choose its exact variant and selling unit, then add it to the cart.</p>
              </div>
            </div>
            <div className="flex w-full items-center justify-between gap-3 xl:w-auto">
              <button
                type="button"
                className={`${BTN_3D_SMALL_ICON} relative h-12 w-12`}
                onClick={() => cartRows.length > 0 && setView('summary')}
                disabled={cartRows.length === 0}
                title="View Cart"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartRows.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg shadow-rose-500/30">
                    {cartRows.length}
                  </span>
                )}
              </button>
            </div>
          </header>

          {/* Search & Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
                </svg>
              </span>
              <input
                id="product-search"
                type="text"
                placeholder="Search medicine or category..."
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 placeholder:text-slate-400"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <div className="flex flex-wrap gap-2">
                {DOSAGE_FORMS.map((form) => {
                  const isSelected = dosageFormFilter === form.value;
                  return (
                    <button
                      key={form.value}
                      type="button"
                      onClick={() => onDosageFormFilterChange(form.value)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-150 ${
                        isSelected
                          ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_3px_0_0_#047857,0_4px_10px_-2px_rgba(4,120,87,0.4)] hover:from-emerald-400 hover:to-emerald-500 active:translate-y-[2px] active:shadow-none'
                          : 'bg-gradient-to-b from-white to-slate-50 text-slate-600 border border-slate-200 shadow-[0_3px_0_0_#cbd5e1,0_4px_8px_-2px_rgba(15,23,42,0.12)] hover:from-slate-50 hover:to-slate-100 hover:text-slate-800 active:translate-y-[2px] active:shadow-none'
                      }`}
                    >
                      {form.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {filteredProductGroups.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <span className="sr-only">No products</span>
              <p className="text-base font-extrabold text-slate-700">No medicines found</p>
              <p className="mt-1 text-sm text-slate-500 font-medium">
                {searchTerm ? 'Try adjusting your search' : 'Add medicines to inventory first'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredProductGroups.map((group) => renderMedicineCard(group))}
            </div>
          )}
        </section>
      )}

      {/* Variant Dialog */}
      <Dialog open={Boolean(variantDialogGroup)} onClose={handleCloseVariantDialog} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '20px', padding: '8px 0' } }}>
        <DialogTitle sx={{ fontWeight: 900, fontSize: '20px', color: '#0f172a', pb: 1 }}>
          Select Product Variant
        </DialogTitle>
        <DialogContent>
          <Box className="space-y-4 py-2">
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, lineHeight: 1.5 }}>
              {variantDialogGroup?.name} · Choose the exact strength and form you want to {variantSelectionAction === 'buy' ? 'purchase' : 'add to cart'}.
            </Typography>
            <List disablePadding sx={{ display: 'grid', gap: 1.25 }}>
              {filteredVariantDialogOptions.map((variant) => {
                const outOfStock = getFifoAvailableStock(variant) <= 0;
                return (
                  <ListItemButton
                    key={variant.id}
                    onClick={() => handleSelectVariant(variant)}
                    disabled={outOfStock}
                    sx={{
                      borderRadius: '12px',
                      mb: 1,
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.2s ease',
                      '&:hover': { background: '#f0fdf4', borderColor: '#a7f3d0' },
                      '&.Mui-disabled': { opacity: 0.5 }
                    }}
                  >
                    <ListItemText
                      primary={<span className="font-bold text-slate-900">{getVariantDisplayName(variant)}</span>}
                      secondary={
                        <span className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="font-bold text-emerald-600">{formatPeso(variant.unitPrice ?? 0)}</span>
                          <span>{getFifoAvailableStock(variant)} on hand</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            getVariantLabel(variant) === 'Branded'
                              ? 'bg-violet-50 text-violet-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {getVariantLabel(variant)}
                          </span>
                        </span>
                      }
                    />
                  </ListItemButton>
                );
              })}
              {filteredVariantDialogOptions.length === 0 && (
                <Typography className="px-3 py-6 text-center text-sm text-slate-500 font-medium">
                  No available variants for this product.
                </Typography>
              )}
            </List>
          </Box>
          <Box className="mt-3 flex justify-end">
            <Button onClick={handleCloseVariantDialog} color="secondary" variant="outlined" sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}>
              Cancel
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Unit selection dialog */}
      <Dialog
        open={Boolean(unitDialogMedicine)}
        onClose={() => setUnitDialogMedicine(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ px: { xs: 3, sm: 4 }, pt: 3.5, pb: 2 }}>
          <Box className="flex items-start justify-between gap-4">
            <Box>
              <Typography className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
                Dispensing · Unit selection
              </Typography>
              <Typography className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                {unitDialogAction === 'buy' ? 'Choose unit to buy' : 'Choose selling unit'}
              </Typography>
            </Box>
            <Box className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12l-1 13H7L6 7Zm3 0V5a3 3 0 0 1 6 0v2M4 7h16" />
              </svg>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 3, sm: 4 }, pb: 3.5 }}>
          <Box className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Typography className="text-sm font-bold text-slate-900">
              {unitDialogMedicine ? getVariantDisplayName(unitDialogMedicine) : ''}
            </Typography>
            <Typography className="mt-0.5 text-xs font-medium text-slate-500">
              Select the unit the customer will receive.
            </Typography>
          </Box>

          {unitDialogMedicine && (() => {
            const options = getUnitOptions(unitDialogMedicine);
            const selectedOption =
              options.find((option) => option.label === unitDialogSelectedUnit) || options[0];
            const selectedTotal =
              (unitDialogMedicine.unitPrice || 0) * selectedOption.factor * unitDialogQuantity;

            return (
              <Box className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white px-4 py-3.5 shadow-[0_4px_0_0_rgba(5,150,105,0.15),0_8px_16px_-8px_rgba(5,150,105,0.25),inset_0_1px_0_rgba(255,255,255,0.9)]">
                <Box>
                  <Typography className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                    Order summary
                  </Typography>
                  <Typography className="mt-1 text-sm font-extrabold text-slate-900">
                    {unitDialogQuantity} × {selectedOption.label}
                    <span className="ml-2 font-medium text-slate-500">({unitDialogQuantity * selectedOption.factor} pcs)</span>
                  </Typography>
                </Box>
                <Box className="text-right">
                  <Typography className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Total</Typography>
                  <Typography className="text-xl font-black text-emerald-700">{formatPeso(selectedTotal)}</Typography>
                </Box>
              </Box>
            );
          })()}

          <Box className="grid gap-3 md:grid-cols-3">
            {unitDialogMedicine &&
              getUnitOptions(unitDialogMedicine).map((option) => {
                const available = getFifoAvailableStock(unitDialogMedicine);
                const maxUnits = Math.floor(available / option.factor);
                const canSell = maxUnits > 0;
                const isSelected = unitDialogSelectedUnit === option.label;
                const displayQuantity = isSelected ? unitDialogQuantity : 1;
                const unitPrice = (unitDialogMedicine.unitPrice || 0) * option.factor;

                const handleSelect = () => {
                  if (!canSell) return;
                  setUnitDialogSelectedUnit(option.label);
                  setUnitDialogQuantity((current) =>
                    Math.max(1, Math.min(isSelected ? current : 1, maxUnits))
                  );
                };

                const handleKeyDown = (event) => {
                  if (canSell && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    handleSelect();
                  }
                };

                const handleQuantityChange = (event) => {
                  const next = Math.floor(Number(event.target.value) || 1);
                  setUnitDialogSelectedUnit(option.label);
                  setUnitDialogQuantity(Math.max(1, Math.min(next, maxUnits)));
                };

                return (
                  <Box
                    key={option.label}
                    onClick={handleSelect}
                    onKeyDown={handleKeyDown}
                    role="button"
                    tabIndex={canSell ? 0 : -1}
                    aria-disabled={!canSell}
                    aria-label={`${option.label} unit${canSell ? '' : ' (unavailable)'}`}
                    sx={{
                      borderRadius: '14px',
                      border: '2px solid',
                      borderColor: isSelected ? '#059669' : '#e2e8f0',
                      backgroundColor: isSelected
                        ? '#f0fdf4'
                        : canSell
                        ? '#fff'
                        : '#f8fafc',
                      opacity: canSell ? 1 : 0.55,
                      cursor: canSell ? 'pointer' : 'not-allowed',
                      p: 1.5,
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      '&:hover': canSell
                        ? { borderColor: '#10b981', backgroundColor: '#f0fdf4', boxShadow: '0 8px 20px rgba(5, 150, 105, 0.10)' }
                        : undefined,
                    }}
                  >
                    <span className="flex w-full flex-col gap-1.5">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black uppercase tracking-wide text-slate-900">{option.label}</span>
                        {isSelected && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">Selected</span>}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {option.factor} pcs per unit
                      </span>
                      <span className="mt-1 text-sm font-black text-emerald-700">
                        {formatPeso(unitPrice)} / {option.label}
                      </span>
                      <span className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Quantity
                      </span>

                      {/* ── − / + stepper ── */}
                      <div className="mt-1 flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          disabled={!canSell || displayQuantity <= 1}
                          onClick={(event) => {
                            event.stopPropagation();
                            setUnitDialogSelectedUnit(option.label);
                            setUnitDialogQuantity((q) => Math.max(1, Math.min(q - 1, maxUnits)));
                          }}
                          aria-label={`Decrease quantity in ${option.label}`}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-700 shadow-[0_3px_0_0_#cbd5e1,0_4px_8px_-2px_rgba(15,23,42,0.15)] transition-all duration-150 hover:border-emerald-300 hover:from-slate-50 hover:to-slate-100 hover:text-emerald-700 hover:shadow-[0_3px_0_0_#94a3b8,0_5px_10px_-2px_rgba(15,23,42,0.2)] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                          </svg>
                        </button>

                        <input
                          aria-label={`Quantity in ${option.label}`}
                          type="number"
                          min={1}
                          max={Math.max(1, maxUnits)}
                          value={displayQuantity}
                          disabled={!canSell}
                          onClick={(event) => event.stopPropagation()}
                          onChange={handleQuantityChange}
                          className="h-9 w-14 rounded-lg border border-slate-300 bg-white px-1 text-center text-sm font-black text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />

                        <button
                          type="button"
                          disabled={!canSell || displayQuantity >= maxUnits}
                          onClick={(event) => {
                            event.stopPropagation();
                            setUnitDialogSelectedUnit(option.label);
                            setUnitDialogQuantity((q) => Math.max(1, Math.min(q + 1, maxUnits)));
                          }}
                          aria-label={`Increase quantity in ${option.label}`}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-700 shadow-[0_3px_0_0_#cbd5e1,0_4px_8px_-2px_rgba(15,23,42,0.15)] transition-all duration-150 hover:border-emerald-300 hover:from-slate-50 hover:to-slate-100 hover:text-emerald-700 hover:shadow-[0_3px_0_0_#94a3b8,0_5px_10px_-2px_rgba(15,23,42,0.2)] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                      </div>

                      <span className="text-[11px] font-bold text-slate-400">
                        {canSell ? `${maxUnits} available` : 'Not available — insufficient stock'}
                      </span>
                    </span>
                  </Box>
                );
              })}
          </Box>

          <Box className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
            <Button
              onClick={() => setUnitDialogMedicine(null)}
              variant="outlined"
              sx={{ borderRadius: '10px', borderColor: '#cbd5e1', color: '#475569', fontWeight: 800, textTransform: 'none', '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f8fafc' } }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleUnitSelected(unitDialogSelectedUnit, unitDialogAction)}
              variant="contained"
              sx={{
                borderRadius: '10px',
                fontWeight: 800,
                textTransform: 'none',
                backgroundColor: '#059669',
                boxShadow: '0 6px 14px rgba(5, 150, 105, 0.20)',
                '&:hover': { backgroundColor: '#047857', boxShadow: '0 8px 18px rgba(5, 150, 105, 0.25)' },
              }}
            >
              {unitDialogAction === 'buy' ? 'Buy Now' : 'Add to Cart'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Cart badge */}
      {cartRows.length > 0 && view === 'products' && (
        <div className="sticky bottom-4 z-20 flex flex-col gap-4 rounded-2xl border-2 border-emerald-200 bg-white/95 p-4 shadow-xl shadow-emerald-900/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-xl text-white shadow-lg shadow-emerald-500/20" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-emerald-600">Cart</p>
              <p className="text-sm font-black text-slate-800">{cartRows.length} item{cartRows.length === 1 ? '' : 's'} · {cartPieceCount} pcs</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Current total</p>
              <p className="text-lg font-black text-emerald-700">{formatPeso(cartTotals.payable)}</p>
            </div>
            <button
              type="button"
              className={`${BTN_3D_PRIMARY} px-5 py-2.5 text-sm`}
              onClick={() => setView('summary')}
            >
              Review cart <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}

     {/* ── CUSTOMER VERIFICATION MODAL ── */}
{customerDialogType && (
  <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Customer verification</p>
      <h3 className="mt-1 text-xl font-black text-slate-900">{customerDialogType === 'pwd' ? 'PWD' : 'Senior Citizen'} customer</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">Select a registered customer or register a new one.</p>

      <section className="mt-5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-800">Registered Customers</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{customerDialogType === 'pwd' ? 'PWD' : 'Senior Citizen'} records</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">{registeredCustomers.length}</span>
        </div>

        <div className="relative mt-3">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
          </svg>
          <input
            value={customerSearchTerm}
            onChange={(event) => setCustomerSearchTerm(event.target.value)}
            className="w-full rounded-xl border-2 border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            placeholder="Search by name or ID..."
            aria-label="Search registered customers"
          />
        </div>

        <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
          {customersLoading ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-500">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-500">No registered customers yet. Register below.</div>
          ) : (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => selectRegisteredCustomer(customer)}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-3 text-left transition-all hover:border-emerald-400 hover:bg-emerald-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19a6 6 0 0 0-12 0m6-8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-1v6m3-3h-6" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-slate-900">{customer.full_name}</span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">{customer.id_number}</span>
                </span>
                <span className="text-xs font-black text-emerald-600">Use</span>
              </button>
            ))
          )}
        </div>
      </section>

      <div className="my-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        NEW CUSTOMER
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={() => setShowRegisterModal(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-3 text-sm font-black text-emerald-700 transition-all hover:border-emerald-500 hover:bg-emerald-100"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Register New {customerDialogType === 'pwd' ? 'PWD' : 'Senior Citizen'}
      </button>

      {customerDialogError && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{customerDialogError}</p>}

      <button
        type="button"
        onClick={() => {
          setCustomerDialogType(null);
          setCustomerSearchTerm('');
          setShowRegisterModal(false);
          setCustomerIdInput('');
          setCustomerNameInput('');
          setCustomerDialogError('');
        }}
        className="mt-5 w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
      >
        Cancel
      </button>
    </div>
  </div>
)}

{/* ── REGISTER NEW CUSTOMER MODAL (separate) ── */}
{showRegisterModal && customerDialogType && (
  <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="w-full max-w-md rounded-3xl border-2 border-emerald-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
            New Customer
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-900">
            Register New {customerDialogType === 'pwd' ? 'PWD' : 'Senior Citizen'}
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Fill in the customer details below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowRegisterModal(false);
            setCustomerIdInput('');
            setCustomerNameInput('');
            setCustomerDialogError('');
          }}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close register modal"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mt-5 space-y-3">
        <label className="block">
          <span className="text-xs font-bold text-slate-600">
            {customerDialogType === 'pwd' ? 'PWD ID' : 'Senior Citizen ID'}
          </span>
          <input
            value={customerIdInput}
            onChange={(event) => {
              setCustomerIdInput(event.target.value);
              setCustomerDialogError('');
            }}
            className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            placeholder="Enter ID number"
            autoFocus
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-slate-600">Full Name</span>
          <input
            value={customerNameInput}
            onChange={(event) => {
              setCustomerNameInput(event.target.value);
              setCustomerDialogError('');
            }}
            className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            placeholder="Customer full name"
          />
        </label>

        {customerDialogError && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {customerDialogError}
          </p>
        )}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => {
            setShowRegisterModal(false);
            setCustomerIdInput('');
            setCustomerNameInput('');
            setCustomerDialogError('');
          }}
          disabled={customerDialogLoading}
          className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleCustomerRegister()}
          disabled={customerDialogLoading || !customerIdInput.trim() || !customerNameInput.trim()}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#047857] transition-all hover:bg-emerald-700 active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0"
        >
          {customerDialogLoading ? 'Saving...' : 'Register'}
        </button>
      </div>
    </div>
  </div>
)}

{view === 'summary' && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="flex max-h-[94vh] min-h-0 w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">

      {/* ══════════ HEADER ══════════ */}
      <div className="flex-shrink-0 flex items-start justify-between gap-4 border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-emerald-600">Checkout</p>
            <h3 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">Order Summary</h3>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              Review each selling unit, quantity, discount, and total before payment.
            </p>
          </div>
        </div>
        <button
          type="button"
          className={BTN_3D_GHOST}
          onClick={() => setView('products')}
          aria-label="Close summary"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ══════════ BODY ══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/50">
        <div className="grid h-full min-h-0 gap-5 p-4 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">

          {/* ─── LEFT: Cart Items ─── */}
          <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* Left header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-700">Selected Items</p>
                  <p className="text-[11px] font-semibold text-slate-400">Adjust quantities as needed</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
                {cartRows.length} item{cartRows.length !== 1 ? 's' : ''} · {cartPieceCount} pcs
              </span>
            </div>

            {/* Items list */}
            <div className="grid gap-3 overflow-y-auto p-4 custom-scrollbar">
              {selectedDiscount === 'senior' && selectedCustomer && (
                <div className="relative flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 px-4 py-3 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.6 1.4L21 18l-1.4.6L19 20l-.6-1.4L17 18l1.4-.6L19 16z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-emerald-800">Senior Citizen Discount Active</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-emerald-700/80">Eligible items receive VAT exemption and 20% discount.</p>
                  </div>
                </div>
              )}
              {cartRows.map((row) => {
                const maxQty = Math.max(1, Math.floor(row.stockBefore / row.unitFactor));
                const canDecrease = row.quantity > 1;
                const canIncrease = row.quantity < maxQty;

                return (
                  <div
                    key={`${row.medicineId}-${row.saleUnit}`}
                    className="group rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-emerald-300 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-slate-900">{row.name}</p>
                          <p className="mt-0.5 text-xs font-bold text-slate-500">
                            Unit price: <span className="text-slate-900 tabular-nums">{formatPeso(row.unitPrice * row.unitFactor)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Qty</span>
                        <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCartQuantityChange(row.medicineId, row.saleUnit, String(row.quantity - 1))}
                              disabled={!canDecrease}
                              aria-label={`Decrease quantity for ${row.name}`}
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-700 shadow-[0_2px_0_0_#cbd5e1] transition-all duration-150 hover:border-emerald-300 hover:text-emerald-700 active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                              </svg>
                            </button>

                            <input
                              type="number"
                              min={1}
                              max={maxQty}
                              value={row.quantity}
                              onChange={(event) => handleCartQuantityChange(row.medicineId, row.saleUnit, event.target.value)}
                              className="h-7 w-10 rounded-md border border-slate-200 bg-white px-0.5 text-center text-xs font-extrabold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              aria-label={`Quantity for ${row.name}`}
                            />

                            <button
                              type="button"
                              onClick={() => handleCartQuantityChange(row.medicineId, row.saleUnit, String(row.quantity + 1))}
                              disabled={!canIncrease}
                              aria-label={`Increase quantity for ${row.name}`}
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-700 shadow-[0_2px_0_0_#cbd5e1] transition-all duration-150 hover:border-emerald-300 hover:text-emerald-700 active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                              </svg>
                            </button>
                          </div>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── RIGHT: Payment Summary ─── */}
          <div className="min-h-0 self-start rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-0">

            <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-6 4h6m-6 4h3M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-700">Payment Summary</p>
                <p className="text-[11px] font-semibold text-slate-400">Discount and totals</p>
              </div>
            </div>

            <div className="p-5">
              {checkoutError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {checkoutError}
                </div>
              )}

              <div className="mb-5">
                {selectedCustomer && selectedDiscount !== 'none' && (
                  <div className="mb-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Verified customer</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{selectedCustomer.full_name}</p>
                    <p className="text-xs font-semibold text-slate-600">{selectedCustomer.id_number} · {selectedCustomer.customer_type === 'pwd' ? 'PWD' : 'Senior Citizen'}</p>
                  </div>
                )}
                <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-600">Select Discount Type</p>
                <div className="space-y-2">
                  {Object.entries(DISCOUNT_OPTIONS).map(([key, entry]) => (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all ${
                        selectedDiscount === key
                          ? 'border-emerald-500 bg-emerald-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="discountType"
                        checked={selectedDiscount === key}
                        onChange={() => handleDiscountChange(key as DiscountType)}
                        className="pos-discount-radio mt-1 h-4 w-4 accent-emerald-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-extrabold text-slate-900">{entry.label}</span>
                          <span className="text-xs font-bold text-emerald-600">{Math.round(entry.rate * 100)}% off</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{entry.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2.5 border-t-2 border-slate-100 pt-4">
                <button
                  type="button"
                  className={`${BTN_3D_PRIMARY} w-full px-4 py-3 text-sm`}
                  onClick={() => setView('confirm')}
                  disabled={!cartRows.length || checkoutLoading}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Proceed to Payment
                </button>
                <button
                  type="button"
                  className={`${BTN_3D_SECONDARY} w-full px-4 py-2.5 text-sm`}
                  onClick={handleAddMore}
                  disabled={checkoutLoading}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

   {/* ── CONFIRMATION DIALOG (POS STYLE) ── */}
{view === 'confirm' && (
  <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-2xl animate-in zoom-in-95 duration-200">

      {/* ══════════ POS HEADER ══════════ */}
      <div className="flex-shrink-0 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-lg">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-6 4h6m-6 4h3M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Point of Sale</p>
              <h3 className="text-lg font-black text-white">Confirm Payment</h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-800 px-3 py-1.5 text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Items</p>
              <p className="text-sm font-black text-white">{cartRows.length}</p>
            </div>
            <div className="rounded-lg bg-slate-800 px-3 py-1.5 text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pieces</p>
              <p className="text-sm font-black text-white">{cartPieceCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ POS BODY ══════════ */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">

          {/* ─── LEFT: Payment Panel ─── */}
          <div className="space-y-4">

            {/* Payment Summary Card */}
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Payment Summary</p>
                <span className="rounded-md bg-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                  {selectedDiscount === 'none' ? 'Regular' : selectedDiscount === 'pwd' ? 'PWD' : 'Senior'}
                </span>
              </div>

              <div className="p-5">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-500">
                      {selectedDiscount === 'senior' || selectedDiscount === 'pwd' ? 'Gross Amount' : 'Subtotal'}
                    </span>
                    <span className="font-black tabular-nums text-slate-800">{formatPeso(cartTotals.base)}</span>
                  </div>

                  {!(selectedDiscount === 'senior' || selectedDiscount === 'pwd') && cartTotals.discount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-500">
                        Discount ({Math.round(DISCOUNT_OPTIONS[selectedDiscount].rate * 100)}%)
                      </span>
                      <span className="font-black tabular-nums text-emerald-600">−{formatPeso(cartTotals.discount)}</span>
                    </div>
                  )}

                  <div className="border-t border-dashed border-slate-300 pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black uppercase tracking-wide text-slate-700">Total Payable</span>
                      <span className="text-3xl font-black tabular-nums text-emerald-600">
                        {formatPeso(cartTotals.payable)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Received Card */}
            <div className="overflow-hidden rounded-xl border-2 border-emerald-400 bg-white shadow-md">
              <div className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-5 py-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Cash Received</p>
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>

              <div className="p-5">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">
                    ₱
                  </span>
                  <input
                    type="number"
                    min={cartTotals.payable}
                    step="0.01"
                    className="w-full rounded-lg border-2 border-slate-300 bg-slate-50 py-4 pl-12 pr-4 text-3xl font-black tabular-nums text-slate-900 outline-none transition-all placeholder:text-lg placeholder:font-bold placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    placeholder="0.00"
                    value={cashReceivedStr}
                    onChange={e => setCashReceivedStr(e.target.value)}
                    autoFocus
                  />
                </div>

                {parseFloat(cashReceivedStr) >= cartTotals.payable && (
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-500 px-5 py-4 shadow-lg shadow-emerald-500/30">
                    <span className="text-sm font-black uppercase tracking-wide text-white">Change</span>
                    <span className="text-3xl font-black tabular-nums text-white">
                      {formatPeso(parseFloat(cashReceivedStr) - cartTotals.payable)}
                    </span>
                  </div>
                )}

                {checkoutError && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-100 px-4 py-3 text-sm font-bold text-rose-700">
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {checkoutError}
                  </div>
                )}

                {/* Quick cash buttons */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[20, 50, 100, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCashReceivedStr(String(amount))}
                      className="rounded-lg border-2 border-slate-200 bg-white py-2.5 text-sm font-black text-slate-700 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 active:translate-y-[2px] active:shadow-none"
                    >
                      ₱{amount}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashReceivedStr(String(cartTotals.payable))}
                    className="rounded-lg border-2 border-emerald-300 bg-emerald-50 py-2.5 text-sm font-black text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 active:translate-y-[2px] active:shadow-none"
                  >
                    Exact
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Item Breakdown ─── */}
          <div className="space-y-4">

            {/* Eligible Items */}
            <div className="overflow-hidden rounded-xl border border-emerald-300 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white">✓</span>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Eligible Items</p>
                </div>
                <span className="rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-white">
                  {eligibleCartRows.length}
                </span>
              </div>

              <div className="max-h-52 space-y-1.5 overflow-y-auto p-3 custom-scrollbar">
                {eligibleCartRows.length > 0 ? eligibleCartRows.map(row => (
                  <div key={row.medicineId} className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-3.5 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 text-xs font-black leading-tight text-slate-800">
                        {row.name}
                      </span>
                      <span className="shrink-0 text-xs font-black tabular-nums text-emerald-700">
                        {formatPeso(row.rowTotal)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-slate-500">×{row.quantity} {row.saleUnit}</span>
                      <span className="text-slate-400">Gross {formatPeso(row.unitPrice * row.unitFactor * row.quantity)}</span>
                    </div>
                  </div>
                )) : (
                  <p className="py-6 text-center text-xs font-bold text-emerald-600/50">No eligible items</p>
                )}
              </div>

              {eligibleCartRows.length > 0 && (
                <div className="border-t border-emerald-200 bg-emerald-50/60 px-4 py-3">
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800">Gross subtotal</span>
                      <span className="font-black tabular-nums text-emerald-800">{formatPeso(cartTotals.eligibleSubtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800">Payable</span>
                      <span className="font-black tabular-nums text-emerald-800">
                        {formatPeso(eligibleCartRows.reduce((t, r) => t + r.rowTotal, 0))}
                      </span>
                    </div>
                    {(selectedDiscount === 'senior' || selectedDiscount === 'pwd') && (
                      <>
                        <div className="flex items-center justify-between border-t border-dashed border-emerald-300 pt-1.5">
                          <span className="font-bold text-emerald-700">VAT-exempt base</span>
                          <span className="font-black tabular-nums text-emerald-700">{formatPeso(cartTotals.vatExemptBase)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-700">VAT exemption (12%)</span>
                          <span className="font-black tabular-nums text-emerald-700">−{formatPeso(cartTotals.vatExemption)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-700">{selectedDiscount === 'pwd' ? 'PWD' : 'Senior'} discount (20%)</span>
                          <span className="font-black tabular-nums text-emerald-700">−{formatPeso(cartTotals.seniorDiscount)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Not Eligible Items */}
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-400 text-[10px] font-black text-white">—</span>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Not Eligible</p>
                </div>
                <span className="rounded-md bg-slate-400 px-2.5 py-1 text-[11px] font-black text-white">
                  {nonEligibleCartRows.length}
                </span>
              </div>

              <div className="max-h-40 space-y-1.5 overflow-y-auto p-3 custom-scrollbar">
                {nonEligibleCartRows.length > 0 ? nonEligibleCartRows.map(row => (
                  <div key={row.medicineId} className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 text-xs font-black leading-tight text-slate-800">
                        {row.name}
                      </span>
                      <span className="shrink-0 text-xs font-black tabular-nums text-slate-700">
                        {formatPeso(row.rowTotal)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-slate-500">×{row.quantity} {row.saleUnit}</span>
                      <span className="text-slate-400">Regular {formatPeso(row.unitPrice * row.unitFactor * row.quantity)}</span>
                    </div>
                  </div>
                )) : (
                  <p className="py-6 text-center text-xs font-bold text-slate-400">No non-eligible items</p>
                )}
              </div>

              {nonEligibleCartRows.length > 0 && (
                <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600">Regular subtotal</span>
                      <span className="font-black tabular-nums text-slate-700">{formatPeso(cartTotals.nonEligibleSubtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600">Payable</span>
                      <span className="font-black tabular-nums text-slate-700">
                        {formatPeso(nonEligibleCartRows.reduce((t, r) => t + r.rowTotal, 0))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-dashed border-slate-300 pt-1.5">
                      <span className="font-bold text-slate-500">VAT included (12%)</span>
                      <span className="font-black tabular-nums text-slate-600">
                        {formatPeso(cartTotals.nonEligibleSubtotal - (cartTotals.nonEligibleSubtotal / (1 + VAT_RATE)))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ POS FOOTER ══════════ */}
      <div className="flex-shrink-0 border-t-2 border-slate-300 bg-white px-5 py-4">
        <div className="flex items-center gap-4">
          {/* Change display */}
          <div className="hidden flex-1 items-center gap-6 rounded-lg bg-slate-100 px-5 py-3 sm:flex">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total</p>
              <p className="text-sm font-black tabular-nums text-slate-700">{formatPeso(cartTotals.payable)}</p>
            </div>
            <div className="h-8 w-px bg-slate-300" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Cash</p>
              <p className="text-sm font-black tabular-nums text-slate-700">
                {cashReceivedStr ? formatPeso(parseFloat(cashReceivedStr)) : '₱0.00'}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-300" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Change</p>
              <p className="text-sm font-black tabular-nums text-emerald-600">
                {parseFloat(cashReceivedStr) >= cartTotals.payable
                  ? formatPeso(parseFloat(cashReceivedStr) - cartTotals.payable)
                  : '₱0.00'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex w-full gap-3 sm:w-auto">
            <button
              type="button"
              className={`${BTN_3D_SECONDARY} flex-1 px-6 py-3 text-sm sm:flex-none sm:px-8`}
              onClick={() => setView('summary')}
              disabled={checkoutLoading}
            >
              ← Back
            </button>
            <button
              type="button"
              className={`${BTN_3D_PRIMARY} flex-1 px-6 py-3 text-sm sm:flex-none sm:px-10`}
              onClick={handleCheckout}
              disabled={checkoutLoading || parseFloat(cashReceivedStr) < cartTotals.payable || isNaN(parseFloat(cashReceivedStr))}
            >
              {checkoutLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Processing…
                </>
              ) : (
                <>
                  Confirm Payment
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
      {/* ── INVENTORY DEDUCTION PREVIEW ── */}
{view === 'deduction' && (
  <div className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">

      {/* ══════════ HEADER ══════════ */}
      <div className="relative flex-shrink-0 overflow-hidden border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 px-6 py-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-600">
                Inventory Check
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                Stock Deduction Preview
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                FEFO allocation — earliest-expiring sellable batch will be deducted first.
              </p>
            </div>
          </div>

          {/* Summary badge */}
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-center shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Batches</p>
              <p className="text-sm font-black text-emerald-700">{deductionPlan.length}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-center shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Pieces</p>
              <p className="text-sm font-black text-rose-600">{plannedDeductionPieces}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ BODY ══════════ */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-5 custom-scrollbar">

        {/* Error */}
        {checkoutError && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>{checkoutError}</span>
          </div>
        )}

        {/* Info notice */}
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-4 py-3 text-xs font-semibold text-amber-800 shadow-sm">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>
            This is a <span className="font-black">preview</span>. Inventory is only deducted after you click
            <span className="font-black"> "Deduct Stock &amp; Complete Sale"</span>.
          </span>
        </div>

        {/* Allocation list */}
        {deductionPlan.length > 0 ? (
          <div className="space-y-3">
            {deductionPlan.map((allocation, index) => {
              const before = allocation.remainingAfter + allocation.quantity;
              const afterPercent = before > 0 ? (allocation.remainingAfter / before) * 100 : 0;

              return (
                <div
                  key={`${allocation.medicineId}-${allocation.batchNumber}-${index}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: product info */}
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-600">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {allocation.productName}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            Batch: <span className="font-bold text-slate-700">{allocation.batchNumber}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Expiry: <span className="font-bold text-slate-700">{allocation.expiryDate || 'No expiry date'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: deduction */}
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-black text-rose-600">−{allocation.quantity}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">pcs deducted</p>
                    </div>
                  </div>

                  {/* Stock bar */}
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>Stock after deduction</span>
                      <span className="tabular-nums">
                        <span className="text-slate-400">{before}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <span className={allocation.remainingAfter === 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {allocation.remainingAfter} pcs
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          afterPercent === 0
                            ? 'bg-rose-400'
                            : afterPercent < 30
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(2, afterPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50 p-6 text-center">
            <svg className="mx-auto h-10 w-10 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="mt-3 text-sm font-extrabold text-rose-700">No sellable batch allocation is available</p>
            <p className="mt-1 text-xs font-medium text-rose-600">Please go back and refresh inventory.</p>
          </div>
        )}

        {/* Mismatch warning */}
        {deductionPlan.length > 0 && plannedDeductionPieces !== cartPieceCount && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>
              Inventory changed while this sale was open. Please go back, refresh inventory, and review the cart again.
            </span>
          </div>
        )}
      </div>

      {/* ══════════ FOOTER ══════════ */}
      <div className="flex flex-shrink-0 gap-3 border-t border-slate-100 bg-white px-5 py-4">
        <button
          type="button"
          className={`${BTN_3D_SECONDARY} flex-1 px-4 py-3 text-sm`}
          onClick={() => setView('confirm')}
          disabled={checkoutLoading}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <button
          type="button"
          className={`${BTN_3D_PRIMARY} flex-[1.5] px-4 py-3 text-sm`}
          onClick={handleConfirmDeduction}
          disabled={checkoutLoading || !deductionPlan.length || plannedDeductionPieces !== cartPieceCount}
        >
          {checkoutLoading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Deducting…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Deduct Stock &amp; Complete Sale
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}

{/* ── RECEIPT MODAL ── */}
{view === 'receipt' && lastReceipt && (
  <Receipt
    sale={lastReceipt}
    settings={settings}
    onPrint={handlePrint}
    onDone={() => { setView('products'); setLastReceipt(null); }}
  />
)}
      {/* Past sales history */}
      {completedSales.length > 0 && (
        <section className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white p-6 shadow-lg shadow-emerald-100/20">
          <header className="mb-4 flex items-center gap-3">
            <span className="sr-only">Receipt</span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.4em] text-emerald-600">History</p>
              <h3 className="text-lg font-black text-slate-900">Completed Sales</h3>
            </div>
          </header>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedSales.map((sale, i) => {
              const total = sale.rows.reduce((s, r) => s + r.rowTotal, 0);
              return (
                <article key={i} className="rounded-2xl border-2 border-emerald-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">{sale.receiptNo}</p>
                      <p className="text-xs text-slate-500 font-medium">{sale.timestamp.toLocaleTimeString()}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">{sale.rows.length} items</span>
                  </div>
                  <p className="text-sm text-slate-700 truncate font-semibold">{sale.rows.map(r => r.name).join(', ')}</p>
                  <p className="mt-2 text-right text-lg font-black text-emerald-700">{formatPeso(total)}</p>
                </article>
              );
            })}
          </div>
        </section>
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
        @keyframes zoom-in-95 {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-in {
          animation-duration: 0.25s;
          animation-fill-mode: both;
        }
        .fade-in { animation-name: fade-in; }
        .zoom-in-95 { animation-name: zoom-in-95; }
      `}</style>
    </div>
  );
}
