import Link from 'next/link';
import { getBusinesses, getCategories } from '../../lib/catalog';

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const [categories, businesses] = await Promise.all([getCategories(), getBusinesses(q)]);
  const browsableCategories = categories?.filter((category) => category.slug !== 'buy-sell') ?? [];
  return <main className="shell section category-results"><div className="sectionhead"><div><div className="kicker">Local directory</div><h1>Businesses in Diu</h1><p className="muted">Approved local partners only. No sample businesses are presented as live listings.</p></div><Link className="button secondary-button" href="/">Back home</Link></div>
    <form className="search category-search" action="/categories"><input name="q" defaultValue={q} placeholder="Search local businesses…" aria-label="Search businesses" /><button className="button" type="submit">Search</button></form>
    {browsableCategories.length > 0 && <nav className="directory-categories" aria-label="Business categories">{browsableCategories.map((category) => <Link className="pill" key={category.id} href={`/category/${category.slug}`}>{category.name}</Link>)}</nav>}
    {businesses?.length ? <div className="category-results-grid">{businesses.map((business) => <Link className="card directory-card" href={`/businesses/${encodeURIComponent(business.slug)}`} key={business.id}><span className="pill">{business.category?.name ?? 'Local business'}</span><h2>{business.name}</h2>{business.description && <p className="muted">{business.description}</p>}<p className="muted">{business.locality ?? business.address ?? 'Diu'}</p><span className="text-link">View business →</span></Link>)}</div> : <div className="empty">{q ? 'No approved businesses match this search.' : 'No approved local businesses are listed yet. Check back as partners are verified.'}</div>}
  </main>;
}
