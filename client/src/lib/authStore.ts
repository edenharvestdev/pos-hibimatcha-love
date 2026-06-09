// Auth state management — stores JWT in memory and localStorage
// Components read from this store, never from localStorage directly

const TOKEN_KEY = "hibi-staff-token";

export type StaffSession = {
  id: number;
  employeeCode: string;
  firstName: string | null;
  lastName: string | null;
  role: "super_admin" | "staff_admin" | "staff";
  primaryBranchId: number | null;
  currentBranchId: number | null;
  token: string;
};

let _session: StaffSession | null = null;
const listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

export function getSession(): StaffSession | null {
  if (_session) return _session;
  // Restore from localStorage on first access
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as StaffSession;
      _session = parsed;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
  return _session;
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

export function setSession(session: StaffSession): void {
  _session = session;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  notify();
}

export function clearSession(): void {
  _session = null;
  localStorage.removeItem(TOKEN_KEY);
  notify();
}

export function subscribeToSession(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

export function hasRole(roles: string[]): boolean {
  const session = getSession();
  if (!session) return false;
  return roles.includes(session.role);
}
