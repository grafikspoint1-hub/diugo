import Link from 'next/link';

export default function AccountPage() {
  return <main className="shell section"><div className="card account-card"><div className="kicker">DIU GO account</div><h1>Welcome back</h1><p className="muted">Sign in to manage your profile, orders, bookings, rewards and support.</p><div className="account-actions"><Link className="button" href="/account/login">Sign in</Link><Link className="button secondary-button" href="/account/register">Create account</Link><Link className="button secondary-button" href="/account/dashboard">My dashboard</Link></div><Link className="muted" href="/">← Back to DIU GO</Link></div></main>;
}
