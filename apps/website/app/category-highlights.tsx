import Link from 'next/link';
import { mainCategories } from '../lib/categories';

type Sample = { title: string; description: string; location: string; fields: [string, string][] };
type Highlight = { icon: string; title: string; description: string; query?: string };

const highlights: Record<string, Highlight[]> = {
  shopping: [
    { icon: '👗', title: 'Fashion & clothing', description: 'Find clothing and accessories', query: 'fashion' },
    { icon: '📱', title: 'Electronics', description: 'Browse phones and gadgets', query: 'electronics' },
    { icon: '🎁', title: 'Everyday finds', description: 'Explore products from local shops', query: 'local' },
  ],
  'buy-sell': [
    { icon: '🪑', title: 'Home & furniture', description: 'Browse community listings' },
    { icon: '🚲', title: 'Vehicles & outdoors', description: 'Find pre-loved local items' },
    { icon: '＋', title: 'Post a listing', description: 'List an item for the community' },
  ],
  food: [
    { icon: '🍽️', title: 'Restaurants', description: 'Discover places to eat', query: 'restaurant' },
    { icon: '☕', title: 'Cafés & bakeries', description: 'Find a local coffee or treat', query: 'cafe' },
    { icon: '🥡', title: 'Takeaway', description: 'Explore food options nearby', query: 'takeaway' },
  ],
  grocery: [
    { icon: '🥬', title: 'Fresh produce', description: 'Search for fruit and vegetables', query: 'produce' },
    { icon: '🥛', title: 'Daily essentials', description: 'Find everyday household needs', query: 'essentials' },
    { icon: '🧺', title: 'Local grocery stores', description: 'Browse approved local shops', query: 'grocery' },
  ],
  hotels: [
    { icon: '🏨', title: 'Hotels', description: 'Explore places to stay', query: 'hotel' },
    { icon: '🏡', title: 'Guest houses', description: 'Search local accommodation', query: 'guest house' },
    { icon: '🌊', title: 'Coastal stays', description: 'Look for a stay by the sea', query: 'coastal' },
  ],
  travel: [
    { icon: '🚕', title: 'Local cabs', description: 'Search local transport providers', query: 'cab' },
    { icon: '🛵', title: 'Two-wheelers', description: 'Explore transport options', query: 'scooter' },
    { icon: '🧭', title: 'Travel help', description: 'Find local travel services', query: 'travel' },
  ],
  appointments: [
    { icon: '💇', title: 'Salon & wellness', description: 'Find personal care providers', query: 'salon' },
    { icon: '🩺', title: 'Healthcare', description: 'Search healthcare providers', query: 'health' },
    { icon: '📅', title: 'Appointments', description: 'Explore available services', query: 'appointment' },
  ],
  explore: [
    { icon: '🌊', title: 'Beaches & sunsets', description: 'Find your coastal escape', query: 'beaches' },
    { icon: '🏰', title: 'History & heritage', description: 'Explore Diu’s landmarks', query: 'heritage' },
    { icon: '🪂', title: 'Activities & adventure', description: 'Discover island experiences', query: 'adventure' },
  ],
  events: [
    { icon: '🎭', title: 'Culture & music', description: 'Browse local event listings', query: 'culture' },
    { icon: '🎉', title: 'Community events', description: 'See what is happening in Diu', query: 'community' },
    { icon: '🎟️', title: 'All events', description: 'View event information' },
  ],
  businesses: [
    { icon: '🍴', title: 'Food & dining', description: 'Find local businesses', query: 'food' },
    { icon: '🛍️', title: 'Shops & retail', description: 'Browse the business directory', query: 'shop' },
    { icon: '🧰', title: 'Local services', description: 'Search service providers', query: 'service' },
  ],
  'home-services': [
    { icon: '🔧', title: 'Repairs & maintenance', description: 'Find home service providers', query: 'repair' },
    { icon: '🧹', title: 'Cleaning', description: 'Search local home services', query: 'cleaning' },
    { icon: '⚡', title: 'Electrical & plumbing', description: 'Browse listed providers', query: 'electrician' },
  ],
  jobs: [
    { icon: '💼', title: 'Full-time roles', description: 'Search local opportunities', query: 'full time' },
    { icon: '🕒', title: 'Part-time work', description: 'Explore flexible roles', query: 'part time' },
    { icon: '📄', title: 'Browse all jobs', description: 'View career listings' },
  ],
  property: [
    { icon: '🏠', title: 'Homes for rent', description: 'Search local property listings', query: 'rent' },
    { icon: '🏘️', title: 'Homes for sale', description: 'Explore properties in Diu', query: 'sale' },
    { icon: '🏢', title: 'Commercial spaces', description: 'Browse property enquiries', query: 'commercial' },
  ],
  offers: [
    { icon: '🏷️', title: 'Shopping offers', description: 'Browse partner offers', query: 'shopping' },
    { icon: '🍽️', title: 'Food offers', description: 'Explore local deals', query: 'food' },
    { icon: '✨', title: 'All offers', description: 'View available offers' },
  ],
};

