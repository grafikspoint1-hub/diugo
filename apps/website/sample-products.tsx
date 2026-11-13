const samples = [
  ['🥭', 'Diu Farm Fresh Mango Box', 'Fresh Market', 'Fresh produce · 5 kg box', '₹699', 'In stock · Same-day delivery', 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=85'],
  ['🍰', 'Coconut Celebration Cake', 'Island Bakery', 'Bakery · Serves 6–8', '₹899', 'Made to order · 24-hour notice', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=85'],
  ['📱', 'Wireless Earbuds', 'Digital Hub', 'Electronics · 1-year warranty', '₹1,299', 'In stock · Local delivery', 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=85'],
  ['🧺', 'Handwoven Diu Tote', 'Diu Handcrafts', 'Local craft · Handmade', '₹499', 'Limited stock · Pickup available', 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=85'],
];

export function SampleProducts() {
  return <section className="section sample-products"><div className="sectionhead"><div><div className="kicker">Preview catalog</div><h2>Featured product samples</h2></div><span className="muted">Illustrative listings</span></div><p className="muted section-intro">These examples show the complete product-card format. Approved API products will replace them automatically when available.</p><div className="grid">{samples.map(([icon, name, seller, details, price, status, image]) => <article className="card photo-card" key={name}><img className="card-image" src={image} alt={name} loading="eager" /><span className="icon">{icon}</span><h3>{name}</h3><p className="muted">{seller}</p><p className="muted">{details}</p><strong>{price}</strong><p className="status">{status}</p><a className="text-link" href={`/search?q=${encodeURIComponent(name)}`}>View sample →</a></article>)}</div></section>;
}
