'use client';

import { useMemo, useState } from 'react';
import { useEffect } from 'react';
import type { EmergencyContact } from './contacts-data';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Locale = 'en' | 'gu' | 'hi';

const labels = {
  en: { title: 'Emergency help, one tap away', desc: 'Officially sourced helplines and verified local contacts for Diu. If there is immediate danger, call 112.', urgent: 'Call 112', search: 'Search contacts', all: 'All services', verified: 'Source verified', updated: 'Source checked', call: 'Call', directions: 'Directions', location: 'Find nearby services', locationHint: 'Share your location with Maps to find nearby hospitals, pharmacies and other services.', noResults: 'No verified contacts match this search.', missingTitle: 'More local contacts are being verified', missing: 'Diu hospitals, clinics, blood banks, coast guard, veterinary and utility contacts are not listed until confirmed by an authoritative source. For urgent help call 112.', hours: 'Operating hours', source: 'Official source', notStated: 'Not stated by source', safe: 'Use emergency services directly. DIU GO does not dispatch responders.' },
  gu: { title: 'કટોકટીની મદદ, એક ટૅપ દૂર', desc: 'દીવ માટે સત્તાવાર સ્ત્રોતમાંથી લીધેલા હેલ્પલાઇન અને ચકાસેલા સ્થાનિક સંપર્કો. તાત્કાલિક જોખમ હોય તો 112 પર કૉલ કરો.', urgent: '112 પર કૉલ', search: 'સંપર્ક શોધો', all: 'બધી સેવાઓ', verified: 'સ્ત્રોત ચકાસેલ', updated: 'સ્ત્રોત તપાસ્યો', call: 'કૉલ', directions: 'દિશાઓ', location: 'નજીકની સેવાઓ શોધો', locationHint: 'નજીકની હોસ્પિટલ, ફાર્મસી અને અન્ય સેવાઓ માટે Maps સાથે સ્થાન શેર કરો.', noResults: 'આ શોધ સાથે કોઈ ચકાસેલા સંપર્ક મળ્યા નથી.', missingTitle: 'વધુ સ્થાનિક સંપર્કોની ચકાસણી ચાલુ છે', missing: 'અધિકૃત સ્ત્રોતથી પુષ્ટિ ન થાય ત્યાં સુધી દીવની હોસ્પિટલો, બ્લડ બેંક, કોસ્ટ ગાર્ડ, પશુચિકિત્સા અને યુટિલિટી સંપર્કો દર્શાવાતા નથી. તાત્કાલિક મદદ માટે 112 પર કૉલ કરો.', hours: 'કામકાજના કલાકો', source: 'સત્તાવાર સ્ત્રોત', notStated: 'સ્ત્રોતમાં ઉલ્લેખ નથી', safe: 'ઇમરજન્સી સેવાઓનો સીધો સંપર્ક કરો. DIU GO બચાવ દળ મોકલતું નથી.' },
  hi: { title: 'आपातकालीन सहायता, एक टैप दूर', desc: 'दीव के लिए आधिकारिक स्रोतों से लिए गए हेल्पलाइन और सत्यापित स्थानीय संपर्क। तत्काल खतरे में 112 पर कॉल करें।', urgent: '112 पर कॉल', search: 'संपर्क खोजें', all: 'सभी सेवाएँ', verified: 'स्रोत सत्यापित', updated: 'स्रोत जाँचा गया', call: 'कॉल', directions: 'रास्ता देखें', location: 'नज़दीकी सेवाएँ खोजें', locationHint: 'नज़दीकी अस्पताल, फ़ार्मेसी और सेवाओं के लिए Maps के साथ स्थान साझा करें।', noResults: 'इस खोज से कोई सत्यापित संपर्क नहीं मिला।', missingTitle: 'और स्थानीय संपर्कों का सत्यापन जारी है', missing: 'आधिकारिक स्रोत से पुष्टि होने तक दीव के अस्पताल, ब्लड बैंक, कोस्ट गार्ड, पशु चिकित्सा और उपयोगिता संपर्क सूचीबद्ध नहीं हैं। तत्काल सहायता के लिए 112 पर कॉल करें।', hours: 'कार्य समय', source: 'आधिकारिक स्रोत', notStated: 'स्रोत में उल्लेख नहीं', safe: 'आपातकालीन सेवाओं से सीधे संपर्क करें। DIU GO बचाव कर्मी नहीं भेजता।' },
} satisfies Record<Locale, Record<string, string>>;

