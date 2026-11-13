'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

type Listing = { id: string; title: string; description: string; pricePaise: number; condition: string; locality: string; photoUrls: string[]; expiresAt: string; seller: { id: string; name: string; createdAt: string }; category: { name: string } };
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export function ClassifiedListingDetail({ listingId }: { listingId: string }) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const token = typeof window === 'undefined' ? '' : window.localStorage.getItem('mydiu_access_token') ?? '';

  useEffect(() => {
    fetch(`${apiBase}/classifieds/${encodeURIComponent(listingId)}`).then(async (response) => {
      if (!response.ok) throw new Error(response.status === 404 ? 'This listing is no longer available.' : 'Could not load listing.');
      setListing(await response.json() as Listing);
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load listing.')).finally(() => setLoading(false));
  }, [listingId]);

  async function action(event: FormEvent<HTMLFormElement>, type: 'enquiries' | 'reports') {
    event.preventDefault(); if (!token) { setMessage('Sign in to contact the seller or report a listing.'); return; }
    const form = event.currentTarget; const field = type === 'enquiries' ? 'message' : 'reason'; const value = String(new FormData(form).get(field) ?? ''); setBusy(true); setMessage('');
    try {
      const response = await fetch(`${apiBase}/classifieds/${encodeURIComponent(listingId)}/${type}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ [field]: value }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Request failed');
      form.reset(); setMessage(type === 'enquiries' ? 'Your enquiry was sent to the seller.' : 'Thank you. The report was sent to the moderation team.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to submit your request'); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="shell section"><div className="empty">Loading listing…</div></main>;
  if (!listing) return <main className="shell section"><div className="empty" role="alert">{message || 'Listing unavailable.'}<p><Link href="/buy-sell">Back to Buy & Sell</Link></p></div></main>;
  return <main className="shell section classifieds-page"><Link className="text-link" href="/buy-sell">← Back to listings</Link><div className="listing-detail-grid">
    <section className="listing-gallery card"><img className="listing-main-image" src={listing.photoUrls[photoIndex]} alt={listing.title} />{listing.photoUrls.length > 1 && <div className="listing-thumbnails">{listing.photoUrls.map((url, index) => <button type="button" key={url} aria-label={`Show photo ${index + 1}`} aria-pressed={photoIndex === index} onClick={() => setPhotoIndex(index)}><img src={url} alt="" /></button>)}</div>}</section>
    <section className="listing-detail card"><span className="pill">{listing.category.name} · {listing.condition.replace('_', ' ')}</span><h1>{listing.title}</h1><strong className="classified-price">₹{(listing.pricePaise / 100).toLocaleString('en-IN')}</strong><p className="muted">{listing.locality} · Listed {new Date(listing.expiresAt).toLocaleDateString('en-IN')}</p><p className="listing-description">{listing.description}</p><div className="seller-profile-card"><span>Seller</span><Link href={`/buy-sell/seller/${listing.seller.id}`}>{listing.seller.name} · View profile</Link></div>
      <form className="contact-seller-form" onSubmit={(event) => void action(event, 'enquiries')}><label>Ask the seller<input name="message" required minLength={5} maxLength={2000} placeholder="Is this still available?" /></label><button className="button" type="submit" disabled={busy}>Send enquiry</button></form>
      <details className="report-listing"><summary>Report this listing</summary><form onSubmit={(event) => void action(event, 'reports')}><label>Reason<textarea name="reason" required minLength={5} maxLength={1000} rows={3} /></label><button className="button secondary-button" type="submit" disabled={busy}>Submit report</button></form></details>
      <p className="marketplace-note">DIU GO does not collect payment for classified listings. Contact the seller directly and use your own judgement when arranging an exchange.</p>
      {message && <p className="marketplace-message" role="status">{message}</p>}
    </section>
  </div></main>;
}
