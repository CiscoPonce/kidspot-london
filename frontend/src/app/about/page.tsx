import Link from 'next/link';

export const metadata = {
  title: 'About — KidSpot',
  description: 'KidSpot helps Greater London parents of under-7s organise birthday parties and weekend activities.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 pb-24 sm:px-8">
      <h1 className="font-display text-4xl font-semibold tracking-tight">About KidSpot</h1>
      <p className="mt-4 text-sm leading-relaxed text-brand-muted">
        KidSpot is for parents in Greater London organising a birthday party or a
        weekend activity for children under seven. Search by postcode, shortlist a
        few, then call the venue. We are a finder — not a booking marketplace.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-brand-muted">
        Soft play, halls, parks and play centres sit first. We do not invent official
        age ratings. The live product is on this site now: search, saved list and compare.
      </p>
      <Link
        href="/search"
        className="mt-8 inline-flex rounded-xl bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand-yellow-hover"
      >
        Find a party or activity
      </Link>
    </div>
  );
}
