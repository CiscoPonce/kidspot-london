import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KidSpot London — Find brilliant party venues for kids',
    short_name: 'KidSpot',
    description:
      'Find soft play, parks, museums and party venues for kids across London',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff9e6',
    theme_color: '#006972',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
