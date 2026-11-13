import Link from 'next/link';
import { AddToCartButton } from '../commerce-actions';
import { getProducts } from '../../lib/catalog';

type SearchProps = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: SearchProps) {
  const { q = '' } = await searchParams;
  const products = await getProducts(q);
  return <>
    <header className="topline"><div className="shell">DIU GO search · Diu, Gujarat</div></header>
    <main className="shell section">
      <div className="sectionhead"><div><div className="kicker">Discover locally</div><h1>Search DIU GO</h1><p className="muted">{q ? `Results for “${q}”` : 'Search products and local partners.'}</p></div>
        <div><Link className="button secondary-button" href="/cart">Cart</Link> <Link className="button" href="/">Back home</Link></div>
      </div>
      <form className="search" action="/search"><input name="q" defaultValue={q} placeholder="Search products, shops and services…" aria-label="Search results" /><button className="button">Search →</button></form>
      {products?.length ? <div className="grid">{products.map((product) => <article className="card" key={product.id}>
        {product.imageUrl && <img className="product-image" src={product.imageUrl} alt={product.name} />}
        <h2>{product.name}</h2><p className="muted">{product.business?.name ?? 'Local partner'}</p>
        {product.description && <p className="muted">{product.description}</p>}
        <strong>₹{(product.pricePaise / 100).toLocaleString('en-IN')}</strong>
        <AddToCartButton productId={product.id} available={(product.stock ?? 0) - (product.reservedStock ?? 0)} />
      </article>)}</div> : <div className="empty">No approved products matched this search yet. Try another term or browse the service categories on the home page.</div>}
    </main>
  </>;
}
