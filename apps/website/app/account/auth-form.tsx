'use client';

import { FormEvent, useState } from 'react';

type AuthFormProps = { mode: 'login' | 'register' };
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function AuthForm({ mode }: AuthFormProps) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = mode === 'login' ? data : { name: data.name, email: data.email, password: data.password };
    try {
      const response = await fetch(`${apiBase}/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Request failed');
      if (result.accessToken) localStorage.setItem('mydiu_access_token', result.accessToken);
      setMessage(mode === 'login' ? `Welcome back, ${result.user?.name ?? 'customer'}!` : 'Account created successfully. You are signed in.');
      event.currentTarget.reset();
      window.location.assign('/account/dashboard');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to connect to DIU GO. Start the backend and try again.');
    } finally {
      setBusy(false);
    }
  }

  return <form className="flow-form" onSubmit={submit}>{mode === 'register' && <label>Name<input name="name" required /></label>}<label>{mode === 'login' ? 'Email or phone' : 'Email'}<input name={mode === 'login' ? 'identifier' : 'email'} type={mode === 'login' ? 'text' : 'email'} required placeholder={mode === 'login' ? 'you@example.com' : undefined} /></label><label>Password<input name="password" type="password" minLength={8} required /></label><button className="button" type="submit" disabled={busy}>{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>{message && <p className="auth-message" role="status">{message}</p>}</form>;
}
