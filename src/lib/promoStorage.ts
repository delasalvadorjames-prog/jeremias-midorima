import { CustomPromo } from '../types';

const PROMOS_STORAGE_KEY = 'five_l_custom_promos';
const PROMOS_UPDATED_EVENT = 'five_l_promos_updated';

export function loadCustomPromos(): Record<number, CustomPromo> {
  try {
    const raw = localStorage.getItem(PROMOS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<Record<number, CustomPromo>>((promos, [key, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return promos;
      const promo = value as Partial<CustomPromo>;
      const medicineId = Number(promo.medicineId);
      const discountPercent = Number(promo.discountPercent);
      const promoPrice = Number(promo.promoPrice);
      const storageKey = Number(key);
      const today = new Date().toISOString().slice(0, 10);

      // Ignore corrupt records instead of allowing them to crash the promo UI.
      if (!Number.isFinite(medicineId) || !Number.isFinite(storageKey) || typeof promo.medicineName !== 'string') return promos;
      if (typeof promo.endDate === 'string' && promo.endDate && promo.endDate < today) return promos;
      promos[storageKey] = {
        ...promo,
        medicineId,
        discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0,
        promoPrice: Number.isFinite(promoPrice) ? promoPrice : 0,
        promoLabel: typeof promo.promoLabel === 'string' ? promo.promoLabel : '',
        badgeText: typeof promo.badgeText === 'string' ? promo.badgeText : 'Promo',
        isActive: Boolean(promo.isActive),
      } as CustomPromo;
      return promos;
    }, {});
  } catch (err) {
    console.error('Failed to load custom promos:', err);
    return {};
  }
}

export function saveCustomPromo(promo: CustomPromo): Record<number, CustomPromo> {
  try {
    const promos = loadCustomPromos();
    promos[promo.medicineId] = {
      ...promo,
      createdAt: promo.createdAt || new Date().toISOString(),
    };
    localStorage.setItem(PROMOS_STORAGE_KEY, JSON.stringify(promos));
    window.dispatchEvent(new Event(PROMOS_UPDATED_EVENT));
    return promos;
  } catch (err) {
    console.error('Failed to save custom promo:', err);
    return loadCustomPromos();
  }
}

export function removeCustomPromo(medicineId: number): Record<number, CustomPromo> {
  try {
    const promos = loadCustomPromos();
    delete promos[medicineId];
    localStorage.setItem(PROMOS_STORAGE_KEY, JSON.stringify(promos));
    window.dispatchEvent(new Event(PROMOS_UPDATED_EVENT));
    return promos;
  } catch (err) {
    console.error('Failed to remove custom promo:', err);
    return loadCustomPromos();
  }
}

export function toggleCustomPromo(medicineId: number): Record<number, CustomPromo> {
  const promos = loadCustomPromos();
  if (promos[medicineId]) {
    promos[medicineId].isActive = !promos[medicineId].isActive;
    localStorage.setItem(PROMOS_STORAGE_KEY, JSON.stringify(promos));
    window.dispatchEvent(new Event(PROMOS_UPDATED_EVENT));
  }
  return promos;
}
