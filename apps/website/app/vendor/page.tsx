'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type User = { name: string; role: string; status: string };
type Category = { id: string; name: string };
type Business = { id: string; name: string; status: string; locality?: string | null; address?: string | null; category?: Category | null; supportsDelivery: boolean; vendorDeliveryFeePaise?: number | null };
type Product = { id: string; name: string; description?: string | null; categoryId?: string | null; imageUrl?: string | null; mrpPaise?: number | null; pricePaise: number; stock: number; reservedStock: number; status: string; condition: string };
type Order = { id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string; customer: { name: string; phone?: string | null }; items: Array<{ productName: string; quantity: number }> };
type Subscription = { businessStatus: string | null; subscription?: { status: string; currentPeriodEnd?: string | null } | null; plan: { amountPaise?: number | null; periodDays: number; checkoutAvailable: boolean } };

const money = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const headers = (token: string, json = false) => ({ ...(json ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}` });

export default function VendorPanelPage() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab] = useState<'overview' | 'products' | 'orders'>('overview');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Checking vendor access…');
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [businessForm, setBusinessForm] = useState({ name: '', categoryId: '', phone: '', address: '', locality: '', description: '' });
  const [productForm, setProductForm] = useState({ name: '', categoryId: '', price: '', mrp: '', stock: '', description: '', imageUrl: '', condition: 'NEW' });
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [busy, setBusy] = useState(false);

  async function get<T>(path: string, accessToken: string) {
    const response = await fetch(`${apiBase}${path}`, { headers: headers(accessToken), cache: 'no-store' });
    const result = await response.json().catch(() => null) as T | { message?: string } | null;
    if (!response.ok) throw new Error(result && typeof result === 'object' && 'message' in result ? String(result.message) : 'Request failed');
    return result as T;
  }

  async function loadWorkspace(accessToken: string, account: User | null = user) {
    const [businessResult, categoriesResult] = await Promise.all([get<Business | null>('/vendor/business', accessToken), get<Category[]>('/categories', accessToken)]);
    setBusiness(businessResult); setCategories(categoriesResult ?? []);
    if (businessResult) { setDeliveryEnabled(businessResult.supportsDelivery); setDeliveryFee(String((businessResult.vendorDeliveryFeePaise ?? 0) / 100)); }
    if (businessResult?.status === 'APPROVED' && account?.role === 'VENDOR') {
      const [subscriptionResult, productsResult, ordersResult] = await Promise.all([get<Subscription>('/vendor/subscription', accessToken), get<Product[]>('/vendor/products', accessToken), get<Order[]>('/vendor/orders', accessToken)]);
      setSubscription(subscriptionResult); setProducts(productsResult ?? []); setOrders(ordersResult ?? []);
    }
  }

  useEffect(() => {
    const accessToken = localStorage.getItem('mydiu_access_token') ?? '';
    if (!accessToken) { setMessage('Sign in to access the vendor panel.'); setLoading(false); return; }
    setToken(accessToken);
    get<{ user: User }>('/auth/me', accessToken).then(async result => { setUser(result.user); await loadWorkspace(accessToken, result.user); setMessage(''); }).catch(error => setMessage(error instanceof Error ? error.message : 'Could not load vendor panel.')).finally(() => setLoading(false));
  }, []);

  async function submitBusiness(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`${apiBase}/vendor/businesses`, { method: 'POST', headers: headers(token, true), body: JSON.stringify({ ...businessForm, supportsPickup: true, supportsDelivery: false }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(result.message || 'Could not submit the business.'); return; }
    setBusiness(result.business); setShowBusinessForm(false); setMessage('Business submitted for admin verification.');
  }

  async function submitProduct(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const payload = { name: productForm.name, categoryId: productForm.categoryId || null, pricePaise: Math.round(Number(productForm.price) * 100), mrpPaise: productForm.mrp ? Math.round(Number(productForm.mrp) * 100) : null, stock: Number(productForm.stock), description: productForm.description || '', imageUrl: productForm.imageUrl || null, condition: productForm.condition, status: Number(productForm.stock) > 0 ? 'ACTIVE' : 'OUT_OF_STOCK' };
    const response = await fetch(`${apiBase}/vendor/products${editingProduct ? `/${encodeURIComponent(editingProduct)}` : ''}`, { method: editingProduct ? 'PATCH' : 'POST', headers: headers(token, true), body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage(result.message || 'Could not save product.'); return; }
    setProducts(current => editingProduct ? current.map(product => product.id === editingProduct ? result as Product : product) : [result as Product, ...current]); setProductForm({ name: '', categoryId: '', price: '', mrp: '', stock: '', description: '', imageUrl: '', condition: 'NEW' }); setEditingProduct(null); setShowProductForm(false); setMessage(editingProduct ? 'Product updated.' : 'Product added to your catalogue.');
  }

  function editProduct(product: Product) {
    setEditingProduct(product.id);
    setProductForm({ name: product.name, categoryId: product.categoryId || '', price: String(product.pricePaise / 100), mrp: product.mrpPaise ? String(product.mrpPaise / 100) : '', stock: String(product.stock), description: product.description || '', imageUrl: product.imageUrl || '', condition: product.condition });
    setShowProductForm(true);
  }

  async function deactivateProduct(product: Product) {
    if (!window.confirm(`Deactivate “${product.name}”? It will no longer appear in the shop.`)) return;
    const response = await fetch(`${apiBase}/vendor/products/${encodeURIComponent(product.id)}`, { method: 'DELETE', headers: headers(token) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(result.message || 'Could not deactivate product.'); return; }
    setProducts(current => current.map(item => item.id === product.id ? result as Product : item)); setMessage('Product deactivated.');
  }

  async function saveDeliverySettings(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    const response = await fetch(`${apiBase}/vendor/business/delivery-settings`, { method: 'PATCH', headers: headers(token, true), body: JSON.stringify({ supportsDelivery: deliveryEnabled, vendorDeliveryFeePaise: Math.round(Number(deliveryFee || 0) * 100) }) });
    const result = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setMessage(result.message || 'Could not update delivery settings.'); return; }
    setBusiness(current => current ? { ...current, supportsDelivery: result.supportsDelivery, vendorDeliveryFeePaise: result.vendorDeliveryFeePaise } : current); setMessage('Delivery settings saved.');
  }

  async function startSubscription() {
    setBusy(true);
    try {
      const order = await get<{ subscriptionId: string; keyId: string; orderId: string; amount: number; currency: string }>('/vendor/subscription/checkout', token);
    await new Promise<void>((resolve, reject) => {
        const openCheckout = () => {
          const Razorpay = (window as unknown as { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay;
          if (!Razorpay) { reject(new Error('Razorpay Checkout could not be loaded.')); return; }
          const checkout = new Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, name: 'DIU GO', description: 'Seller subscription', order_id: order.orderId, handler: async (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              const response = await fetch(`${apiBase}/vendor/subscription/verify`, { method: 'POST', headers: headers(token, true), body: JSON.stringify({ subscriptionId: order.subscriptionId, ...payment }) });
              const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || 'Payment verification failed.');
              await loadWorkspace(token); setMessage('Seller subscription activated.'); resolve();
            } catch (error) { reject(error); }
          }, modal: { ondismiss: () => reject(new Error('Payment window closed. No subscription was activated.')) } });
          checkout.open();
        };
        if ((window as unknown as { Razorpay?: unknown }).Razorpay) { openCheckout(); return; }
        const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = openCheckout; script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded.')); document.body.appendChild(script);
      });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not start subscription checkout.'); }
    finally { setBusy(false); }
  }

  async function updateOrder(id: string, status: string) {
    const response = await fetch(`${apiBase}/vendor/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', headers: headers(token, true), body: JSON.stringify({ status }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(result.message || 'Could not update order.'); return; }
    setOrders(current => current.map(order => order.id === id ? { ...order, status } : order)); setMessage('Order status updated.');
  }

  if (loading) return <main className="shell vendor-shell"><div className="empty">{message}</div></main>;
  if (!token) return <main className="shell vendor-shell"><div className="card account-card"><div className="kicker">DIU GO partner workspace</div><h1>Vendor sign in</h1><p className="muted">{message}</p><Link className="button" href="/account/login">Sign in</Link></div></main>;
  if (!user) return <main className="shell vendor-shell"><div className="empty" role="alert">{message}<p><Link href="/account/login">Sign in again →</Link></p></div></main>;

  return <main className="shell vendor-shell">
    <header className="vendor-header"><div><div className="kicker">DIU GO partner workspace</div><h1>Vendor panel</h1><p className="muted">Manage your business, catalogue, orders, and delivery settings.</p></div><div className="vendor-header-actions"><Link className="button secondary-button" href="/">View marketplace</Link><button className="button" type="button" onClick={() => { localStorage.removeItem('mydiu_access_token'); window.location.assign('/account/login'); }}>Sign out</button></div></header>
    {message && <p className="marketplace-message" role="status">{message}</p>}
    <section className="vendor-business-bar card"><div><span className={`pill vendor-status-${(business?.status || 'not-submitted').toLowerCase()}`}>{business?.status?.replaceAll('_', ' ') || 'NOT SUBMITTED'}</span><h2>{business?.name || 'Your business profile'}</h2><p className="muted">{business?.category?.name || 'Submit your local business for verification'}{business?.locality ? ` · ${business.locality}` : ''}</p></div>{!business && <button className="button" type="button" onClick={() => setShowBusinessForm(value => !value)}>{showBusinessForm ? 'Close form' : 'Submit business'}</button>}</section>
    {showBusinessForm && !business && <form className="card vendor-form" onSubmit={event => void submitBusiness(event)}><h2>Submit your business</h2><div className="vendor-form-grid"><label>Business name<input required value={businessForm.name} onChange={event => setBusinessForm({ ...businessForm, name: event.target.value })} /></label><label>Category<select required value={businessForm.categoryId} onChange={event => setBusinessForm({ ...businessForm, categoryId: event.target.value })}><option value="">Choose category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Phone<input value={businessForm.phone} onChange={event => setBusinessForm({ ...businessForm, phone: event.target.value })} /></label><label>Locality<input value={businessForm.locality} onChange={event => setBusinessForm({ ...businessForm, locality: event.target.value })} /></label><label className="vendor-field-wide">Address<input value={businessForm.address} onChange={event => setBusinessForm({ ...businessForm, address: event.target.value })} /></label><label className="vendor-field-wide">Description<textarea value={businessForm.description} onChange={event => setBusinessForm({ ...businessForm, description: event.target.value })} /></label></div><button className="button" type="submit">Submit for verification</button></form>}
    {business?.status === 'APPROVED' && user.role === 'VENDOR' ? <>
      <nav className="vendor-tabs" aria-label="Vendor sections">{(['overview', 'products', 'orders'] as const).map(item => <button type="button" key={item} aria-pressed={tab === item} onClick={() => setTab(item)}>{item[0].toUpperCase() + item.slice(1)}{item === 'products' ? ` (${products.length})` : item === 'orders' ? ` (${orders.length})` : ''}</button>)}</nav>
      {tab === 'overview' && <section className="vendor-overview"><div className="vendor-stat-grid"><article className="vendor-stat"><span>Products</span><strong>{products.length}</strong><small>Catalogue records</small></article><article className="vendor-stat"><span>Orders</span><strong>{orders.length}</strong><small>Business orders</small></article><article className="vendor-stat"><span>Delivery</span><strong>{business.supportsDelivery ? 'ON' : 'OFF'}</strong><small>Vendor managed</small></article><article className="vendor-stat"><span>Subscription</span><strong>{subscription?.subscription?.status === 'ACTIVE' ? 'LIVE' : '—'}</strong><small>{subscription?.subscription?.currentPeriodEnd ? `Until ${new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString('en-IN')}` : 'Not active'}</small></article></div><div className="vendor-panels"><article className="card"><div className="sectionhead"><div><div className="kicker">Seller subscription</div><h2>{subscription?.subscription?.status === 'ACTIVE' ? 'Your catalogue is unlocked' : 'Activate your seller plan'}</h2></div></div><p className="muted">{subscription?.plan.amountPaise ? `${money(subscription.plan.amountPaise)} for ${subscription.plan.periodDays} days.` : 'Subscription pricing is not configured yet.'}</p><p className="muted">Payment is verified by the server before catalogue access is enabled.</p>{subscription?.subscription?.status !== 'ACTIVE' && <button className="button" type="button" disabled={busy || !subscription?.plan.checkoutAvailable} onClick={() => void startSubscription()}>{busy ? 'Opening secure checkout…' : 'Subscribe securely'}</button>}{!subscription?.plan.checkoutAvailable && subscription?.subscription?.status !== 'ACTIVE' && <p className="muted">Checkout is unavailable until the subscription price and Razorpay credentials are configured.</p>}</article><form className="card vendor-form" onSubmit={event => void saveDeliverySettings(event)}><div className="sectionhead"><div><div className="kicker">Delivery settings</div><h2>Vendor-managed delivery</h2></div></div><label><input type="checkbox" checked={deliveryEnabled} onChange={event => setDeliveryEnabled(event.target.checked)} /> Offer delivery to customers</label><label>Delivery fee (₹)<input type="number" min="0" step="0.01" value={deliveryFee} onChange={event => setDeliveryFee(event.target.value)} disabled={!deliveryEnabled} /></label><button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save delivery settings'}</button></form></div></section>}
      {tab === 'products' && <section className="vendor-section"><div className="sectionhead"><div><div className="kicker">Catalogue</div><h2>Your products</h2></div><button className="button" type="button" onClick={() => { setEditingProduct(null); setProductForm({ name: '', categoryId: '', price: '', mrp: '', stock: '', description: '', imageUrl: '', condition: 'NEW' }); setShowProductForm(value => !value); }}>{showProductForm ? 'Close form' : 'Add product'}</button></div>{showProductForm && <form className="card vendor-form" onSubmit={event => void submitProduct(event)}><h2>{editingProduct ? 'Edit product' : 'New product'}</h2><div className="vendor-form-grid"><label>Product name<input required value={productForm.name} onChange={event => setProductForm({ ...productForm, name: event.target.value })} /></label><label>Category<select value={productForm.categoryId} onChange={event => setProductForm({ ...productForm, categoryId: event.target.value })}><option value="">Uncategorized</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Price (₹)<input required min="0" step="0.01" type="number" value={productForm.price} onChange={event => setProductForm({ ...productForm, price: event.target.value })} /></label><label>MRP (₹)<input min="0" step="0.01" type="number" value={productForm.mrp} onChange={event => setProductForm({ ...productForm, mrp: event.target.value })} /></label><label>Stock<input required min="0" type="number" value={productForm.stock} onChange={event => setProductForm({ ...productForm, stock: event.target.value })} /></label><label>Condition<select value={productForm.condition} onChange={event => setProductForm({ ...productForm, condition: event.target.value })}><option value="NEW">New</option><option value="LIKE_NEW">Like new</option><option value="GOOD">Good</option><option value="FAIR">Fair</option></select></label><label>Image URL<input type="url" value={productForm.imageUrl} onChange={event => setProductForm({ ...productForm, imageUrl: event.target.value })} /></label><label className="vendor-field-wide">Description<textarea value={productForm.description} onChange={event => setProductForm({ ...productForm, description: event.target.value })} /></label></div><button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : editingProduct ? 'Save changes' : 'Save product'}</button></form>}{products.length ? <div className="vendor-table-wrap"><table className="vendor-table"><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.condition.replaceAll('_', ' ')}</small></td><td>{money(product.pricePaise)}</td><td>{product.stock} <small>{product.reservedStock} reserved</small></td><td><span className="pill">{product.status.replaceAll('_', ' ')}</span></td><td><div className="admin-row-actions"><button className="button secondary-button" type="button" onClick={() => editProduct(product)}>Edit</button>{product.status !== 'INACTIVE' && <button className="button secondary-button" type="button" onClick={() => void deactivateProduct(product)}>Deactivate</button>}</div></td></tr>)}</tbody></table></div> : <div className="empty">No products yet. Add your first product after your seller subscription is active.</div>}</section>}
      {tab === 'orders' && <section className="vendor-section"><div className="sectionhead"><div><div className="kicker">Fulfilment</div><h2>Incoming orders</h2></div></div>{orders.length ? <div className="vendor-order-list">{orders.map(order => <article className="card vendor-order" key={order.id}><div><span className="pill">{order.status.replaceAll('_', ' ')}</span><h3>{order.orderNumber}</h3><p className="muted">{order.customer.name} · {new Date(order.createdAt).toLocaleString('en-IN')}</p><p>{order.items.map(item => `${item.productName} × ${item.quantity}`).join(' · ')}</p></div><div className="vendor-order-actions"><strong>{money(order.totalPaise)}</strong>{order.status === 'PAID' && <button className="button" type="button" onClick={() => void updateOrder(order.id, 'ACCEPTED')}>Accept</button>}{order.status === 'ACCEPTED' && <button className="button" type="button" onClick={() => void updateOrder(order.id, 'PREPARING')}>Start preparing</button>}{order.status === 'PREPARING' && <button className="button" type="button" onClick={() => void updateOrder(order.id, 'READY_FOR_PICKUP')}>Ready</button>}</div></article>)}</div> : <div className="empty">No orders have been placed for your business.</div>}</section>}
    </> : <section className="card vendor-pending"><div className="kicker">Partner onboarding</div><h2>{business ? 'Your business is under review' : 'Start selling with DIU GO'}</h2><p className="muted">{business ? 'Admin verification is required before catalogue and order tools unlock.' : 'Submit your business profile. The admin team will review it before vendor tools become available.'}</p></section>}
  </main>;
}
