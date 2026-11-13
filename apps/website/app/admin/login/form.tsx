'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function AdminLoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${apiBase}/auth/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: form.get('username'), password: form.get('password') }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(' ') : result.message || 'Could not sign in. Check your details and try again.');
      localStorage.setItem('mydiu_access_token', result.accessToken);
      window.location.assign('/admin');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to reach the admin service.'); }
    finally { setBusy(false); }
  }
  return <form className="flow-form admin-auth-form" onSubmit={submit}>
    <label>Admin username<input name="username" autoComplete="username" autoCapitalize="none" placeholder="DIU-ADMIN" required minLength={3} maxLength={80} /></label>
    <label>Password<span className="admin-password-field"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required minLength={8} /><button type="button" className="password-toggle" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
    <button className="button admin-login-button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
    {message && <p className="admin-auth-message" role="alert">{message}</p>}
    <Link className="admin-forgot-link" href="/admin/recover">Forgot username or password?</Link>
  </form>;
}
