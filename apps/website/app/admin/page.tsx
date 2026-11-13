'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Overview = { customers: number; approvedVendors: number; pendingVendors: number; products: number; orders: number; bookings: number };
type PendingBusiness = { id: string; name: string; locality?: string | null; owner: { name: string; email?: string | null; phone?: string | null }; category?: { name: string } | null; createdAt: string };
type AdminUser = { id: string; name: string; username?: string | null; email?: string | null; phone?: string | null; role: string; status: string; createdAt: string };
type AdminOrder = { id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string; customer: { name: string; phone?: string | null }; business?: { name: string } | null };

const tools = [
  { href: '/admin/classifieds', icon: '↔', title: 'Buy & Sell moderation', description: 'Review reports and manage community listings.' },
  { href: '/admin/emergency-contacts', icon: '✚', title: 'Emergency contacts', description: 'Verify and publish authoritative helplines.' },
  { href: '/categories', icon: '◈', title: 'Public directory', description: 'View approved local businesses.' },
  { href: '/events', icon: '✦', title: 'Events preview', description: 'Review the published events experience.' },
];

export default function AdminDashboardPage() {
  const [message, setMessage] = useState('Checking administrator access…');
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [pending, setPending] = useState<PendingBusiness[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [token, setToken] = useState('');

  useEffect(() => {
    const accessToken = localStorage.getItem('mydiu_access_token') ?? '';
    if (!accessToken) { setMessage('Sign in with an administrator account to access the admin console.'); setLoading(false); return; }
    setToken(accessToken);
    const headers = { Authorization: `Bearer ${accessToken}` };
    Promise.all([fetch(`${apiBase}/auth/me`, { headers }), fetch(`${apiBase}/admin/overview`, { headers }), fetch(`${apiBase}/admin/businesses/pending`, { headers }), fetch(`${apiBase}/admin/users`, { headers }), fetch(`${apiBase}/admin/orders`, { headers })])
      .then(async ([identity, overviewResponse, pendingResponse, usersResponse, ordersResponse]) => {
        if (!identity.ok) throw new Error('Your administrator session is unavailable.');
        const identityResult = await identity.json() as { user: { role: string } };
        if (!['ADMIN', 'SUPER_ADMIN'].includes(identityResult.user.role)) throw new Error('Administrator access is required.');
        setAllowed(true);
        if (overviewResponse.ok) setOverview(await overviewResponse.json() as Overview);
        if (pendingResponse.ok) setPending(await pendingResponse.json() as PendingBusiness[]);
        if (usersResponse.ok) setUsers(await usersResponse.json() as AdminUser[]);
        if (ordersResponse.ok) setOrders(await ordersResponse.json() as AdminOrder[]);
        if (!overviewResponse.ok || !pendingResponse.ok || !usersResponse.ok || !ordersResponse.ok) setMessage('Admin access is valid, but some live operational data is unavailable.');
        else setMessage('');
      })
      .catch(error => setMessage(error instanceof Error ? error.message : 'Could not verify access.'))
      .finally(() => setLoading(false));
  }, []);

  async function decideBusiness(id: string, decision: 'APPROVE' | 'REJECT') {
    const response = await fetch(`${apiBase}/admin/businesses/${encodeURIComponent(id)}/decision`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ decision }) });
    if (!response.ok) { setMessage('Could not save the business decision.'); return; }
    setPending(current => current.filter(item => item.id !== id));
    setMessage(`Business ${decision === 'APPROVE' ? 'approved' : 'rejected'}.`);
  }

  async function assignRole(userId: string, role: string) {
    const response = await fetch(`${apiBase}/admin/users/${encodeURIComponent(userId)}/role`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ role }) });
    if (!response.ok) { setMessage('Could not update this account role.'); return; }
    setUsers(current => current.map(user => user.id === userId ? { ...user, role, status: 'ACTIVE' } : user));
    setMessage('Operational role assigned.');
  }

  if (loading) return <main className="shell admin-shell"><div className="empty">{message}</div></main>;
  if (!allowed) return <main className="shell admin-shell"><div className="card account-card"><div className="kicker">DIU GO admin console</div><h1>Administrator access required</h1><p className="muted">{message}</p><Link className="button" href="/admin/login">Admin sign in</Link></div></main>;

  const stats = overview ? [
    ['Customers', overview.customers, 'Registered accounts'], ['Approved vendors', overview.approvedVendors, 'Verified businesses'], ['Pending review', overview.pendingVendors, 'Businesses awaiting approval'], ['Products', overview.products, 'Catalog records'], ['Orders', overview.orders, 'Commerce orders'], ['Bookings', overview.bookings, 'Booking records'],
  ] : [];

  return <main className="shell admin-shell">
    <header className="admin-header"><div><div className="kicker">DIU GO operations</div><h1>Admin console</h1><p className="muted">Monitor the city marketplace and manage trusted local content.</p></div><div className="admin-header-actions"><Link className="button secondary-button" href="/">View site</Link><Link className="button" href="/account/dashboard">Account</Link></div></header>
    {message && <p className="marketplace-message" role="status">{message}</p>}
    {stats.length > 0 && <section className="admin-stats" aria-label="Operational overview">{stats.map(([label, value, detail]) => <article className="admin-stat" key={String(label)}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</section>}
    <section className="admin-section"><div className="sectionhead"><div><div className="kicker">Operations</div><h2>Admin tools</h2></div></div><div className="admin-tool-grid">{tools.map(tool => <Link className="card admin-tool" href={tool.href} key={tool.href}><span className="admin-tool-icon" aria-hidden="true">{tool.icon}</span><h3>{tool.title}</h3><p className="muted">{tool.description}</p><span className="text-link">Open tool →</span></Link>)}</div></section>
    <section className="admin-section"><div className="sectionhead"><div><div className="kicker">Partner verification</div><h2>Businesses awaiting review</h2></div><span className="pill">{pending.length} pending</span></div>{pending.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Business</th><th>Owner</th><th>Category</th><th>Submitted</th><th>Decision</th></tr></thead><tbody>{pending.map(item => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.locality || 'Diu'}</small></td><td>{item.owner.name}<small>{item.owner.email || item.owner.phone || 'Contact unavailable'}</small></td><td>{item.category?.name || 'Uncategorized'}</td><td>{new Date(item.createdAt).toLocaleDateString('en-IN')}</td><td><div className="admin-row-actions"><button className="button" type="button" onClick={() => void decideBusiness(item.id, 'APPROVE')}>Approve</button><button className="button secondary-button" type="button" onClick={() => void decideBusiness(item.id, 'REJECT')}>Reject</button></div></td></tr>)}</tbody></table></div> : <div className="empty">No pending business approvals. New partner applications will appear here after the API is connected.</div>}</section>
    <section className="admin-section"><div className="sectionhead"><div><div className="kicker">Accounts</div><h2>Users and delivery partners</h2><p className="muted">Assign operational access to registered accounts. Admin accounts are not changed here.</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Contact</th><th>Role</th><th>Status</th><th>Delivery access</th></tr></thead><tbody>{users.filter(user => !['ADMIN', 'SUPER_ADMIN'].includes(user.role)).map(user => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.username || 'No username'}</small></td><td>{user.email || user.phone || 'No contact'}</td><td>{user.role.replaceAll('_', ' ')}</td><td>{user.status}</td><td><button className="button secondary-button" type="button" disabled={user.role === 'DELIVERY_PARTNER'} onClick={() => void assignRole(user.id, 'DELIVERY_PARTNER')}>{user.role === 'DELIVERY_PARTNER' ? 'Approved partner' : 'Approve as partner'}</button></td></tr>)}</tbody></table></div>{users.length === 0 && <div className="empty">No accounts are available. The API may be offline.</div>}</section>
    <section className="admin-section"><div className="sectionhead"><div><div className="kicker">Commerce</div><h2>Recent orders</h2></div><span className="pill">Latest {orders.length}</span></div>{orders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Business</th><th>Total</th><th>Status</th><th>Placed</th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><strong>{order.orderNumber}</strong></td><td>{order.customer.name}<small>{order.customer.phone || ''}</small></td><td>{order.business?.name || '—'}</td><td>₹{(order.totalPaise / 100).toLocaleString('en-IN')}</td><td>{order.status.replaceAll('_', ' ')}</td><td>{new Date(order.createdAt).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div> : <div className="empty">No orders are available yet.</div>}</section>
  </main>;
}
