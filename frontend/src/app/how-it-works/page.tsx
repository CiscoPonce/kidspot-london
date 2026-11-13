import Link from 'next/link';

export const metadata = {
  title: 'How it works — KidSpot',
  description:
    'Search London places for under-7 parties and activities, shortlist a few, then call the venue. KidSpot is a finder, not a booking marketplace.',
};

const STEPS = [
  {
    title: '1. Search nearby',
    body: 'Type a London postcode. Choose birthday party or activity, and keep the focus on under-7s.',
  },
  {
    title: '2. Shortlist',
    body: 'Save two or three places. Compare capacity and the phone number. Ask the venue about their age range.',
  },
  {
    title: '3. Call and book',
    body: 'Availability and price are confirmed with the venue. We do not take deposits or invent open slots.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-brand-paper pb-24 text-brand-dark md:pb-16">
      <section className="mx-auto max-w-3xl px-4 pb-10 pt-12 sm:px-8 sm:pt-16">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
          How it works
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          A finder for under-7 parties and play
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-muted">
          KidSpot helps London parents organise a birthday or a weekend activity for
          children under seven. You still book with the venue — that is the honest product.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.title} className="rounded-2xl border border-brand-border bg-white p-6">
              <h2 className="font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-muted">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="safety" className="mx-auto mt-12 max-w-3xl px-4 sm:px-8">
        <div className="rounded-2xl border border-brand-border bg-white p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold">What we check — and what we don’t</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-brand-muted">
            <li>Venues come from maps, council lists and websites. Closed or unused places are hidden when we can confirm that.</li>
            <li>Under 7s is who we built this for. We do not have official age ratings on every hall — ask about toddler sessions and height limits.</li>
            <li>Food, cake and prices appear only when we have extracted them. If a card says “call for price”, that is the truth.</li>
          </ul>
          <Link
            href="/search"
            className="mt-6 inline-flex rounded-xl bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand-yellow-hover"
          >
            Find a place
          </Link>
        </div>
      </section>
    </div>
  );
}
