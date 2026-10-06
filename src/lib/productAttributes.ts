import { Medicine } from '../types';

export const LIQUID_DOSAGE_FORMS = ['Syrup', 'Suspension', 'Injectable', 'Drops'];
const NON_MEDICINE_FORMS = ['other', 'others', 'medical supply', 'medical device'];
const TOPICAL_FORMS = ['cream', 'ointment', 'lotion'];

const cleanText = (value?: string | null) => String(value || '').replace(/\s+/g, ' ').trim();

export const isVolumeValue = (value?: string | null) =>
  /^\d+(?:\.\d+)?\s*(?:mL|L)$/i.test(cleanText(value));

const isTopicalSizeValue = (value: string) =>
  /^\d+(?:\.\d+)?\s*(?:mL|L|g|kg)$/i.test(cleanText(value));

export const isValidVolumeForDosageForm = (value: string, dosageForm?: string) => {
  const cleaned = cleanText(value);
  if (!cleaned) return true;

  const form = cleanText(dosageForm).toLowerCase();
  if (form === 'tablet' || form === 'capsule') return false;
  if (LIQUID_DOSAGE_FORMS.map((item) => item.toLowerCase()).includes(form)) return isVolumeValue(cleaned);
  if (TOPICAL_FORMS.includes(form)) return isTopicalSizeValue(cleaned);
  return isVolumeValue(cleaned);
};

export const formatStrengthValue = (value?: string | null) => {
  const cleaned = cleanText(value);
  if (!cleaned) return '';
  // A bottle/package size belongs in Volume, not Strength. Keep valid
  // concentrations such as "100 mg/5 mL" because those describe dosage.
  if (isVolumeValue(cleaned)) return '';
  return cleaned
    .replace(/\s*\/\s*/g, '/')
    .replace(/(\d)\s*(mg|mcg|mL|L|g)\b/gi, '$1 $2');
};

export const formatVolumeValue = (value?: string | null) => {
  const cleaned = cleanText(value);
  if (!isVolumeValue(cleaned)) return '';
  return cleaned.replace(/\s*(mL|L)$/i, ' $1');
};

const formatTopicalSizeValue = (value?: string | null) => {
  const cleaned = cleanText(value);
  if (!isTopicalSizeValue(cleaned)) return '';
  return cleaned.replace(/\s*(mL|L|g|kg)$/i, ' $1');
};

const extractConcentrationFromText = (value: string) =>
  value.match(/\d+(?:\.\d+)?\s*(?:mg|mcg|g)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mL|L))?/i)?.[0] || '';

const extractStandaloneVolumeFromName = (value: string) => {
  const matches = value.matchAll(/\d+(?:\.\d+)?\s*(?:mL|L)(?!\w)/gi);
  for (const match of matches) {
    const before = value.slice(0, match.index ?? 0).trimEnd();
    // The denominator in 125 mg/5 mL is concentration, not bottle volume.
    if (before.endsWith('/')) continue;
    return formatVolumeValue(match[0]);
  }
  return '';
};

export const getStrengthForDisplay = (medicine: Medicine) => {
  const form = cleanText(medicine.dosage_form).toLowerCase();
  if (NON_MEDICINE_FORMS.includes(form)) return '';

  const storedStrength = formatStrengthValue(medicine.strength);
  const concentrationInVolume = extractConcentrationFromText(cleanText(medicine.volume));
  // Some legacy records accidentally stored the concentration in Volume.
  // Preserve the data, but display that concentration as Strength instead.
  if (concentrationInVolume.includes('/')) return formatStrengthValue(concentrationInVolume);
  if (storedStrength) return storedStrength;

  return formatStrengthValue(extractConcentrationFromText(cleanText(medicine.name)));
};

export const getVolumeForDisplay = (medicine: Medicine) => {
  const form = cleanText(medicine.dosage_form).toLowerCase();
  if (form === 'tablet' || form === 'capsule') return '';

  const storedVolume = TOPICAL_FORMS.includes(form)
    ? formatTopicalSizeValue(medicine.volume)
    : formatVolumeValue(medicine.volume);
  if (storedVolume) return storedVolume;

  return extractStandaloneVolumeFromName(cleanText(medicine.name));
};

export const normalizeVolumeForSave = (value: string, dosageForm: string) => {
  const form = cleanText(dosageForm).toLowerCase();
  if (form === 'tablet' || form === 'capsule') return '';
  if (LIQUID_DOSAGE_FORMS.map((item) => item.toLowerCase()).includes(form)) return formatVolumeValue(value);
  if (TOPICAL_FORMS.includes(form)) return formatTopicalSizeValue(value);
  return cleanText(value);
};