const samples: Record<string, Sample> = {
  shopping: { title: 'Hand-block printed cotton kurta', description: 'Illustrative product sample with size and color options.', location: 'Diu town · sample location', fields: [['Sample price', '₹799'], ['Sample stock', '8 pieces'], ['Sample seller', 'Demo local store']] },
  'buy-sell': { title: 'Pre-loved city bicycle', description: 'Example community listing; seller contact is not real or enabled.', location: 'Diu town · sample location', fields: [['Sample price', '₹2,500'], ['Condition', 'Good · sample'], ['Listing status', 'Demo listing']] },
  food: { title: 'Coastal thali', description: 'Example menu item for a local restaurant listing.', location: 'Diu town · sample location', fields: [['Sample price', '₹280 / plate'], ['Cuisine', 'Gujarati coastal · sample'], ['Hours', '12 PM–10 PM · sample']] },
  grocery: { title: 'Seasonal vegetables basket', description: 'Example daily-needs listing with unit and stock fields.', location: 'Diu town · sample location', fields: [['Sample unit', '1 kg basket'], ['Sample price', '₹120'], ['Stock', 'Available · sample']] },
  hotels: { title: 'Sea-view guest room', description: 'Example stay listing; no real room availability or booking.', location: 'Diu · sample location', fields: [['Sample rate', '₹2,800 / night'], ['Room type', 'Double room · sample'], ['Check-in', '12 PM · sample']] },
  travel: { title: 'Local coastal cab ride', description: 'Example transport service; no driver or live availability is connected.', location: 'Diu town · sample service area', fields: [['Vehicle', 'Sedan · sample'], ['Starting fare', '₹250 · sample'], ['Availability', 'Preview only']] },
  appointments: { title: 'Wellness consultation', description: 'Example appointment service; no provider or booking is connected.', location: 'Diu town · sample location', fields: [['Provider', 'Demo wellness studio'], ['Sample fee', '₹400'], ['Schedule', 'By appointment · sample']] },
  explore: { title: 'Diu Fort & coastal walk', description: 'Illustrative destination guide card. Check official guidance before travelling.', location: 'Diu · sample guide', fields: [['Suggested duration', '2–3 hours · sample'], ['Suggested time', 'Late afternoon · sample'], ['Entry details', 'Verify locally before visit']] },
  events: { title: 'Island evenings — music night', description: 'Fictional event sample; no event or ticket is being advertised.', location: 'Diu · sample venue', fields: [['Sample date', '20 Dec 2026'], ['Sample time', '6:30 PM'], ['Sample ticket', '₹299 · demo only']] },
  businesses: { title: 'Demo local partner profile', description: 'Example business-directory profile with placeholder details only.', location: 'Diu town · sample address', fields: [['Category', 'Local retail · sample'], ['Hours', '10 AM–8 PM · sample'], ['Verification', 'Not verified · demo']] },
  'home-services': { title: 'Home plumbing visit', description: 'Example service request details; no real provider or dispatch is connected.', location: 'Diu town · sample service area', fields: [['Service', 'Tap and pipe repair'], ['Sample estimate', 'From ₹350'], ['Availability', 'By appointment · sample']] },
  jobs: { title: 'Customer support associate', description: 'Fictional job sample; this is not an active vacancy or employer.', location: 'Diu · sample workplace', fields: [['Work type', 'Full-time · sample'], ['Sample pay range', '₹15,000–₹20,000 / month'], ['Application status', 'Demo only']] },
  property: { title: 'Two-bedroom coastal home', description: 'Fictional property sample; not a verified sale or rental listing.', location: 'Diu town · sample locality', fields: [['Listing type', 'For rent · sample'], ['Sample rent', '₹18,000 / month'], ['Area', '850 sq ft · sample']] },
  offers: { title: 'Local discovery welcome offer', description: 'Fictional promotion sample; no coupon can be redeemed.', location: 'Diu · sample offer', fields: [['Sample discount', '15% off'], ['Sample minimum order', '₹499'], ['Validity', '30 Nov 2026 · demo only']] },
};

function target(categorySlug: string, href: string, query?: string) {
  if (categorySlug === 'explore') return query ? `/explore?category=${query}` : href;
  if (categorySlug === 'buy-sell' || !query) return href;
  return `${href}${href.includes('?') ? '&' : '?'}q=${encodeURIComponent(query)}`;
}

export function CategoryHighlights() {
  return <div className="category-highlights" aria-label="Explore category highlights">
    <p className="category-sample-notice"><strong>Sample preview only</strong> · Demo details and AI-generated photos; not real listings, offers, availability, or contacts.</p>
    {mainCategories.map((category) => <section className="section category-highlight-section" key={category.slug} aria-labelledby={`highlight-${category.slug}`}>
      <div className="sectionhead"><div><div className="kicker">Browse by interest</div><h2 id={`highlight-${category.slug}`}>{category.label.en}</h2></div><Link className="muted" href={category.href}>Browse all →</Link></div>
      <article className="category-sample-card">
        <img src={`/category-samples/${category.slug}.webp`} alt={`AI-generated illustrative sample photo for ${category.label.en}`} loading="lazy" />
        <div className="category-sample-content"><span className="category-sample-badge">SAMPLE · NOT LIVE</span><h3>{samples[category.slug].title}</h3><p>{samples[category.slug].description}</p>
          <dl>{samples[category.slug].fields.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
          <span className="category-sample-location">{samples[category.slug].location}</span>
        </div>
      </article>
      <div className="grid category-highlight-links">{highlights[category.slug].map((item) => <Link className="card category-highlight-card" href={target(category.slug, category.href, item.query)} key={item.title}>
        <span className="icon" aria-hidden="true">{item.icon}</span><h3>{item.title}</h3><span className="muted">{item.description}</span>
      </Link>)}</div>
    </section>)}
  </div>;
}
