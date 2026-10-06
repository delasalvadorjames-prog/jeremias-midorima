import { Transaction } from '../types';
import { API_BASE } from '../data/constants';

const API_BASE_CANDIDATES = Array.from(new Set([
  import.meta.env.VITE_API_BASE || import.meta.env.REACT_APP_API_BASE,
  API_BASE,
  'http://127.0.0.1:8000',
  'http://localhost:8000',
].filter(Boolean) as string[]));

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;
  const token = localStorage.getItem('five_l_token') || localStorage.getItem('token');
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  for (const baseUrl of API_BASE_CANDIDATES) {
    try {
      return await fetch(`${baseUrl}${path}`, { ...init, headers });
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `Unable to reach the backend API. ${lastError.message}`
      : 'Unable to reach the backend API.'
  );
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return 'Request failed';
  try {
    const data = JSON.parse(text);
    return data.detail || text;
  } catch {
    return text;
  }
}

export async function getTransactions(page = 1, size = 50, search = ''): Promise<Transaction[]> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));
  if (search) params.set('search', search);
  const res = await apiFetch(`/transactions?${params.toString()}`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function createTransaction(payload: {
  medicine_id: number;
  quantity: number;
  price: number;
  sale_reference?: string;
  customer_name?: string;
  customer_id?: number;
  customer_id_number?: string;
  discount_eligible?: boolean;
  eligible_subtotal?: number;
  non_eligible_subtotal?: number;
  sale_unit?: string;
  unit_factor?: number;
  category?: string;
  classification?: string;
  dosage_form?: string;
  cashier_name?: string;
  payment_method?: string;
  transaction_type?: string;
  cash_received?: number;
  change_amount?: number;
  customer_type?: 'regular' | 'senior_citizen' | 'pwd';
  gross_amount?: number;
  vatable_sales?: number;
  vat_amount?: number;
  vat_exempt_sales?: number;
  discount_amount?: number;
  senior_citizen_discount?: number;
  pwd_discount?: number;
  other_discount?: number;
  net_sales?: number;
}): Promise<Transaction> {
  const res = await apiFetch('/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function deleteTransaction(id: number): Promise<{ status: string }> {
  const res = await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}
