import { Medicine, PharmacySettings, ProductSaleEntry, StaffMember } from '../types';

export type AccountState = {
  medicines: Medicine[];
  settings: PharmacySettings;
  salesTrend: ProductSaleEntry[];
};

export type StaffAccountSnapshot = {
  staff: StaffMember;
  state: AccountState;
};

export const CURRENT_ACCOUNT_EMAIL_KEY = 'five_l_current_user_email';

let accountStorageWriteBlocked = false;
let accountStorageWarningShown = false;

const cloneSettings = (settings: PharmacySettings): PharmacySettings => ({ ...settings });

export const normalizeAccountEmail = (email: string) => email.trim().toLowerCase();

export const getAccountStateKey = (email: string) =>
  `five_l_account_state_${email.trim().toLowerCase()}`;

export const createEmptyAccountState = (defaultSettings: PharmacySettings): AccountState => ({
  medicines: [],
  settings: cloneSettings(defaultSettings),
  salesTrend: [],
});

export function loadAccountState(
  email: string,
  defaultSettings: PharmacySettings
): AccountState {
  if (!email.trim()) {
    return createEmptyAccountState(defaultSettings);
  }

  const raw = localStorage.getItem(getAccountStateKey(email));
  if (!raw) {
    return createEmptyAccountState(defaultSettings);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AccountState>;

    return {
      medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
      settings: {
        ...cloneSettings(defaultSettings),
        ...(parsed.settings || {}),
      },
      salesTrend: Array.isArray(parsed.salesTrend) ? parsed.salesTrend : [],
    };
  } catch {
    return createEmptyAccountState(defaultSettings);
  }
}

export function saveAccountState(email: string, state: AccountState) {
  if (!email.trim() || accountStorageWriteBlocked) return false;

  try {
    localStorage.setItem(getAccountStateKey(email), JSON.stringify(state));
    return true;
  } catch (error) {
    // A full browser storage quota must not take down the React tree. Keep the
    // current in-memory state alive and skip further writes for this session.
    accountStorageWriteBlocked = true;
    if (!accountStorageWarningShown) {
      accountStorageWarningShown = true;
      console.warn(
        'Account data could not be saved because browser storage is full. The current session will continue without local persistence.',
        error,
      );
    }
    return false;
  }
}

export function loadStaffAccountSnapshots(
  globalState: AccountState,
  staffMembers: StaffMember[],
  defaultSettings: PharmacySettings
): StaffAccountSnapshot[] {
  return staffMembers.map((staff) => {
    const assignedCategories = (staff.assigned_category || '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    return {
      staff,
      state: {
        ...globalState,
        medicines: globalState.medicines.filter(
          (m) =>
            m.added_by === staff.id ||
            assignedCategories.includes((m.category || '').trim().toLowerCase())
        ),
      },
    };
  });
}
