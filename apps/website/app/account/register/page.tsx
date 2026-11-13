import Link from 'next/link';
import AuthForm from '../auth-form';

export default function RegisterPage() {
  return <main className="shell section"><div className="card form-card"><div className="kicker">Join DIU GO</div><h1>Create account</h1><AuthForm mode="register" /><Link className="muted" href="/account">← Account</Link></div></main>;
}
