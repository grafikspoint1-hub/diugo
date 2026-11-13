import Link from 'next/link';

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const title = category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Explore Diu';
  return <main className="shell section"><div className="sectionhead"><div><div className="kicker">Diu destination guide</div><h1>{title}</h1><p className="muted">Verified local discovery content will be published here as the tourism catalog is connected.</p></div><Link className="button" href="/">Back home</Link></div><div className="empty">No verified listings are available for this category yet. Check back soon for places, directions and local experiences.</div></main>;
}
