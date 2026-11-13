'use client';

import { useState } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, callback: (response: unknown) => void) => void };
  }
}

type AddToCartButtonProps = { productId: string; available: number };

export function AddToCartButton({ productId, available }: AddToCartButtonProps) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    const token = localStorage.getItem('mydiu_access_token');
    if (!token) {
      setMessage('Sign in to add products.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${apiBase}/cart/items`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message || 'Could not add this product.');
      setMessage('Added to your cart.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not connect to DIU GO.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="commerce-action"><button className="button" type="button" onClick={add} disabled={busy || available < 1}>{busy ? 'Adding…' : available < 1 ? 'Out of stock' : 'Add to cart'}</button>{message && <small role="status">{message}</small>}</div>;
}

type CartItem = { id: string; quantity: number; product: { id: string; name: string; pricePaise: number; stock: number; reservedStock: number; imageUrl?: string | null; business: { name: string } } };
type CartData = { items: CartItem[]; subtotalPaise: number };
type CheckoutData = { checkoutSessionId: string; keyId: string; orderId: string; amount: number; currency: string; expiresAt: string };
type QuoteData = { subtotalPaise: number; deliveryFeePaise: number; totalPaise: number };
type DeliveryAddress = { line1: string; line2: string; locality: string; city: string; state: string; postalCode: string; contactName: string; phone: string };

export function CartPanel() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [pending, setPending] = useState<CheckoutData | null>(null);
  const [fulfilment, setFulfilment] = useState<'MY_DIU_DELIVERY' | 'VENDOR_DELIVERY'>('MY_DIU_DELIVERY');
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [address, setAddress] = useState<DeliveryAddress>({ line1: '', line2: '', locality: '', city: 'Diu', state: 'Gujarat', postalCode: '', contactName: '', phone: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadCart() {
    const token = localStorage.getItem('mydiu_access_token');
    if (!token) {
      setMessage('Sign in to view your saved cart.');
      setLoaded(true);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [cartResponse, pendingResponse] = await Promise.all([
        fetch(`${apiBase}/cart`, { headers, cache: 'no-store' }),
        fetch(`${apiBase}/checkout/pending`, { headers, cache: 'no-store' }),
      ]);
      const cartResult = await cartResponse.json().catch(() => ({}));
      const pendingResult = await pendingResponse.json().catch(() => ({}));
      if (!cartResponse.ok) throw new Error(cartResult.message || 'Could not load your cart.');
      if (!pendingResponse.ok) throw new Error(pendingResult.message || 'Could not check for pending checkout.');
      setCart(cartResult);
      setPending(pendingResult.checkoutSessionId ? pendingResult as CheckoutData : null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not connect to DIU GO.');
    } finally {
      setBusy(false);
      setLoaded(true);
    }
  }

  async function updateItem(itemId: string, quantity: number) {
    const token = localStorage.getItem('mydiu_access_token');
    if (!token) return setMessage('Sign in to update your cart.');
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/cart/items/${encodeURIComponent(itemId)}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Could not update quantity.');
      setQuote(null);
      await loadCart();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update your cart.');
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    const token = localStorage.getItem('mydiu_access_token');
    if (!token) return setMessage('Sign in to update your cart.');
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/cart/items/${encodeURIComponent(itemId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Could not remove item.');
      setQuote(null);
      await loadCart();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update your cart.');
    } finally {
      setBusy(false);
    }
  }

  async function startCheckout(existing?: CheckoutData) {
    const token = localStorage.getItem('mydiu_access_token');
    if (!token) return setMessage('Sign in before checkout.');
    setBusy(true);
    setMessage('');
    try {
      if (!existing && (!address.line1.trim() || !address.locality.trim() || !address.city.trim() || !address.state.trim() || !address.contactName.trim() || !/^\d{6}$/.test(address.postalCode) || !/^[6-9]\d{9}$/.test(address.phone))) {
        throw new Error('Enter a complete delivery address, six-digit postal code and valid 10-digit Indian mobile number.');
      }
      let checkout = existing;
      if (!checkout && !quote) {
        const quoteResponse = await fetch(`${apiBase}/checkout/quote`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fulfilment }),
        });
        const quoteResult = await quoteResponse.json().catch(() => ({}));
        if (!quoteResponse.ok) throw new Error(quoteResult.message || 'Could not calculate delivery total.');
        setQuote(quoteResult as QuoteData);
        setMessage('Delivery quote ready. Review the total, then continue to secure payment.');
        return;
      }
      if (!checkout) {
        const response = await fetch(`${apiBase}/checkout/create`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fulfilment, deliveryAddress: address }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'Could not start checkout.');
        checkout = result as CheckoutData;
        setPending(checkout);
      }
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Secure payment checkout could not load. Your cart is unchanged.'));
          document.body.appendChild(script);
        });
      }
      if (!window.Razorpay) throw new Error('Secure payment checkout is unavailable.');
      const options = {
        key: checkout.keyId,
        order_id: checkout.orderId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'DIU GO',
        description: 'Online payment for your cart',
        theme: { color: '#006b8f' },
        handler: async (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyResponse = await fetch(`${apiBase}/checkout/verify`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkoutSessionId: checkout!.checkoutSessionId, ...payment }),
          });
          const verified = await verifyResponse.json().catch(() => ({}));
          if (!verifyResponse.ok || verified.status !== 'PAID') {
            setMessage(verified.message || 'Payment verification is still pending. Check your orders before trying again.');
            return;
          }
          setPending(null);
          setMessage('Payment verified. Your order is confirmed.');
          await loadCart();
        },
        modal: { ondismiss: () => setMessage('Payment window closed. You can resume this checkout before it expires.') },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', () => setMessage('Payment was not completed. Your stock reservation remains available until checkout expires.'));
      razorpay.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start secure checkout.');
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <div className="empty"><button className="button" type="button" onClick={loadCart} disabled={busy}>{busy ? 'Loading…' : 'Load my cart'}</button></div>;
  if (!cart) return <div className="empty">{message || 'Sign in to view your cart.'} <a className="text-link" href="/account/login">Sign in →</a></div>;

  return <div className="cart-layout">
    <div className="cart-items">{cart.items.length ? cart.items.map((item) => <article className="card cart-item" key={item.id}>
      {item.product.imageUrl && <img className="cart-image" src={item.product.imageUrl} alt={item.product.name} />}
      <div className="cart-description"><h2>{item.product.name}</h2><p className="muted">{item.product.business.name}</p><strong>₹{(item.product.pricePaise / 100).toLocaleString('en-IN')}</strong></div>
      <label className="quantity-control">Qty <input type="number" min="1" max="50" value={item.quantity} disabled={busy} onChange={(event) => {
        const quantity = Number(event.target.value);
        if (Number.isInteger(quantity) && quantity > 0 && quantity <= 50) void updateItem(item.id, quantity);
      }} /></label>
      <button className="button secondary-button" type="button" onClick={() => void removeItem(item.id)} disabled={busy}>Remove</button>
    </article>) : <div className="empty">Your cart is empty. Browse approved local products to add items.</div>}</div>
    <aside className="card cart-summary"><h2>Order summary</h2><p className="muted">Item total</p><strong>₹{(cart.subtotalPaise / 100).toLocaleString('en-IN')}</strong>
      {pending && <p className="status">You have an unpaid checkout that expires {new Date(pending.expiresAt).toLocaleTimeString()}.</p>}
      {!pending && cart.items.length > 0 && <>
        <label className="checkout-select">Delivery method<select value={fulfilment} onChange={(event) => { setFulfilment(event.target.value as typeof fulfilment); setQuote(null); setMessage(''); }}><option value="MY_DIU_DELIVERY">DIU GO delivery network</option><option value="VENDOR_DELIVERY">Vendor-managed delivery</option></select></label>
        <div className="address-fields">
        <label>Address line<input required value={address.line1} onChange={(event) => setAddress({ ...address, line1: event.target.value })} /></label>
          <label>Locality<input required value={address.locality} onChange={(event) => setAddress({ ...address, locality: event.target.value })} /></label>
          <div className="address-row"><label>City<input required value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} /></label><label>State<input required value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value })} /></label></div>
          <div className="address-row"><label>Postal code<input required inputMode="numeric" maxLength={6} value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} /></label><label>Contact name<input required value={address.contactName} onChange={(event) => setAddress({ ...address, contactName: event.target.value })} /></label></div>
          <label>Contact mobile<input required inputMode="numeric" maxLength={10} value={address.phone} onChange={(event) => setAddress({ ...address, phone: event.target.value })} /></label>
        </div>
        {quote && <div className="quote-total"><span>Delivery fee</span><strong>₹{(quote.deliveryFeePaise / 100).toLocaleString('en-IN')}</strong><span>Online total</span><strong>₹{(quote.totalPaise / 100).toLocaleString('en-IN')}</strong></div>}
      </>}
      <button className="button" type="button" onClick={() => void startCheckout(pending ?? undefined)} disabled={busy || (!pending && cart.items.length === 0)}>{busy ? 'Opening secure checkout…' : pending ? 'Resume online payment' : quote ? `Pay ₹${(quote.totalPaise / 100).toLocaleString('en-IN')} online` : 'Get delivery quote'}</button>
      <small>Payments are processed and verified by the payment provider. DIU GO never stores card details or UPI PINs.</small>
    </aside>
    {message && <p className="auth-message" role="status">{message}</p>}
  </div>;
}
