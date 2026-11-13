import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DIU GO — Your City. Your Everything.',
    short_name: 'DIU GO',
    description: 'Discover local businesses, products, food, stays and experiences in Diu.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f7fa',
    theme_color: '#082f49',
    icons: [{ src: '/icon.png', sizes: '1280x1280', type: 'image/png', purpose: 'any' }],
  };
}
