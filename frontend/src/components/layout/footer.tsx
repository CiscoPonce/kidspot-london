import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-[#FFFDF5] border-t border-[#EBE5D3] py-8 pb-24 md:pb-12 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <Link href="/" className="font-display text-xl font-bold tracking-tight text-brand-dark">
            KidSpot
          </Link>
          <p className="text-xs text-[#5E5E5E] mt-1">
            © 2024 KidSpot. Safety-checked adventures for every child.
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-[#5E5E5E]">
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
