import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-brand-border bg-white px-4 py-10 pb-24 sm:px-8 md:pb-12">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-start">
        <div>
          <Link href="/" className="text-base font-semibold tracking-tight text-brand-dark">
            KidSpot
          </Link>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-brand-muted">
            Parties and activities for under-7s in Greater London. Search, shortlist,
            then enquire directly with the venue.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-brand-muted">
          <Link href="/search" className="hover:text-brand-dark">
            Search
          </Link>
          <Link href="/how-it-works" className="hover:text-brand-dark">
            How it works
          </Link>
          <Link href="/saved" className="hover:text-brand-dark">
            Saved
          </Link>
          <Link href="/compare" className="hover:text-brand-dark">
            Compare
          </Link>
          <Link href="/about" className="hover:text-brand-dark">
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}
