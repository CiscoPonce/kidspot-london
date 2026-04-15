export default function HomePage() {
  return (
    <main className="min-h-screen bg-secondary-50">
      {/* Mobile breakpoint indicator - hidden in production */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-secondary-800 px-3 py-2 text-sm text-white sm:hidden">
        <span className="font-medium">375px</span>
        <span className="text-secondary-300">Mobile</span>
      </div>

      {/* Desktop breakpoint indicator - hidden in production */}
      <div className="fixed bottom-4 left-4 z-50 hidden items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white lg:flex">
        <span className="font-medium">1280px</span>
        <span className="text-primary-200">Desktop</span>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-secondary-900 sm:text-5xl">
          KidSpot London
        </h1>
        <p className="mt-4 text-lg text-secondary-600">
          Find child-friendly venues near you
        </p>
      </div>
    </main>
  );
}
