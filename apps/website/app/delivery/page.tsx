'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type User = { name: string; role: string };
type Address = string | { line1?: string; line2?: string; locality?: string; city?: string; postalCode?: string } | null | undefined;
type Job = { id: string; status: string; partnerId?: string | null; pickupAddress: Address; dropAddress: Address; order: { orderNumber: string; business?: { name: string; address?: string | null }; items: Array<{ productName: string; quantity: number }> } };

const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
const formatAddress = (value: Address) => typeof value === 'string' ? value : value ? [value.line1, value.line2, value.locality, value.city, value.postalCode].filter(Boolean).join(', ') : 'Address not provided';
const nextAction: Record<string, [string, string]> = { ACCEPTED: ['AT_PICKUP', 'Arrived at pickup'], AT_PICKUP: ['PICKED_UP', 'Confirm pickup'], PICKED_UP: ['IN_TRANSIT', 'Start delivery'], IN_TRANSIT: ['DELIVERED', 'Mark delivered'] };

export default function DeliveryPartnerPage() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('Checking delivery partner access…');

  async function request<T>(path: string, accessToken: string, options?: RequestInit) {
    const response = await fetch(`${apiBase}${path}`, { ...options, headers: { Authorization: `Bearer ${accessToken}`, ...(options?.headers || {}) }, cache: 'no-store' });
    const result = await response.json().catch(() => null) as T | { message?: string } | null;
    if (!response.ok) throw new Error(result && typeof result === 'object' && 'message' in result ? String(result.message) : 'Request failed');
    return result as T;
  }

  async function loadJobs(accessToken: string) {
    setJobs(await request<Job[]>('/delivery/jobs', accessToken) ?? []);
  }

  useEffect(() => {
    const accessToken = localStorage.getItem('mydiu_access_token') ?? '';
    if (!accessToken) { setMessage('Sign in with a delivery-partner account to continue.'); setLoading(false); return; }
    setToken(accessToken);
    request<{ user: User }>('/auth/me', accessToken).then(async result => { if (result.user.role !== 'DELIVERY_PARTNER') throw new Error('This account is not approved as a delivery partner.'); setUser(result.user); await loadJobs(accessToken); setMessage(''); }).catch(error => setMessage(error instanceof Error ? error.message : 'Could not load delivery panel.')).finally(() => setLoading(false));
  }, []);

  async function acceptJob(id: string) {
    setBusy(id);
    try { await request(`/delivery/jobs/${encodeURIComponent(id)}/accept`, token, { method: 'PATCH' }); await loadJobs(token); setMessage('Delivery accepted.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not accept delivery.'); } finally { setBusy(''); }
  }

  async function updateStatus(id: string, status: string) {
    setBusy(id);
    try { await request(`/delivery/jobs/${encodeURIComponent(id)}/status`, token, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); await loadJobs(token); setMessage(`Delivery marked ${label(status).toLowerCase()}.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update delivery.'); } finally { setBusy(''); }
  }

  if (loading) return <main className="shell delivery-shell"><div className="empty">{message}</div></main>;
  if (!token || !user) return <main className="shell delivery-shell"><div className="card account-card"><div className="kicker">DIU GO delivery network</div><h1>Partner sign in</h1><p className="muted">{message}</p><Link className="button" href="/account/login">Sign in</Link></div></main>;

  const available = jobs.filter(job => job.status === 'UNASSIGNED' && !job.partnerId);
  const mine = jobs.filter(job => Boolean(job.partnerId));
  const card = (job: Job, isAvailable: boolean) => {
    const action = nextAction[job.status];
    return <article className="card delivery-job" key={job.id}><div className="delivery-job-head"><div><span className="pill">{label(job.status)}</span><h3>{job.order.orderNumber}</h3></div>{isAvailable && <span className="delivery-available">Available</span>}</div><div className="delivery-job-info"><div><strong>Pickup store</strong>{job.order.business?.name || 'DIU GO partner'}<small>{formatAddress(job.pickupAddress) || formatAddress(job.order.business?.address)}</small></div><div><strong>Drop-off address</strong>{formatAddress(job.dropAddress)}</div><div><strong>Order items</strong>{job.order.items.map(item => `${item.productName} × ${item.quantity}`).join(' · ') || 'Order details unavailable'}</div></div><div className="delivery-job-actions">{isAvailable ? <button className="button" type="button" disabled={busy === job.id} onClick={() => void acceptJob(job.id)}>{busy === job.id ? 'Accepting…' : 'Accept delivery'}</button> : action ? <button className="button" type="button" disabled={busy === job.id} onClick={() => void updateStatus(job.id, action[0])}>{busy === job.id ? 'Updating…' : action[1]}</button> : <span className="muted">Waiting for the next delivery action.</span>}</div></article>;
  };

  return <main className="shell delivery-shell"><header className="delivery-header"><div><div className="kicker">DIU GO delivery network</div><h1>Delivery partner</h1><p className="muted">Hello, {user.name}. Accept jobs and keep customers updated.</p></div><div className="delivery-header-actions"><Link className="button secondary-button" href="/">Marketplace</Link><button className="button" type="button" onClick={() => { localStorage.removeItem('mydiu_access_token'); window.location.assign('/account/login'); }}>Sign out</button></div></header>{message && <p className="marketplace-message" role="status">{message}</p>}<div className="delivery-stats"><article><span>Available</span><strong>{available.length}</strong><small>Jobs ready to accept</small></article><article><span>My active route</span><strong>{mine.length}</strong><small>Assigned deliveries</small></article><article><span>Partner status</span><strong>LIVE</strong><small>Account approved</small></article></div><section className="delivery-section"><div className="sectionhead"><div><div className="kicker">Delivery queue</div><h2>Available jobs</h2></div><button className="button secondary-button" type="button" onClick={() => void loadJobs(token)}>Refresh jobs</button></div>{available.length ? <div className="delivery-job-grid">{available.map(job => card(job, true))}</div> : <div className="empty">No delivery jobs are available right now.</div>}</section><section className="delivery-section"><div className="sectionhead"><div><div className="kicker">Your route</div><h2>My deliveries</h2></div></div>{mine.length ? <div className="delivery-job-grid">{mine.map(job => card(job, false))}</div> : <div className="empty">No active deliveries assigned.</div>}</section><aside className="delivery-note"><strong>Delivery safety</strong><span>Confirm pickup and delivery only after completing the physical handoff. GPS tracking and proof-of-delivery OTP are not enabled in this release.</span></aside></main>;
}
