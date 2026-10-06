/**
 * Staff Permissions - localStorage-based permission storage per staff ID.
 * Keys are stored as: `staff_perms_<staffId>`
 */

export interface StaffPermissions {
  can_process_pos: boolean;
  can_view_reports: boolean;
  can_adjust_inventory: boolean;
  can_approve_voids: boolean;
}

export type StaffAccountStatus = 'active' | 'disabled' | 'suspended';

export const DEFAULT_PERMISSIONS: StaffPermissions = {
  can_process_pos: true,
  can_view_reports: true,
  can_adjust_inventory: true,
  can_approve_voids: true,
};

const permKey = (staffId: number) => `staff_perms_${staffId}`;
const statusKey = (staffId: number) => `staff_status_${staffId}`;

export const STAFF_ACCESS_CHANGED_EVENT = 'five_l_staff_access_changed';

const emitStaffAccessChanged = (staffId: number) => {
  window.dispatchEvent(new CustomEvent(STAFF_ACCESS_CHANGED_EVENT, { detail: { staffId } }));
};

export function loadStaffPermissions(staffId: number): StaffPermissions {
  try {
    const raw = localStorage.getItem(permKey(staffId));
    if (!raw) return { ...DEFAULT_PERMISSIONS };
    return { ...DEFAULT_PERMISSIONS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PERMISSIONS };
  }
}

export function mergeStaffPermissions(staffId: number, source?: Partial<StaffPermissions> | null): StaffPermissions {
  const stored = loadStaffPermissions(staffId);
  return {
    can_process_pos: source?.can_process_pos ?? stored.can_process_pos,
    can_view_reports: source?.can_view_reports ?? stored.can_view_reports,
    can_adjust_inventory: source?.can_adjust_inventory ?? stored.can_adjust_inventory,
    can_approve_voids: source?.can_approve_voids ?? stored.can_approve_voids,
  };
}

export function saveStaffPermissions(staffId: number, perms: StaffPermissions): void {
  try {
    localStorage.setItem(permKey(staffId), JSON.stringify(perms));
    emitStaffAccessChanged(staffId);
  } catch {
    // silently fail
  }
}

export function loadStaffStatus(staffId: number): StaffAccountStatus {
  try {
    const raw = localStorage.getItem(statusKey(staffId));
    return raw === 'disabled' || raw === 'suspended' ? raw : 'active';
  } catch {
    return 'active';
  }
}

export function saveStaffStatus(staffId: number, status: StaffAccountStatus): void {
  try {
    localStorage.setItem(statusKey(staffId), status);
    emitStaffAccessChanged(staffId);
  } catch {
    // silently fail
  }
}

export function removeStaffAccess(staffId: number): void {
  try {
    localStorage.removeItem(permKey(staffId));
    localStorage.removeItem(statusKey(staffId));
    emitStaffAccessChanged(staffId);
  } catch {
    // silently fail
  }
}
