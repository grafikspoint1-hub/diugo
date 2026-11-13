import type { Metadata } from 'next';
import Link from 'next/link';
import { EmergencyDirectory } from './directory';
import { verifiedEmergencyContacts } from './contacts-data';

export const metadata: Metadata = { title: 'Emergency Contacts | DIU GO', description: 'Verified emergency and civic helplines for Diu, with one-tap calling and map directions.' };

export default function EmergencyPage() {
  return <main className="shell emergency-page">
    <div className="emergency-top"><Link href="/" className="button secondary-button">← DIU GO home</Link><span>Free access · No sign-in required</span></div>
    <EmergencyDirectory initialContacts={verifiedEmergencyContacts} />
  </main>;
}
