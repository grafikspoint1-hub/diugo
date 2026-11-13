'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Stage = 'request' | 'verify' | 'reset' | 'done';
type ApiResult = { message?: string | string[]; requestId?: string; recoveryToken?: string; phone?: string | null; confirmationSmsSent?: boolean };
const readMessage = (result: ApiResult, fallback: string) => Array.isArray(result.message) ? result.message.join(' ') : result.message || fallback;

export default function AdminRecovery() {
  const [stage, setStage] = useState<Stage>('request');
  const [phone, setPhone] = useState<string | null>(null);
  const [requestId, setRequestId] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [smsNote, setSmsNote] = useState('');

  useEffect(() => { fetch(`${apiBase}/auth/admin/recovery/info`, { cache: 'no-store' }).then(response => response.json()).then((result: ApiResult) => setPhone(result.phone ?? null)).catch(() => setPhone(null)); }, []);
  useEffect(() => { if (seconds <= 0) return; const timer = window.setTimeout(() => setSeconds(value => value - 1), 1000); return () => window.clearTimeout(timer); }, [seconds]);

  async function call(path: string, body?: unknown) {
    const response = await fetch(`${apiBase}/auth/admin/recovery/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json().catch(() => ({})) as ApiResult;
    if (!response.ok) throw new Error(readMessage(result, 'Recovery could not be completed. Try again.'));
    return result;
  }
  async function requestCode(event?: FormEvent) {
    event?.preventDefault(); setBusy(true); setError(false); setMessage('');
    try { const result = await call('request-otp'); setRequestId(result.requestId ?? ''); setStage('verify'); setSeconds(60); setMessage(readMessage(result, 'If the configured recovery number is eligible, a code has been sent.')); }
    catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'Could not request a code.'); }
    finally { setBusy(false); }
  }
  async function verify(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(false); setMessage('');
    try { const result = await call('verify-otp', { requestId, otp }); setRecoveryToken(result.recoveryToken ?? ''); setStage('reset'); setMessage('Mobile number verified. Choose your new admin login details.'); }
    catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'Code verification failed.'); }
    finally { setBusy(false); }
  }
  async function resendCode() {
    setBusy(true); setError(false); setMessage('');
    try { const result = await call('resend-otp', { requestId }); setSeconds(60); setMessage(readMessage(result, 'If eligible, a new code has been sent.')); }
    catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'Could not resend the code.'); }
    finally { setBusy(false); }
  }
  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(false); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await call('reset', { recoveryToken, username: form.get('username'), confirmUsername: form.get('confirmUsername'), password: form.get('password'), confirmPassword: form.get('confirmPassword') });
      setSmsNote(result.confirmationSmsSent ? 'A confirmation text was sent to your recovery number.' : 'Your credentials were changed. A confirmation text could not be sent.');
      setStage('done'); setMessage(readMessage(result, 'Admin login details updated successfully. Please sign in again.'));
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'Could not update the admin credentials.'); }
    finally { setBusy(false); }
  }

  return <section className="card admin-auth-card recovery-card">
    <Link href="/admin/login" className="recovery-back">← Admin sign in</Link>
    <div className="admin-auth-mark" aria-hidden="true">MY</div>
    {stage === 'request' && <><div className="kicker">Secure account recovery · Step 1 of 3</div><h1>Forgot your admin login details?</h1><p className="muted">We will send an OTP to your registered admin recovery mobile number to verify your identity.</p><div className="recovery-phone"><span>Recovery mobile</span><strong>{phone ?? 'Not configured'}</strong></div><p className="recovery-privacy">For security, recovery is only sent to the number configured by your system operator.</p><form className="flow-form" onSubmit={requestCode}><button className="button admin-login-button" type="submit" disabled={busy || phone === null}>{busy ? 'Sending code…' : 'Send OTP'}</button></form></>}
    {stage === 'verify' && <><div className="kicker">Verify mobile · Step 2 of 3</div><h1>Verify your mobile number</h1><p className="muted">If the configured recovery number is eligible, a 6-digit verification code has been sent{phone ? ` to the number ending ${phone.slice(-4)}` : ''}.</p><form className="flow-form" onSubmit={verify}><label>6-digit OTP<input name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} required aria-describedby="otp-help" /></label><small id="otp-help" className="muted">Enter all six digits. Code expires in five minutes.</small><button className="button admin-login-button" type="submit" disabled={busy || otp.length !== 6}>{busy ? 'Verifying…' : 'Verify OTP'}</button></form><button type="button" className="text-button resend-button" onClick={() => void resendCode()} disabled={busy || seconds > 0}>{seconds > 0 ? `Resend code in ${seconds}s` : 'Resend OTP'}</button><button type="button" className="recovery-back recovery-change" onClick={() => { setStage('request'); setMessage(''); setOtp(''); }}>Go back</button></>}
    {stage === 'reset' && <><div className="kicker">Choose new details · Step 3 of 3</div><h1>Reset your admin login details</h1><p className="muted">Create a new username and a strong password. You will need to sign in again after saving.</p><form className="flow-form recovery-reset-form" onSubmit={reset}><label>New admin username<input name="username" autoComplete="username" autoCapitalize="none" minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]{3,32}" required /></label><label>Confirm admin username<input name="confirmUsername" autoComplete="username" autoCapitalize="none" minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]{3,32}" required /></label><label>New password<input name="password" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={128} required /></label><label>Confirm new password<input name="confirmPassword" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={128} required /></label><label className="show-password-choice"><input type="checkbox" checked={showPasswords} onChange={event => setShowPasswords(event.target.checked)} /> Show passwords</label><small className="muted">Use at least 12 characters with uppercase, lowercase, a number, and a symbol.</small><button className="button admin-login-button" type="submit" disabled={busy}>{busy ? 'Updating details…' : 'Update admin credentials'}</button></form></>}
    {stage === 'done' && <><div className="kicker">Recovery complete</div><div className="recovery-success" aria-hidden="true">✓</div><h1>Admin login details updated successfully!</h1><p className="muted">Your admin username and password have been changed. Please log in again using your new credentials.</p><p className="recovery-privacy">{smsNote}</p><Link className="button admin-login-button recovery-login-link" href="/admin/login">Go to Admin Login</Link></>}
    {message && <p className={error ? 'admin-auth-message is-error' : 'admin-auth-message'} role={error ? 'alert' : 'status'}>{message}</p>}
  </section>;
}
