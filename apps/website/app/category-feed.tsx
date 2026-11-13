import Link from 'next/link';
import { mainCategories } from '../lib/categories';
import { getBusinesses, getClassifiedListings, getEvents, type Business, type ClassifiedListing, type EventListing, type Product } from '../lib/catalog';
import { AddToCartButton } from './commerce-actions';

const categorySources: Record<string, string[]> = {
  shopping: ['fashion', 'electronics'], food: ['food'], grocery: ['grocery'], hotels: ['hotels'], travel: ['travel'],
  appointments: ['salon-spa', 'healthcare'], explore: ['tourism'], events: ['events'], 'home-services': ['home-services'], property: ['property'],
};

function money(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
}

function ProductCard({ product }: { product: Product }) {
  return <article className="feed-card" key={product.id}>
    {product.imageUrl ? <img className="feed-image" src={product.imageUrl} alt={product.name} loading="lazy" /> : <div className="feed-image feed-image-placeholder" aria-hidden="true">{product.category?.name ?? 'DIU GO'}</div>}
    <div className="feed-card-body"><span className="feed-tag">{product.category?.name ?? 'Local product'}</span><h3>{product.name}</h3><p className="muted">{product.business?.name ?? 'Local store'}</p><strong>{money(product.pricePaise)}</strong><AddToCartButton productId={product.id} available={(product.stock ?? 0) - (product.reservedStock ?? 0)} /></div>
  </article>;
}

function BusinessCard({ business }: { business: Business }) {
  return <Link className="feed-card feed-business-card" href={`/businesses/${encodeURIComponent(business.slug)}`} key={business.id}>
    <span className="feed-tag">{business.category?.name ?? 'Local business'}</span><span className="feed-store-mark" aria-hidden="true">{business.name.slice(0, 1).toUpperCase()}</span><h3>{business.name}</h3><p className="muted">{business.description || 'Discover this approved local business.'}</p><span className="feed-location">⌖ {business.locality ?? business.address ?? 'Diu'}</span><span className="text-link">View details →</span>
  </Link>;
}

function EventCard({ event }: { event: EventListing }) {
  return <Link className="feed-card feed-business-card" href="/events" key={event.id}><span className="feed-tag">Upcoming event</span><span className="feed-store-mark" aria-hidden="true">✦</span><h3>{event.title}</h3><p className="muted">{event.venue ?? 'Diu'} · {new Date(event.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p><span className="text-link">Event details →</span></Link>;
}

function ClassifiedCard({ listing }: { listing: ClassifiedListing }) {
  return <Link className="feed-card" href={`/buy-sell/${encodeURIComponent(listing.id)}`} key={listing.id}>
    {listing.photoUrls[0] ? <img className="feed-image" src={listing.photoUrls[0]} alt={listing.title} loading="lazy" /> : <div className="feed-image feed-image-placeholder" aria-hidden="true">Pre-loved find</div>}
    <div className="feed-card-body"><span className="feed-tag">{listing.category.name} · {listing.condition.split('_').join(' ').toLowerCase()}</span><h3>{listing.title}</h3><p className="muted">{listing.locality}</p><strong>{money(listing.pricePaise)}</strong><span className="text-link">View listing →</span></div>
  </Link>;
}

export async function CategoryFeed({ products }: { products: Product[] | null }) {
  const [businesses, events, classifiedListings] = await Promise.all([getBusinesses(), getEvents(), getClassifiedListings()]);
  const hasFeedData = Boolean(products?.length || businesses?.length || events?.length || classifiedListings?.length);

  return <section className="section category-feed" id="products" aria-labelledby="category-feed-title">
    <div className="sectionhead"><div><div className="kicker">Discover locally</div><h2 id="category-feed-title">Diu, category by category</h2><p className="muted">Fresh listings from approved local partners.</p></div><Link className="muted" href="/categories">Browse directory →</Link></div>
    {!hasFeedData ? <div className="empty">Approved products, local businesses and upcoming events will appear here in their categories as partners publish them.</div> : <div className="category-feed-list">
      {mainCategories.filter(category => categorySources[category.slug] || category.slug === 'buy-sell').map(category => {
        const sourceSlugs = categorySources[category.slug] ?? [];
        const matches = (item: { category?: { slug: string } | null }) => Boolean(item.category && sourceSlugs.includes(item.category.slug));
        const categoryProducts = (products ?? []).filter(matches);
        const categoryBusinesses = (businesses ?? []).filter(matches);
        const categoryEvents = category.slug === 'events' ? (events ?? []) : [];
        const categoryClassifieds = category.slug === 'buy-sell' ? (classifiedListings ?? []) : [];
        if (!categoryProducts.length && !categoryBusinesses.length && !categoryEvents.length && !categoryClassifieds.length) return null;
        const label = category.label.en;
        return <section className="category-feed-row" key={category.slug} aria-labelledby={`feed-${category.slug}`}>
          <div className="feed-row-heading"><div><span className="kicker">Local discovery</span><h3 id={`feed-${category.slug}`}>{label}</h3></div><Link href={category.href}>Explore {label} →</Link></div>
          <div className="feed-rail">{categoryProducts.slice(0, 6).map(product => <ProductCard product={product} key={product.id} />)}{categoryBusinesses.slice(0, 6).map(business => <BusinessCard business={business} key={business.id} />)}{categoryEvents.slice(0, 6).map(event => <EventCard event={event} key={event.id} />)}{categoryClassifieds.slice(0, 6).map(listing => <ClassifiedCard listing={listing} key={listing.id} />)}</div>
        </section>;
      })}
    </div>}
  </section>;
}
