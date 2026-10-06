import { API_BASE } from '../data/constants';
import { CustomerRecord, CustomerType } from '../types';

const apiFetch = async (path: string, init?: RequestInit) => {
  const token = localStorage.getItem('five_l_token') || localStorage.getItem('token');
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...init, headers });
};

const readError = async (response: Response) => {
  const body = await response.text();
  try { return JSON.parse(body).detail || body; } catch { return body || 'Request failed'; }
};

export async function searchCustomers(customerType: CustomerType, search = ''): Promise<CustomerRecord[]> {
  const params = new URLSearchParams({ customer_type: customerType });
  if (search.trim()) params.set('search', search.trim());
  const response = await apiFetch(`/customers?${params.toString()}`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function getCustomersByType(type: CustomerType): Promise<CustomerRecord[]> {
  const customers = await searchCustomers(type);
  return customers.sort((a, b) => a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' }));
}

export async function findCustomer(customerType: CustomerType, idNumber: string): Promise<CustomerRecord | null> {
  const response = await apiFetch(`/customers/${customerType}/${encodeURIComponent(idNumber.trim())}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function createCustomer(payload: Pick<CustomerRecord, 'customer_type' | 'id_number' | 'full_name'>): Promise<CustomerRecord> {
  const response = await apiFetch('/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function updateCustomer(id: number, payload: { full_name?: string; status?: 'active' | 'inactive' }): Promise<CustomerRecord> {
  const response = await apiFetch(`/customers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}
