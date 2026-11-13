'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SellerListings = { seller: { id: string; name: string; createdAt: string }; listingCount: number; listings: Array<{ id: string; title: string; pricePaise: number; photoUrls: string[]; locality: string; category: { name: string } }> };
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function SellerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [sellerId, setSellerId] = useState('');
  const [profile, setProfile] = useState<SellerListings | null>(null);
  const [message, setMessage] = useState('Loading seller profile…');
  useEffect(() => { void params.then(({ id }) => { setSellerId(id); fetch(`${apiBase}/classifieds/sellers/${encodeURIComponent(id)}`).then(async (response) => { if (!response.ok) throw new Error('Seller profile is unavailable.'); const result = await response.json() as SellerListings; setProfile(result); setMessage(''); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load this profile.')); }); }, [params]);
  if (!profile) return <main className="shell section"><div className="empty">{message}</div></main>;
  return <main className="shell section classifieds-page"><Link className="text-link" href="/buy-sell">← Back to Buy & Sell</Link><section className="card seller-profile-header"><div className="seller-avatar" aria-hidden="true">{profile.seller.name.slice(0, 1).toUpperCase()}</div><div><div className="kicker">Community seller</div><h1>{profile.seller.name}</h1><p className="muted">Member since {new Date(profile.seller.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} · {profile.listingCount} active listings</p></div></section><section className="section"><h2>Active listings</h2>{profile.listings.length ? <div className="classified-listings">{profile.listings.map((listing) => <article className="classified-card" key={listing.id}><Link className="classified-photo" href={`/buy-sell/${listing.id}`}><img src={listing.photoUrls[0]} alt={listing.title} loading="lazy" /></Link><div className="classified-card-content"><span className="pill">{listing.category.name}</span><h2><Link href={`/buy-sell/${listing.id}`}>{listing.title}</Link></h2><strong className="classified-price">₹{(listing.pricePaise / 100).toLocaleString('en-IN')}</strong><p className="muted">{listing.locality}</p></div></article>)}</div> : <div className="empty">This seller has no active listings right now.</div>}</section><span className="visually-hidden">Seller ID {sellerId}</span></main>;
}
