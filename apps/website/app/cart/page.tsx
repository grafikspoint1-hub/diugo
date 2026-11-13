import Link from 'next/link';
import { CartPanel } from '../commerce-actions';

export default function CartPage() {
  return <>
    <header className="topline"><div className="shell">DIU GO · Your City. Your Everything.</div></header>
    <main className="shell section">
      <div className="sectionhead"><div><div className="kicker">Online-only checkout</div><h1>Your cart</h1><p className="muted">Secure payment, stock reserved for 15 minutes.</p></div><Link className="button secondary-button" href="/">Continue browsing</Link></div>
      <CartPanel />
    </main>
  </>;
}
