import AdminLoginForm from './form';

export default function AdminLoginPage() {
  return <main className="shell section admin-auth-shell"><section className="card admin-auth-card"><div className="admin-auth-mark" aria-hidden="true">MY</div><div className="kicker">DIU GO operations</div><h1>Admin sign in</h1><p className="muted">Sign in with your administrator username and password.</p><AdminLoginForm /></section></main>;
}
