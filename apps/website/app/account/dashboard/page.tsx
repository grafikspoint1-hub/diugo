'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type User = { id: string; name: string; email?: string | null; phone?: string | null; role: string; status: string };
type Order = { id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string; business?: { name: string } | null; items: Array<{ productName: string; quantity: number }> };
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'loading' | 'signed-out' | 'error' | 'ready'>('loading');

  useEffect(() => {
    const token = localStorage.getItem('mydiu_access_token');
    if (!token) { setState('signed-out'); return; }
    fetch(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then(async identityResponse => {
      if (!identityResponse.ok) throw new Error('Your session has expired.');
      const identity = await identityResponse.json() as { user: User };
      setUser(identity.user);
      try {
        const ordersResponse = await fetch(`${apiBase}/orders`, { headers: { Authorization: `Bearer ${token}` } });
        if (ordersResponse.ok) setOrders(await ordersResponse.json() as Order[]);
        else setMessage('Order history is temporarily unavailable.');
      } catch { setMessage('Order history is temporarily unavailable.'); }
      setState('ready');
    }).catch(() => { localStorage.removeItem('mydiu_access_token'); setState('error'); });
  }, []);

  function logout() {
    localStorage.removeItem('mydiu_access_token');
    window.location.assign('/account');
  }

  if (state === 'loading') return <main className="shell section"><div className="empty">Loading your DIU GO account…</div></main>;
  if (state === 'signed-out' || state === 'error') return <main className="shell section"><div className="card account-card"><div className="kicker">Customer access</div><h1>Sign in required</h1><p className="muted">{state === 'error' ? 'Your session expired or the account service is unavailable.' : 'Sign in to view your customer dashboard.'}</p><Link className="button" href="/account/login">Sign in</Link></div></main>;

  return <main className="shell section">
    <div className="sectionhead"><div><div className="kicker">Customer dashboard</div><h1>Hello, {user?.name}</h1><p className="muted">Your DIU GO account is active.</p></div><button className="button" onClick={logout}>Sign out</button></div>
    <div className="grid">
      <article className="card"><span className="icon" aria-hidden="true">👤</span><h2>Profile</h2><p className="muted">{user?.email ?? user?.phone ?? 'Contact not provided'}</p><span className="status">{user?.status}</span></article>
      <Link className="card" href="/buy-sell"><span className="icon" aria-hidden="true">↔</span><h2>Buy & Sell</h2><p className="muted">Manage your community listings and enquiries.</p></Link>
      <Link className="card" href="/events"><span className="icon" aria-hidden="true">🎟️</span><h2>Events</h2><p className="muted">Discover upcoming Diu events. Ticket ordering is not available yet.</p></Link>
      <Link className="card" href="/emergency"><span className="icon" aria-hidden="true">☎</span><h2>Emergency help</h2><p className="muted">Open the emergency contacts directory.</p></Link>
    </div>
    <section className="admin-section"><div className="sectionhead"><div><div className="kicker">Your activity</div><h2>Order history</h2></div></div>{message && <p className="muted" role="status">{message}</p>}{orders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Store</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><strong>{order.orderNumber}</strong></td><td>{order.business?.name || 'DIU GO store'}</td><td>{order.items.map(item => `${item.productName} × ${item.quantity}`).join(', ')}</td><td>₹{(order.totalPaise / 100).toLocaleString('en-IN')}</td><td>{order.status.replaceAll('_', ' ')}</td><td>{new Date(order.createdAt).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div> : <div className="empty">No orders yet. <Link href="/categories">Browse local shops</Link></div>}</section>
  </main>;
}
