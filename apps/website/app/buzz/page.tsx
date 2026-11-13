import Link from 'next/link';

const stories = [
  { title: 'Sunset at Naida Caves', detail: 'A calm evening guide for first-time visitors.' },
  { title: 'Made in Diu', detail: 'Meet the local makers creating thoughtful island goods.' },
  { title: 'Weekend food trail', detail: 'A simple route through neighbourhood favourites.' },
];

export default function BuzzPage() {
  return (
    <main className="shell page-space">
      <Link className="muted" href="/">← Back to DIU GO</Link>
      <div className="sectionhead page-heading">
        <div><div className="kicker">Diu Buzz</div><h1>What’s happening around the island</h1></div>
        <span className="muted">Local stories and useful updates</span>
      </div>
      <div className="grid">
        {stories.map((story) => (
          <article className="card" key={story.title}>
            <span className="icon">✨</span>
            <h2>{story.title}</h2>
            <p className="muted">{story.detail}</p>
            <button className="button" type="button" disabled>Story coming soon</button>
          </article>
        ))}
      </div>
    </main>
  );
}
