export type CategoryDefinition = {
  slug: string;
  label: { en: string; gu: string; hi: string };
  icon: string;
  href: string;
  detail: string;
};

export const mainCategories: CategoryDefinition[] = [
  { slug: 'shopping', label: { en: 'Shopping', gu: 'ખરીદી', hi: 'खरीदारी' }, icon: 'bag', href: '/category/shopping', detail: 'Browse products from approved local stores.' },
  { slug: 'buy-sell', label: { en: 'Buy & Sell', gu: 'ખરીદો અને વેચો', hi: 'खरीदें और बेचें' }, icon: 'exchange', href: '/buy-sell', detail: 'Find pre-loved items or list something you no longer need.' },
  { slug: 'food', label: { en: 'Food & Restaurants', gu: 'ભોજન અને રેસ્ટોરાં', hi: 'भोजन और रेस्टोरेंट' }, icon: 'food', href: '/category/food', detail: 'Discover local food businesses and restaurants.' },
  { slug: 'grocery', label: { en: 'Grocery & Daily Needs', gu: 'કરિયાણું અને દૈનિક જરૂરિયાતો', hi: 'किराना और रोज़मर्रा की ज़रूरतें' }, icon: 'basket', href: '/category/grocery', detail: 'Explore everyday essentials from local shops.' },
  { slug: 'hotels', label: { en: 'Hotels & Stays', gu: 'હોટેલ અને રોકાણ', hi: 'होटल और ठहरने की जगहें' }, icon: 'stay', href: '/category/hotels', detail: 'Discover accommodation listings in and around Diu.' },
  { slug: 'travel', label: { en: 'Travel & Transport', gu: 'પ્રવાસ અને પરિવહન', hi: 'यात्रा और परिवहन' }, icon: 'travel', href: '/category/travel', detail: 'Find local travel and transport providers.' },
  { slug: 'appointments', label: { en: 'Appointments & Services', gu: 'અપોઇન્ટમેન્ટ અને સેવાઓ', hi: 'अपॉइंटमेंट और सेवाएँ' }, icon: 'calendar', href: '/category/appointments', detail: 'Explore local providers and appointment services.' },
  { slug: 'explore', label: { en: 'Explore Diu', gu: 'દીવની શોધખોળ', hi: 'दीव घूमें' }, icon: 'compass', href: '/explore', detail: 'Plan a visit around Diu’s places and local experiences.' },
  { slug: 'events', label: { en: 'Events & Tickets', gu: 'ઇવેન્ટ અને ટિકિટ', hi: 'कार्यक्रम और टिकट' }, icon: 'ticket', href: '/events', detail: 'Browse event information and ticket listings.' },
  { slug: 'businesses', label: { en: 'Local Businesses', gu: 'સ્થાનિક વ્યવસાયો', hi: 'स्थानीय व्यवसाय' }, icon: 'store', href: '/categories', detail: 'Search the DIU GO local business directory.' },
  { slug: 'home-services', label: { en: 'Home Services', gu: 'ઘરગથ્થુ સેવાઓ', hi: 'घरेलू सेवाएँ' }, icon: 'tools', href: '/category/home-services', detail: 'Explore home maintenance and service providers.' },
  { slug: 'jobs', label: { en: 'Jobs & Careers', gu: 'નોકરી અને કારકિર્દી', hi: 'नौकरी और करियर' }, icon: 'briefcase', href: '/category/jobs', detail: 'Discover local employment opportunities.' },
  { slug: 'property', label: { en: 'Property', gu: 'મિલકત', hi: 'संपत्ति' }, icon: 'home', href: '/category/property', detail: 'Browse property information and enquiries.' },
  { slug: 'offers', label: { en: 'Offers & Rewards', gu: 'ઓફર અને રિવોર્ડ્સ', hi: 'ऑफ़र और रिवॉर्ड' }, icon: 'sparkles', href: '/deals', detail: 'Explore offers shared by local partners.' },
];

export const categoryIconPaths: Record<string, string[]> = {
  bag: ['M5 8h14l1 12H4L5 8Z', 'M9 8V6a3 3 0 0 1 6 0v2'],
  exchange: ['M4 7h14l-3-3', 'M20 17H6l3 3', 'M18 7v4', 'M6 13v4'],
  food: ['M4 11h16l-2 9H6l-2-9Z', 'M7 8c0-2 2-2 2-4', 'M12 8c0-2 2-2 2-4', 'M17 8c0-2 2-2 2-4'],
  basket: ['M3 10h18l-2 10H5L3 10Z', 'm7 10 4-6', 'm17 10-4-6', 'M8 14v3', 'M12 14v3', 'M16 14v3'],
  stay: ['M4 20V7l8-4 8 4v13', 'M9 20v-6h6v6', 'M8 9h.01', 'M16 9h.01'],
  travel: ['M3 12 21 5l-7 16-3-7-8-2Z', 'm11 14 5-5'],
  calendar: ['M4 6h16v15H4z', 'M8 3v6', 'M16 3v6', 'M4 11h16', 'm9 16 2 2 4-4'],
  compass: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'm16 8-2 6-6 2 2-6 6-2Z'],
  ticket: ['M3 8V5h18v3a3 3 0 0 0 0 6v5H3v-5a3 3 0 0 0 0-6Z', 'M13 5v2', 'M13 11v2', 'M13 17v2'],
  store: ['M3 10h18l-2-6H5l-2 6Z', 'M5 10v10h14V10', 'M9 20v-6h6v6', 'M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0'],
  tools: ['m14 7 3-3 4 4-3 3', 'm3 21 9-9', 'M7 4a5 5 0 0 0 6 6L8 15l-3-3 5-5a5 5 0 0 0-3-3Z'],
  briefcase: ['M3 8h18v13H3z', 'M8 8V5h8v3', 'M3 13h18', 'M10 13v2h4v-2'],
  home: ['m3 10 9-7 9 7', 'M5 9v11h14V9', 'M9 20v-6h6v6'],
  sparkles: ['m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z', 'm19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z'],
};
