'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type Category = { id: string; name: string; slug: string };
type Listing = { id: string; categoryId: string; title: string; description: string; pricePaise: number; condition: string; locality: string; photoUrls: string[]; status: string; expiresAt: string; seller: { id: string; name: string }; category: { name: string; slug: string } };
type Enquiry = { id: string; listing: { id: string; title: string }; buyer: { name: string }; seller: { name: string }; message: string; reply?: string | null; createdAt: string };
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const emptyForm = { title: '', description: '', price: '', condition: 'GOOD', locality: 'Diu', categoryId: '', photoUrls: '' };

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`${apiBase}${path}`, { ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers } }); }
  catch { throw new Error('The classifieds service is unavailable. Start the backend and check its database connection.'); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message || 'Request failed');
  return result as T;
}

export function ClassifiedsMarketplace() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [token, setToken] = useState('');
  const [mode, setMode] = useState<'browse' | 'mine' | 'enquiries'>('browse');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ q: '', category: '', locality: '', minPrice: '', maxPrice: '', condition: '' });

  useEffect(() => {
    setToken(localStorage.getItem('mydiu_access_token') ?? '');
    request<Category[]>('/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  const load = useCallback(async (selectedMode: 'browse' | 'mine' | 'enquiries' = mode) => {
    setStatus('loading'); setMessage('');
    try {
      if (selectedMode === 'enquiries') {
        if (!token) throw new Error('Sign in to view your enquiries.');
        setEnquiries(await request<Enquiry[]>('/classifieds/enquiries/mine', token));
      } else if (selectedMode === 'mine') {
        if (!token) throw new Error('Sign in to manage your listings.');
        setListings(await request<Listing[]>('/classifieds/mine', token));
      } else {
        const params = new URLSearchParams();
        if (filters.q) params.set('q', filters.q);
        if (filters.category) params.set('category', filters.category);
        if (filters.locality) params.set('locality', filters.locality);
        if (filters.condition) params.set('condition', filters.condition);
        if (filters.minPrice) params.set('minPricePaise', String(Math.round(Number(filters.minPrice) * 100)));
        if (filters.maxPrice) params.set('maxPricePaise', String(Math.round(Number(filters.maxPrice) * 100)));
        setListings(await request<Listing[]>(`/classifieds?${params.toString()}`));
      }
      setStatus('ready');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load the marketplace'); setStatus('error'); }
  }, [filters, mode, token]);

  useEffect(() => { if (token || mode === 'browse') void load(mode); }, [token, mode, load]);

  const rupees = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }), []);

  function startEdit(listing: Listing) {
    setEditing(listing);
    setForm({ title: listing.title, description: listing.description, price: String(listing.pricePaise / 100), condition: listing.condition, locality: listing.locality, categoryId: listing.categoryId ?? '', photoUrls: listing.photoUrls.join('\n') });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!token) { setMessage('Sign in to post and manage listings.'); return; }
    setBusy(true); setMessage('');
    const payload = { title: form.title.trim(), description: form.description.trim(), pricePaise: Math.round(Number(form.price) * 100), condition: form.condition, locality: form.locality.trim(), categoryId: form.categoryId, photoUrls: form.photoUrls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean) };
    try {
      await request(editing ? `/classifieds/${editing.id}` : '/classifieds', token, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      setForm(emptyForm); setEditing(null); setMode('mine'); setMessage(editing ? 'Listing updated.' : 'Your listing is published for 30 days.');
      await load('mine');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save listing'); }
    finally { setBusy(false); }
  }

  async function listingAction(listing: Listing, action: 'pause' | 'resume' | 'sold' | 'remove' | 'renew') {
    if (!token) return;
    setBusy(true); setMessage('');
    try {
      if (action === 'remove') await request(`/classifieds/${listing.id}`, token, { method: 'DELETE' });
      else if (action === 'renew') await request(`/classifieds/${listing.id}/renew`, token, { method: 'POST' });
      else await request(`/classifieds/${listing.id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status: action === 'pause' ? 'PAUSED' : action === 'resume' ? 'ACTIVE' : 'SOLD' }) });
      await load('mine'); setMessage('Listing status updated.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update listing'); }
    finally { setBusy(false); }
  }

  async function reply(event: FormEvent<HTMLFormElement>, enquiryId: string) {
    event.preventDefault(); if (!token) return;
    const formElement = event.currentTarget; const replyText = String(new FormData(formElement).get('reply') ?? ''); setBusy(true);
    try { await request(`/classifieds/enquiries/${enquiryId}/reply`, token, { method: 'PATCH', body: JSON.stringify({ reply: replyText }) }); formElement.reset(); await load('enquiries'); setMessage('Reply sent to the buyer.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to reply'); }
    finally { setBusy(false); }
  }

  return <main className="shell section classifieds-page">
    <header className="classifieds-hero"><div><div className="kicker">Community marketplace · No checkout</div><h1>Buy & Sell in Diu</h1><p>Find something useful nearby, or give a pre-loved item a new home. Connect directly with the seller.</p><span className="classifieds-note">Independent from Shopping · Agree on details directly · No payment is processed here</span></div></header>
    <div className="classifieds-toolbar">
      <div className="classified-tabs" role="group" aria-label="Marketplace view">
        <button type="button" aria-pressed={mode === 'browse'} onClick={() => setMode('browse')}>Browse listings</button>
        <button type="button" aria-pressed={mode === 'mine'} onClick={() => { if (!token) setMessage('Sign in to manage your listings.'); setMode('mine'); }}>My listings</button>
        <button type="button" aria-pressed={mode === 'enquiries'} onClick={() => { if (!token) setMessage('Sign in to view your enquiries.'); setMode('enquiries'); }}>Enquiries</button>
      </div>
      <Link className="button secondary-button" href="/account/login">Sign in</Link>
    </div>
    {message && <p className="marketplace-message" role="status">{message}</p>}
    {mode === 'mine' && <section className="classifieds-form-card card"><div className="sectionhead"><div><div className="kicker">Seller tools</div><h2>{editing ? 'Edit listing' : 'List an item'}</h2></div>{editing && <button className="button secondary-button" type="button" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancel</button>}</div>
      {!token ? <p className="muted">Sign in to create or manage your listings. <Link href="/account/login">Sign in →</Link></p> : <form className="classifieds-form" onSubmit={submit}>
        <label>Title<input required minLength={4} maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label>Description<textarea required minLength={20} maxLength={5000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <div className="classifieds-form-row"><label>Price (₹)<input required type="number" min="0" step="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
          <label>Condition<select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })}><option value="NEW">New</option><option value="LIKE_NEW">Like new</option><option value="GOOD">Good</option><option value="FAIR">Fair</option></select></label>
          <label>Category<select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Choose a category</option>{categories.filter((category) => category.slug !== 'buy-sell').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        </div>
        <label>Location / locality<input required maxLength={100} value={form.locality} onChange={(event) => setForm({ ...form, locality: event.target.value })} placeholder="For example, Nagoa" /></label>
        <label>Photo URLs <span className="muted">One secure HTTPS image URL per line (up to 6). Direct upload is not configured.</span><textarea required rows={3} value={form.photoUrls} onChange={(event) => setForm({ ...form, photoUrls: event.target.value })} placeholder="https://…" /></label>
        <button className="button" disabled={busy || !categories.length}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}</button>
      </form>}
    </section>}
    {mode === 'browse' && <form className="classified-filters" onSubmit={(event) => { event.preventDefault(); void load('browse'); }}>
      <label className="filter-search">Search<input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="What are you looking for?" /></label>
      <label>Category<select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All categories</option>{categories.filter((category) => category.slug !== 'buy-sell').map((category) => <option value={category.slug} key={category.id}>{category.name}</option>)}</select></label>
      <label>Location<input value={filters.locality} onChange={(event) => setFilters({ ...filters, locality: event.target.value })} placeholder="Diu" /></label>
      <label>Condition<select value={filters.condition} onChange={(event) => setFilters({ ...filters, condition: event.target.value })}><option value="">Any condition</option><option value="NEW">New</option><option value="LIKE_NEW">Like new</option><option value="GOOD">Good</option><option value="FAIR">Fair</option></select></label>
      <label>Min ₹<input type="number" min="0" value={filters.minPrice} onChange={(event) => setFilters({ ...filters, minPrice: event.target.value })} /></label>
      <label>Max ₹<input type="number" min="0" value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })} /></label>
      <button className="button" type="submit">Apply filters</button>
    </form>}
    {status === 'loading' && <div className="empty">Loading listings…</div>}
    {status === 'error' && <div className="empty" role="alert">{message} <button type="button" className="text-button" onClick={() => void load(mode)}>Try again</button></div>}
    {mode === 'enquiries' && status === 'ready' && <section className="enquiry-list">{enquiries.length ? enquiries.map((enquiry) => <article className="card enquiry-card" key={enquiry.id}><p><strong>{enquiry.listing.title}</strong> · From {enquiry.buyer.name}</p><p>{enquiry.message}</p>{enquiry.reply && <p className="seller-reply"><strong>Seller replied:</strong> {enquiry.reply}</p>}{enquiry.seller.name && !enquiry.reply && <form onSubmit={(event) => void reply(event, enquiry.id)}><label>Reply to buyer<input name="reply" required minLength={2} maxLength={2000} /></label><button className="button" disabled={busy}>Send reply</button></form>}</article>) : <div className="empty">No enquiries yet.</div>}</section>}
    {(mode === 'browse' || mode === 'mine') && status === 'ready' && <section className="classified-listings" aria-live="polite">
      {listings.length ? listings.map((listing) => <article className="classified-card" key={listing.id}>
        <Link className="classified-photo" href={`/buy-sell/${listing.id}`} aria-label={`View ${listing.title}`}><img src={listing.photoUrls[0]} alt={listing.title} loading="lazy" /></Link>
        <div className="classified-card-content"><div className="classified-card-meta"><span className="pill">{listing.category.name}</span><span className={`listing-status status-${listing.status.toLowerCase()}`}>{listing.status}</span></div>
          <h2><Link href={`/buy-sell/${listing.id}`}>{listing.title}</Link></h2><strong className="classified-price">{rupees.format(listing.pricePaise / 100)}</strong>
          <p className="muted">{listing.condition.replace('_', ' ')} · {listing.locality}</p><p className="classified-seller">Listed by <Link href={`/buy-sell/seller/${listing.seller.id}`}>{listing.seller.name}</Link></p>
          {mode === 'mine' && <div className="classified-actions">{['ACTIVE', 'PAUSED', 'EXPIRED'].includes(listing.status) && <button type="button" onClick={() => startEdit(listing)}>Edit</button>}{listing.status === 'ACTIVE' && <button type="button" onClick={() => void listingAction(listing, 'pause')}>Pause</button>}{listing.status === 'PAUSED' && <button type="button" onClick={() => void listingAction(listing, 'resume')}>Resume</button>}{['ACTIVE', 'PAUSED'].includes(listing.status) && <button type="button" onClick={() => void listingAction(listing, 'sold')}>Mark sold</button>}{listing.status === 'EXPIRED' && <button type="button" onClick={() => void listingAction(listing, 'renew')}>Renew 30 days</button>}{listing.status !== 'REMOVED' && <button type="button" onClick={() => void listingAction(listing, 'remove')}>Remove</button>}</div>}
        </div>
      </article>) : <div className="empty">{mode === 'mine' ? 'You have no listings yet.' : 'No active listings matched those filters.'}</div>}
    </section>}
  </main>;
}
