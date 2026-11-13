import type { Metadata } from 'next';
import './globals.css';
import './category-highlights.css';
import './overrides.css';
import './commerce.css';
import './emergency.css';
import './category-feed.css';
import './theme.css';
import './home-refresh.css';
import './admin-auth.css';

export const metadata: Metadata = {
  title: 'DIU GO — Your City. Your Everything.',
  description: 'Discover local businesses, products, food, stays and experiences in Diu.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
