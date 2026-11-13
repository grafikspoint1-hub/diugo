import { PrismaClient, UserRole, AccountStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as readline from 'node:readline/promises';

const prisma = new PrismaClient();

function ask(label: string): Promise<string> {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  return terminal.question(label).finally(() => terminal.close());
}

function askSecret(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) throw new Error('Run this command from an interactive terminal so the password can be entered without echo.');
  return new Promise((resolve, reject) => {
    let value = '';
    const stdin = process.stdin;
    const cleanup = () => { stdin.removeListener('data', onData); stdin.setRawMode(false); stdin.pause(); process.stdout.write('\n'); };
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') { cleanup(); reject(new Error('Cancelled.')); return; }
        if (char === '\r' || char === '\n') { cleanup(); resolve(value); return; }
        if (char === '\u007f' || char === '\b') { value = value.slice(0, -1); continue; }
        if (char >= ' ' && char <= '~') value += char;
      }
    };
    process.stdout.write(label);
    stdin.setRawMode(true); stdin.resume(); stdin.on('data', onData);
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Admin provisioning is disabled in production.');
  const existingAdmin = await prisma.user.findFirst({ where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } }, select: { id: true } });
  if (existingAdmin) throw new Error('An administrator already exists. This command never changes existing admin accounts.');

  const typedUsername = (await ask('Admin username (leave blank for DIU-ADMIN): ')).trim();
  const username = typedUsername || 'DIU-ADMIN';
  const emailInput = (await ask('Admin email (optional): ')).trim().toLowerCase();
  const configuredPhone = process.env.ADMIN_RECOVERY_PHONE?.trim();
  const enteredPhone = (await ask(`Admin mobile in +91 format${configuredPhone ? ` (configured recovery number ${configuredPhone})` : ''}: `)).trim();
  const phone = enteredPhone || configuredPhone || '';
  const password = await askSecret('Admin password (hidden): ');
  if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) throw new Error('Username must be 3–32 allowed characters.');
  if (emailInput && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) throw new Error('Enter a valid email address or leave it blank.');
  if (!/^\+91[6-9]\d{9}$/.test(phone)) throw new Error('Enter a valid Indian mobile number in +91 format.');
  if (configuredPhone && phone !== configuredPhone) throw new Error('Admin mobile must match ADMIN_RECOVERY_PHONE.');
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) throw new Error('Password must be at least 12 characters with uppercase, lowercase, number and symbol characters.');
  if (['password123!', 'admin123456!', 'welcome12345!', 'qwerty123456!', 'p@ssw0rd1234!', 'letmein12345!'].includes(password.toLowerCase()) || /^(password|admin|qwerty|welcome|letmein|iloveyou|changeme|mydiu)/i.test(password)) throw new Error('Choose a less common password.');
  const conflict = await prisma.user.findFirst({ where: { OR: [{ username }, ...(emailInput ? [{ email: emailInput }] : []), { phone }] }, select: { id: true } });
  if (conflict) throw new Error('An account already uses that username, email, or phone. No account was created.');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: {
    name: 'DIU GO Administrator', username, email: emailInput || null, phone, passwordHash,
    role: UserRole.SUPER_ADMIN, status: AccountStatus.ACTIVE,
    // The recovery OTP flow records possession confirmation on first successful verification.
    phoneVerifiedAt: null,
  }, select: { id: true, username: true, role: true } });
  process.stdout.write(`Created ${user.role} account ${user.username}. The recovery number must be able to receive SMS OTPs.\n`);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Admin provisioning failed.'}\n`);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
