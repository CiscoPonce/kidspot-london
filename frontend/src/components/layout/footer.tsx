import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-brand-border bg-brand-paper px-4 py-8 pb-24 sm:px-8 md:pb-12">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <Link href="/" className="text-base font-semibold tracking-tight text-brand-dark">
            KidSpot
          </Link>
          <p className="mt-1 text-xs text-brand-muted">
            Birthday party venues in Greater London. Enquire directly with venues.
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-brand-muted">
          <Link href="/about" className="hover:text-brand-dark transition-colors">
            About Us
          </Link>
          <Link href="/how-it-works#safety" className="hover:text-brand-dark transition-colors">
            Safety Standards
          </Link>
          <Link href="/partner" className="hover:text-brand-dark transition-colors">
            Partner with Us
          </Link>
          <Link href="/privacy" className="hover:text-brand-dark transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-brand-dark transition-colors">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-brand-dark transition-colors">
            Contact Support
          </Link>
        </nav>
      </div>
    </footer>
  );
}
