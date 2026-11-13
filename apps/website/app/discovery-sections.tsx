import Link from 'next/link';

export function DiscoverySections() {
  return <>
    <section className="app-cta"><div><div className="kicker">Your local marketplace</div><h2>Discover Diu, your way.</h2><p>Browse local listings, use the independent community Buy & Sell board, or sign in to manage your account.</p><div className="cta-actions"><Link className="button" href="/buy-sell">Browse Buy & Sell</Link><Link className="button secondary-button" href="/account/register">Create an account</Link></div></div><div className="app-mark" aria-hidden="true">✦</div></section>
    <section className="owner-cta"><div><div className="kicker">Partner with DIU GO</div><h2>Bring your local business online.</h2><p>Start with an account. Vendor onboarding and approval are handled separately.</p></div><Link className="button" href="/account/register">Create an account →</Link></section>
  </>;
}
