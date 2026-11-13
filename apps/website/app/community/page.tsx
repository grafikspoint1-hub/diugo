import Link from 'next/link';

const communities = [
  { name: 'Diu Foodies', detail: 'Share local dishes, cafés and honest recommendations.' },
  { name: 'Diu Creators', detail: 'Meet photographers, makers and artists from the island.' },
  { name: 'Diu Families', detail: 'Find useful updates, activities and neighbourhood conversations.' },
];

export default function CommunityPage() {
  return (
    <main className="shell page-space">
      <Link className="muted" href="/">← Back to DIU GO</Link>
      <div className="sectionhead page-heading">
        <div><div className="kicker">Community</div><h1>Find your people in Diu</h1></div>
        <span className="muted">Verified spaces for local conversations</span>
      </div>
      <div className="grid">
        {communities.map((community) => (
          <article className="card" key={community.name}>
            <span className="icon">👥</span>
            <h2>{community.name}</h2>
            <p className="muted">{community.detail}</p>
            <button className="button" type="button" disabled>Joining soon</button>
          </article>
        ))}
      </div>
    </main>
  );
}
