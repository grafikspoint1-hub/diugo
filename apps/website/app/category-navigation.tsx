'use client';

import Link from 'next/link';
import { useState } from 'react';
import { categoryIconPaths, mainCategories } from '../lib/categories';

type Locale = 'en' | 'gu' | 'hi';

export function CategoryNavigation() {
  const [locale, setLocale] = useState<Locale>('en');
  const headings = {
    en: { eyebrow: 'Made for Diu', title: 'What are you looking for?', subtitle: 'One local guide for shopping, services and island life.', emergency: 'Emergency contacts & quick help', emergencyHint: 'Verified helplines · Call 112 · No sign-in required' },
    gu: { eyebrow: 'દીવ માટે', title: 'તમે શું શોધી રહ્યા છો?', subtitle: 'ખરીદી, સેવાઓ અને સ્થાનિક જીવન માટે એક માર્ગદર્શિકા.', emergency: 'કટોકટીના સંપર્કો અને ઝડપી મદદ', emergencyHint: 'ચકાસેલી હેલ્પલાઇન · 112 પર કૉલ કરો · સાઇન-ઇનની જરૂર નથી' },
    hi: { eyebrow: 'दीव के लिए', title: 'आप क्या ढूँढ रहे हैं?', subtitle: 'खरीदारी, सेवाओं और द्वीप के जीवन के लिए एक स्थानीय मार्गदर्शिका।', emergency: 'आपातकालीन संपर्क और तुरंत सहायता', emergencyHint: 'सत्यापित हेल्पलाइन · 112 पर कॉल करें · साइन-इन ज़रूरी नहीं' },
  } satisfies Record<Locale, { eyebrow: string; title: string; subtitle: string; emergency: string; emergencyHint: string }>;
  return <section className="section category-section" id="services" aria-labelledby="category-title">
    <div className="sectionhead category-heading">
      <div><div className="kicker">{headings[locale].eyebrow}</div><h2 id="category-title">{headings[locale].title}</h2><p className="muted">{headings[locale].subtitle}</p></div>
      <div className="locale-switch" role="group" aria-label="Choose category language">
        {(['en', 'gu', 'hi'] as const).map((code) => <button key={code} type="button" aria-pressed={locale === code} onClick={() => setLocale(code)}>{code === 'en' ? 'EN' : code === 'gu' ? 'ગુજ' : 'हि'}</button>)}
      </div>
    </div>
    <nav className="category-grid" aria-label="Main categories">
      {mainCategories.map((category, index) => <Link className={`category-card category-tone-${index % 4}`} href={category.href} key={category.slug}>
        <span className="category-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{categoryIconPaths[category.icon].map((path) => <path key={path} d={path} />)}</svg></span>
        <span className="category-name">{category.label[locale]}</span><span className="category-arrow" aria-hidden="true">↗</span>
      </Link>)}
    </nav>
    <a className="home-emergency-link" href="/emergency"><span aria-hidden="true">✚</span><span><strong>{headings[locale].emergency}</strong><small>{headings[locale].emergencyHint}</small></span><b aria-hidden="true">→</b></a>
  </section>;
}
