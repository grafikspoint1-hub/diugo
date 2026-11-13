'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Listing = { id: string; title: string; status: string; locality: string; expiresAt: string; seller: { name: string }; category: { name: string } };
type Report = { id: string; reason: string; createdAt: string; reporter: { name: string }; listing: { id: string; title: string; status: string; seller: { name: string } } };

export default function ClassifiedModerationPage() {
  const [token, setToken] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<'reports' | 'listings'>('reports');
  const [message, setMessage] = useState('Checking admin access…');
  const [loading, setLoading] = useState(true);

  async function load(accessToken: string) {
    const [listingResponse, reportResponse] = await Promise.all([
      fetch(`${apiBase}/admin/classifieds`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch(`${apiBase}/admin/classifieds/reports`, { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);
    if (!listingResponse.ok || !reportResponse.ok) throw new Error('Could not load moderation data. Verify admin access and backend availability.');
    setListings(await listingResponse.json() as Listing[]); setReports(await reportResponse.json() as Report[]);
  }

  useEffect(() => {
    const accessToken = localStorage.getItem('mydiu_access_token') ?? '';
    if (!accessToken) { setMessage('Sign in with an administrator account to access moderation.'); setLoading(false); return; }
    setToken(accessToken);
    fetch(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(async (response) => {
      if (!response.ok) throw new Error('Your session is unavailable.');
      const result = await response.json() as { user: { role: string } };
      if (!['ADMIN', 'SUPER_ADMIN'].includes(result.user.role)) throw new Error('Administrator access is required.');
      setAllowed(true); await load(accessToken); setMessage('');
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not verify access.')).finally(() => setLoading(false));
  }, []);

  async function moderateListing(id: string, status: 'ACTIVE' | 'PAUSED' | 'REMOVED') {
    const response = await fetch(`${apiBase}/admin/classifieds/${encodeURIComponent(id)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(result.message || 'Could not update listing.'); return; }
    setMessage('Listing moderation action saved.'); await load(token);
  }

  async function reviewReport(id: string, decision: 'RESOLVED' | 'DISMISSED') {
    const response = await fetch(`${apiBase}/admin/classifieds/reports/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ decision, resolution: decision === 'RESOLVED' ? 'Listing reviewed and removed.' : 'Report reviewed and dismissed.' }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(result.message || 'Could not review report.'); return; }
    setMessage('Report decision recorded.'); await load(token);
  }

  return <main className="shell section classifieds-page"><div className="sectionhead"><div><div className="kicker">Admin tools</div><h1>Buy & Sell moderation</h1><p className="muted">Review reports and manage community listings.</p></div><Link className="button secondary-button" href="/admin">Admin console</Link></div>
    {loading ? <div className="empty">{message}</div> : !allowed ? <div className="empty" role="alert">{message}<p><Link href="/account/login">Sign in →</Link></p></div> : <>
      {message && <p className="marketplace-message" role="status">{message}</p>}
      <div className="classified-tabs" role="group" aria-label="Moderation type"><button type="button" aria-pressed={tab === 'reports'} onClick={() => setTab('reports')}>Reports ({reports.length})</button><button type="button" aria-pressed={tab === 'listings'} onClick={() => setTab('listings')}>Listings ({listings.length})</button></div>
      {tab === 'reports' ? <section className="enquiry-list">{reports.length ? reports.map((report) => <article className="card enquiry-card" key={report.id}><span className="pill">Reported by {report.reporter.name}</span><h2>{report.listing.title}</h2><p><strong>Seller:</strong> {report.listing.seller.name}</p><p><strong>Reason:</strong> {report.reason}</p><p className="muted">{new Date(report.createdAt).toLocaleString()}</p><div className="classified-actions"><button type="button" onClick={() => void reviewReport(report.id, 'RESOLVED')}>Resolve & remove listing</button><button type="button" onClick={() => void reviewReport(report.id, 'DISMISSED')}>Dismiss report</button></div></article>) : <div className="empty">No pending listing reports.</div>}</section> : <section className="enquiry-list">{listings.map((listing) => <article className="card enquiry-card" key={listing.id}><span className={`listing-status status-${listing.status.toLowerCase()}`}>{listing.status}</span><h2>{listing.title}</h2><p>{listing.category.name} · {listing.locality} · Seller: {listing.seller.name}</p><p className="muted">Expires {new Date(listing.expiresAt).toLocaleDateString()}</p><div className="classified-actions">{listing.status !== 'ACTIVE' && <button type="button" onClick={() => void moderateListing(listing.id, 'ACTIVE')}>Restore active</button>}{listing.status === 'ACTIVE' && <button type="button" onClick={() => void moderateListing(listing.id, 'PAUSED')}>Pause</button>}{listing.status !== 'REMOVED' && <button type="button" onClick={() => void moderateListing(listing.id, 'REMOVED')}>Remove listing</button>}</div></article>)}</section>}
    </>}
  </main>;
}
