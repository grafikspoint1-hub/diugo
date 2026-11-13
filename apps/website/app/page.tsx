import Image from 'next/image';
import { CategoryNavigation } from './category-navigation';
import { CategoryHighlights } from './category-highlights';
import { DiscoverySections } from './discovery-sections';

export default function HomePage() {
  return <>
    <div className="topline"><div className="shell"><span>Welcome to DIU GO</span><strong>Your island, a little closer.</strong><a href="/emergency">Need urgent help? <b>Emergency contacts →</b></a></div></div>
    <nav className="nav"><div className="shell navrow">
      <a className="brand" href="/"><Image className="brand-logo" src="/icon.png" alt="DIU GO coastal lighthouse logo" width={48} height={48} priority /><span>DIU GO<small>YOUR CITY. YOUR EVERYTHING.</small></span></a>
      <span className="nav-location"><span aria-hidden="true">⌖</span> Diu, Gujarat</span>
      <div className="links"><a href="#services">Services</a><a href="/category/shopping">Shop local</a><a href="#highlight-explore">Explore Diu</a><a href="/events">Events</a><a href="/emergency">Emergency help</a></div>
      <a className="button secondary-button" href="/cart">Cart</a>
      <a className="button" href="/account">Sign in</a>
      <div className="mobile-links" aria-label="Quick navigation"><a href="#services">Services</a><a href="/category/shopping">Shop local</a><a href="/explore">Explore Diu</a><a href="/events">Events</a><a href="/emergency">Emergency</a></div>
    </div></nav>
    <main className="shell">
      <section className="hero home-hero"><div className="home-hero-copy"><div className="eyebrow"><span className="hero-sun" aria-hidden="true">✳</span> A local guide to island life</div><h1>Find your kind<br />of <em>Diu.</em></h1><p>From a favourite local meal to your next coastal escape, make more of every day on the island.</p><a className="button hero-button" href="#services">Explore the island <span aria-hidden="true">↗</span></a><div className="hero-note"><span className="hero-note-dot" /> Made for locals. Lovely for visitors.</div></div><div className="home-hero-scene"><img src="/category-samples/explore.webp" alt="Illustrative coastal view representing Diu" /><div className="scene-shade" /><div className="scene-caption"><span>THE ISLAND EDIT</span><strong>Slow down. Look around.</strong></div><div className="scene-stamp" aria-hidden="true">DIU<br /><span>20°42′ N</span></div></div></section>
      <form className="search home-search" action="/search"><span className="search-icon" aria-hidden="true">⌕</span><label className="visually-hidden" htmlFor="home-search">Search DIU GO</label><input id="home-search" name="q" placeholder="What are you looking for today?" /><span className="search-hint">Shops · food · stays · experiences</span><button className="button">Search <span aria-hidden="true">↗</span></button></form>
      <CategoryNavigation />
      <CategoryHighlights />
      <DiscoverySections />
    </main>
    <footer className="footer"><div className="shell">DIU GO · Your City. Your Everything. <span className="muted">Online payments only · Diu, Gujarat</span></div></footer>
  </>;
}
