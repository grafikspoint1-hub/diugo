import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mainCategories } from '../../../lib/categories';
import { getBusinesses, getCategories, getProducts } from '../../../lib/catalog';
import { AddToCartButton } from '../../commerce-actions';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> };
const apiCategorySlug: Record<string, string | undefined> = {
  shopping: undefined, food: 'food', grocery: 'grocery', hotels: 'hotels', travel: 'travel',
  appointments: 'healthcare', 'home-services': 'home-services', property: 'property', jobs: 'jobs',
};

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, { q = '' }] = await Promise.all([params, searchParams]);
  const definition = mainCategories.find((category) => category.slug === slug);
  if (!definition) notFound();
  const lookupSlug = apiCategorySlug[slug];
  const [categories, allProducts, allBusinesses] = await Promise.all([getCategories(), getProducts(q), getBusinesses(q)]);
  const categoryId = lookupSlug ? categories?.find((category) => category.slug === lookupSlug)?.id : undefined;
  const [products, businesses] = categoryId
    ? await Promise.all([getProducts(q, categoryId), getBusinesses(q, categoryId)])
    : [allProducts, allBusinesses];
  const connected = ['shopping', 'food', 'grocery', 'hotels', 'travel', 'appointments', 'home-services', 'property'].includes(slug);
  return <main className="shell section category-results">
    <div className="sectionhead"><div><div className="kicker">DIU GO · Diu, Gujarat</div><h1>{definition.label.en}</h1><p className="muted">{definition.detail}</p></div><Link className="button secondary-button" href="/">Back home</Link></div>
    <form className="search category-search" action={`/category/${slug}`}><input name="q" defaultValue={q} aria-label={`Search ${definition.label.en}`} placeholder={`Search ${definition.label.en.toLowerCase()}…`} /><button className="button" type="submit">Search</button></form>
    {!connected ? <div className="empty">This category is not connected to a live listings service yet. No sample listings are shown as real.</div> : <>
      <section className="section"><div className="sectionhead"><h2>Local businesses</h2><span className="muted">Approved directory listings</span></div>
        {businesses?.length ? <div className="category-results-grid">{businesses.map((business) => <article className="card" key={business.id}><span className="pill">{business.category?.name ?? 'Local business'}</span><h3>{business.name}</h3>{business.description && <p className="muted">{business.description}</p>}<p className="muted">{business.locality ?? business.address ?? 'Diu'}</p></article>)}</div> : <div className="empty">No approved local businesses are listed in this category yet.</div>}
      </section>
      {slug !== 'hotels' && slug !== 'travel' && slug !== 'appointments' && slug !== 'home-services' && slug !== 'property' && <section className="section"><div className="sectionhead"><h2>Products</h2><span className="muted">Vendor checkout · online payments only</span></div>
        {products?.length ? <div className="category-results-grid">{products.map((product) => <article className="card" key={product.id}>{product.imageUrl && <img className="product-image" src={product.imageUrl} alt={product.name} />}<h3>{product.name}</h3><p className="muted">{product.business?.name ?? 'Local partner'}</p><strong>₹{(product.pricePaise / 100).toLocaleString('en-IN')}</strong><AddToCartButton productId={product.id} available={(product.stock ?? 0) - (product.reservedStock ?? 0)} /></article>)}</div> : <div className="empty">No approved products are listed here yet.</div>}
      </section>}
    </>}
  </main>;
}
