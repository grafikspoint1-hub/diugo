import Link from 'next/link';
import AuthForm from '../auth-form';

export default function LoginPage() {
  return <main className="shell section"><div className="card form-card"><div className="kicker">Customer access</div><h1>Sign in</h1><AuthForm mode="login" /><Link className="muted" href="/account">← Account</Link></div></main>;
}
