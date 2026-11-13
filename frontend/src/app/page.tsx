import { LandingPage } from '@/components/landing/landing-page';
import { fetchLandingPreviews } from '@/lib/landing-previews';

export const revalidate = 120;

export default async function HomePage() {
  const previews = await fetchLandingPreviews();
  return <LandingPage previews={previews} />;
}
