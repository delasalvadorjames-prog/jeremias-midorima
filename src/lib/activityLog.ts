export type StaffActivityLog = {
  id: number;
  staffId: number;
  staffName: string;
  staffIdentifier: string;
  action: string;
  detail?: string;
  timestamp: string;
};

type LogInput = Omit<StaffActivityLog, 'id' | 'timestamp'> & {
  timestamp?: string;
};

const ACTIVITY_LOG_KEY = 'five_l_staff_activity_logs';
export const STAFF_ACTIVITY_CHANGED_EVENT = 'five_l_staff_activity_changed';

const readLogs = (): StaffActivityLog[] => {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLogs = (logs: StaffActivityLog[]) => {
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(logs.slice(0, 250)));
  window.dispatchEvent(new CustomEvent(STAFF_ACTIVITY_CHANGED_EVENT));
};

export function loadStaffActivityLogs(staffId?: number | null): StaffActivityLog[] {
  const logs = readLogs().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (staffId === undefined || staffId === null) return logs;
  return logs.filter((log) => log.staffId === staffId);
}

export function logStaffActivity(input: LogInput): StaffActivityLog {
  const logs = readLogs();
  const entry: StaffActivityLog = {
    ...input,
    id: Date.now() + Math.floor(Math.random() * 1000),
    timestamp: input.timestamp || new Date().toISOString(),
  };
  writeLogs([entry, ...logs]);
  return entry;
}
