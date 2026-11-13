import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBusiness } from '../../../lib/catalog';
import { AddToCartButton } from '../../commerce-actions';

export default async function BusinessDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();
  return <main className="shell section category-results"><Link className="text-link" href="/categories">← All local businesses</Link><header className="business-detail-header"><div className="kicker">{business.category?.name ?? 'Local business'} · Diu</div><h1>{business.name}</h1><p className="muted">{business.description}</p><p className="muted">{business.locality ?? business.address ?? 'Diu'}</p></header>
    {business.products?.length ? <section className="section"><h2>Products</h2><div className="category-results-grid">{business.products.map((product) => <article className="card" key={product.id}>{product.imageUrl && <img className="product-image" src={product.imageUrl} alt={product.name} />}<h3>{product.name}</h3><p className="muted">{product.description}</p><strong>₹{(product.pricePaise / 100).toLocaleString('en-IN')}</strong><AddToCartButton productId={product.id} available={(product.stock ?? 0) - (product.reservedStock ?? 0)} /></article>)}</div></section> : <div className="empty">This business has no currently available online products.</div>}
  </main>;
}
