import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'How It Works — KidSpot',
  description: 'Learn how KidSpot handles venue verification, safety checks, and party booking logistics for parents.',
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF5] text-brand-dark pb-24 md:pb-16">
      {/* Hero Header */}
      <section className="relative mx-auto max-w-4xl px-4 sm:px-8 pt-12 md:pt-16 pb-12 text-center">
        {/* Glow backdrop effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-brand-yellow/30 via-pink-200/30 to-purple-200/30 rounded-full blur-3xl -z-10" />

        <div className="inline-flex items-center gap-1.5 rounded-full bg-badge-pink px-4 py-1.5 text-xs font-bold text-[#9F1239] shadow-sm mb-6">
          <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
          Simple & Stress-Free
        </div>

        <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-brand-dark leading-tight">
          Planning a party made simple.
        </h1>

        <p className="mt-4 text-sm md:text-base text-[#5E5E5E] max-w-xl mx-auto leading-relaxed">
          We handle the venues, the safety checks, and the booking logistics. You just focus on the cake and the memories.
        </p>
      </section>

      {/* 4 Steps Grid */}
      <section className="mx-auto max-w-5xl px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1: Discover */}
          <div className="bg-white rounded-3xl border border-[#EBE5D3] p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-brand-yellow flex items-center justify-center mb-6 text-brand-dark">
                <span className="material-symbols-outlined text-[24px]">search</span>
              </div>
              <h3 className="font-display text-xl font-bold text-brand-dark mb-2">
                1. Discover
              </h3>
              <p className="text-sm text-[#5E5E5E] leading-relaxed">
                Search by location, age, and theme to find the perfect spot.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#F3EEDA] px-3 py-1 text-xs font-bold text-brand-dark">
                📍 London
              </span>
              <span className="rounded-full bg-[#F3EEDA] px-3 py-1 text-xs font-bold text-brand-dark">
                🎂 Ages 4-8
              </span>
              <span className="rounded-full bg-[#F3EEDA] px-3 py-1 text-xs font-bold text-brand-dark">
                🚀 Space Theme
              </span>
            </div>
          </div>

          {/* Step 2: Trust */}
          <div className="bg-white rounded-3xl border border-[#EBE5D3] p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-badge-purple flex items-center justify-center mb-6 text-[#6B21A8]">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
              </div>
              <h3 className="font-display text-xl font-bold text-brand-dark mb-2">
                2. Trust
              </h3>
              <p className="text-sm text-[#5E5E5E] leading-relaxed">
                Every venue is safety-checked by our team before listing.
              </p>
            </div>

            <div className="mt-8 bg-[#F5EEFF] border border-[#E2CEFF] rounded-2xl p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-[28px] text-[#6B21A8]">
                verified
              </span>
              <div>
                <h4 className="text-xs font-bold text-[#6B21A8]">KidSpot Certified</h4>
                <p className="text-[11px] text-[#5E5E5E] font-medium">100pt Safety Inspection Passed</p>
              </div>
            </div>
          </div>

          {/* Step 3: Book */}
          <div className="bg-white rounded-3xl border border-[#EBE5D3] p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-badge-pink flex items-center justify-center mb-6 text-[#9F1239]">
                <span className="material-symbols-outlined text-[24px]">calendar_today</span>
              </div>
              <h3 className="font-display text-xl font-bold text-brand-dark mb-2">
                3. Book
              </h3>
              <p className="text-sm text-[#5E5E5E] leading-relaxed">
                Secure your date instantly with a small deposit.
              </p>
            </div>

            <div className="mt-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3EEDA] px-3.5 py-1.5 text-xs font-bold text-brand-dark border border-[#E5DEC9]">
                <span className="material-symbols-outlined text-[16px] text-green-600">
                  check_circle
                </span>
                Date Secured
              </span>
            </div>
          </div>

          {/* Step 4: Celebrate (Olive Green Container) */}
          <div className="bg-brand-olive rounded-3xl p-8 shadow-md text-white flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-6 text-white backdrop-blur-sm">
                <span className="material-symbols-outlined text-[24px]">celebration</span>
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-2">
                4. Celebrate
              </h3>
              <p className="text-sm text-white/90 leading-relaxed">
                Enjoy the day while we handle the details.
              </p>
            </div>

            <div className="mt-8 flex justify-end">
              <span className="material-symbols-outlined text-[64px] text-white/20">
                sentiment_very_satisfied
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials / Why Parents Love Us */}
      <section className="mx-auto max-w-5xl px-4 sm:px-8 mt-16 md:mt-24">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-brand-dark">
            Why parents love us
          </h2>
          <p className="text-sm text-[#5E5E5E] mt-2">
            Don't just take our word for it. Hear from parents who have planned unforgettable parties.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Testimonial 1 */}
          <div className="bg-white rounded-3xl border border-[#EBE5D3] p-6 shadow-sm flex flex-col justify-between">
            <p className="text-xs text-brand-dark leading-relaxed font-medium">
              "Finding a safe and fun place for my 5-year-old's party used to be a nightmare. KidSpot made it incredibly easy. The safety guarantee gave me peace of mind."
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-yellow flex items-center justify-center font-bold text-xs text-brand-dark">
                SJ
              </div>
              <div>
                <h4 className="text-xs font-bold text-brand-dark">Sarah J.</h4>
                <p className="text-[10px] text-[#5E5E5E]">Islington, London</p>
              </div>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-white rounded-3xl border border-[#EBE5D3] p-6 shadow-sm flex flex-col justify-between">
            <p className="text-xs text-brand-dark leading-relaxed font-medium">
              "The instant booking feature is a game-changer. I secured our preferred bouncy castle place in minutes without endless phone calls. Highly recommend!"
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-badge-purple flex items-center justify-center font-bold text-xs text-[#6B21A8]">
                MT
              </div>
              <div>
                <h4 className="text-xs font-bold text-brand-dark">Michael T.</h4>
                <p className="text-[10px] text-[#5E5E5E]">Camden, London</p>
              </div>
            </div>
          </div>

          {/* Testimonial 3 */}
          <div className="bg-white rounded-3xl border border-[#EBE5D3] p-6 shadow-sm flex flex-col justify-between">
            <p className="text-xs text-brand-dark leading-relaxed font-medium">
              "I loved how I could filter by age and theme. It pointed me to a fantastic art studio I didn't even know existed. Best birthday ever!"
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-badge-pink flex items-center justify-center font-bold text-xs text-[#9F1239]">
                ER
              </div>
              <div>
                <h4 className="text-xs font-bold text-brand-dark">Elena R.</h4>
                <p className="text-[10px] text-[#5E5E5E]">Greenwich, London</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
