import { getAuthToken } from '../firebase';
import { PaymentRecord } from '../types';

export async function fetchBillingHistory(): Promise<PaymentRecord[]> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : 'Bearer mock-dev-token',
  };
  const res = await fetch('/api/billing/history', { headers });
  if (!res.ok) {
    throw new Error('Failed to fetch billing history');
  }
  const data = await res.json();
  return data.payments || [];
}