export function EmergencyDirectory({ initialContacts }: { initialContacts: EmergencyContact[] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [locale, setLocale] = useState<Locale>('en');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const t = labels[locale];

  useEffect(() => {
    fetch(`${apiBase}/emergency-contacts`, { cache: 'no-store' }).then(async response => {
      if (!response.ok) return;
      const data = await response.json() as EmergencyContact[];
      if (data.length) setContacts(data);
    }).catch(() => {});
  }, []);

  const categories = useMemo(() => ['all', ...Array.from(new Set(contacts.map(contact => contact.category))).sort()], [contacts]);
  const filtered = useMemo(() => contacts.filter(contact => contact.isVerified && (category === 'all' || contact.category === category) && `${contact.name} ${contact.category} ${contact.phone} ${contact.address ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [contacts, category, query]);
  function findNearby() {
    setLocationError('');
    if (!navigator.geolocation) { setLocationError('Location is not available in this browser.'); return; }
    navigator.geolocation.getCurrentPosition(position => setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }), () => setLocationError('Location permission was not granted. You can still search nearby in Maps.'), { enableHighAccuracy: false, timeout: 10000 });
  }
  function mapsUrl(contact: EmergencyContact) {
    const destination = encodeURIComponent(`${contact.name} ${contact.address || 'Diu'}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}${location ? `&origin=${location.lat},${location.lng}` : ''}`;
  }

  return <>
    <section className="emergency-hero"><div className="emergency-mark" aria-hidden="true">!</div><div className="emergency-copy"><span className="emergency-eyebrow">DIU GO · QUICK HELP</span><h1>{t.title}</h1><p>{t.desc}</p><a className="emergency-call-now" href="tel:112">☎ {t.urgent}</a></div><div className="locale-switch" role="group" aria-label="Language">{(['en', 'gu', 'hi'] as const).map(code => <button type="button" key={code} aria-pressed={locale === code} onClick={() => setLocale(code)}>{code.toUpperCase()}</button>)}</div></section>
    <section className="emergency-tools"><label className="emergency-search"><span aria-hidden="true">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search} /></label><label className="emergency-filter"><span className="sr-only">{t.all}</span><select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item} value={item}>{item === 'all' ? t.all : item}</option>)}</select></label><button className="emergency-location" type="button" onClick={findNearby}>⌖ {t.location}</button></section>
    <p className="emergency-location-hint">{location ? `Location enabled (${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}). ${t.locationHint}` : t.locationHint}{location && <a className="nearby-map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`hospital OR pharmacy OR clinic near ${location.lat},${location.lng}`)}`} target="_blank" rel="noreferrer">Open nearby medical services in Maps ↗</a>}{locationError && <span role="status"> {locationError}</span>}</p>
    {filtered.length ? <section className="emergency-grid" aria-live="polite">{filtered.map(contact => <article className="emergency-card" key={contact.id}>
      <div className="emergency-card-top"><span className="emergency-category">{contact.category}</span><span className="verified-badge">✓ {t.verified}</span></div><h2>{contact.nameGu && locale === 'gu' ? contact.nameGu : contact.nameHi && locale === 'hi' ? contact.nameHi : contact.name}</h2><a className="emergency-phone" href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>{contact.phone}</a>
      {contact.address && <p className="emergency-address">⌖ {contact.address}</p>}<p className="emergency-hours"><strong>{t.hours}:</strong> {contact.hours || t.notStated}</p><p className="emergency-updated">{t.updated}: {new Date(contact.verifiedAt).toLocaleDateString(locale === 'gu' ? 'gu-IN' : locale === 'hi' ? 'hi-IN' : 'en-IN')}</p>
      <div className="emergency-card-actions"><a className="button emergency-call-button" href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>☎ {t.call}</a>{contact.address && !/india-wide|district/i.test(contact.address) && <a className="button secondary-button" href={mapsUrl(contact)} target="_blank" rel="noreferrer">↗ {t.directions}</a>}</div><a className="emergency-source" href={contact.sourceUrl} target="_blank" rel="noreferrer">{t.source} ↗</a>
    </article>)}</section> : <div className="empty">{t.noResults}</div>}
    <aside className="emergency-notice"><h2>{t.missingTitle}</h2><p>{t.missing}</p></aside><p className="emergency-disclaimer">{t.safe}</p>
  </>;
}
