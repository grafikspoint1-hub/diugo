import Link from 'next/link';
import { getEvents } from '../../lib/catalog';

export default async function EventsPage() {
  const events = await getEvents();
  return <main className="shell section"><div className="sectionhead"><div><div className="kicker">Events & tickets</div><h1>Events in Diu</h1><p className="muted">Only published upcoming event records are shown.</p></div><Link className="button secondary-button" href="/">Back home</Link></div>
    {events?.length ? <div className="category-results-grid">{events.map((event) => <article className="card" key={event.id}><div className="kicker">{new Date(event.startsAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div><h2>{event.title}</h2><p className="muted">{event.venue ?? 'Venue to be confirmed'}</p>{event.description && <p>{event.description}</p>}<p className="muted">Ticket ordering is not enabled in this release.</p></article>)}</div> : <div className="empty">No verified upcoming events have been published yet. Ticket sales are not enabled in this preview.</div>}
  </main>;
}
