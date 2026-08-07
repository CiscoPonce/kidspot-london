'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useBooking } from '@/context/booking-context';

export default function BookingConfirmationPage() {
  const { booking } = useBooking();
  const [checklist, setChecklist] = useState({
    invites: false,
    headcount: false,
    waivers: false,
  });

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDownloadInvite = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Warm Cream
    ctx.fillStyle = '#FFFDF5';
    ctx.fillRect(0, 0, 1200, 630);

    // Decorative Header Banner (Yellow)
    ctx.fillStyle = '#ECE600';
    ctx.fillRect(0, 0, 1200, 120);

    // Header Title
    ctx.fillStyle = '#1D1C10';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("YOU'RE INVITED TO A PARTY! 🎉", 600, 75);

    // Child's Name & Details
    ctx.font = 'extrabold 36px sans-serif';
    ctx.fillText(`Celebrate ${booking.childName}'s Big Day!`, 600, 200);

    // Details Box
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#EBE5D3';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(150, 240, 900, 280, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1D1C10';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`📍 Venue: ${booking.venueName}`, 200, 310);
    ctx.fillText(`📅 Date: ${booking.date}`, 200, 360);
    ctx.fillText(`⏱️ Time: ${booking.timeSlot}`, 200, 410);
    ctx.fillText(`🎁 Ref: ${booking.bookingRef}`, 200, 460);

    // Footer Tagline
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4A5200';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Powered by KidSpot — Safety-Checked Birthday Celebrations', 600, 580);

    // Download Trigger
    const link = document.createElement('a');
    link.download = `Party_Invite_${booking.childName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-brand-dark pb-24 md:pb-16 flex flex-col items-center">
      <div className="mx-auto max-w-4xl px-4 sm:px-8 pt-12 md:pt-16 w-full text-center">
        {/* Top Hero Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-brand-yellow flex items-center justify-center shadow-lg mb-6 text-brand-dark">
          <span className="material-symbols-outlined text-[32px]">celebration</span>
        </div>

        <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-brand-dark leading-tight">
          Party Booked!
        </h1>

        <p className="mt-3 text-sm md:text-base text-[#5E5E5E] max-w-md mx-auto leading-relaxed">
          Get ready for an unforgettable adventure. We've emailed all the details to your inbox.
        </p>

        {/* 2-Card Layout */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Card 1: The Details */}
          <div className="bg-white rounded-3xl border border-[#EBE5D3] p-8 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow/20 rounded-full blur-2xl -z-0" />

            <div>
              <div className="flex items-center gap-2 mb-6 border-b border-[#EBE5D3] pb-4">
                <span className="material-symbols-outlined text-[20px] text-brand-dark">
                  calendar_today
                </span>
                <h3 className="font-display text-base font-bold text-brand-dark">
                  The Details
                </h3>
              </div>

              <div className="space-y-4 text-xs font-medium">
                <div className="flex justify-between items-center">
                  <span className="text-[#5E5E5E]">Venue</span>
                  <span className="font-bold text-sm text-brand-dark">{booking.venueName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5E5E5E]">Date & Time</span>
                  <span className="font-bold text-sm text-brand-dark">{booking.date} • {booking.timeSlot}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5E5E5E]">Package</span>
                  <span className="font-bold text-sm text-brand-dark">{booking.packageTitle} (£{booking.packagePrice})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5E5E5E]">Booking Ref</span>
                  <span className="font-mono font-bold text-xs text-brand-dark bg-[#F3EEDA] px-2 py-0.5 rounded">
                    {booking.bookingRef}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-[#EBE5D3] pt-2">
                  <span className="text-[#5E5E5E]">Total Paid</span>
                  <span className="font-extrabold text-sm text-brand-dark">£{booking.totalPrice}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3EEDA] px-3 py-1 text-xs font-bold text-brand-dark">
                <span className="material-symbols-outlined text-[15px] text-green-600">
                  verified
                </span>
                100% Safe-checked Venue
              </span>
            </div>
          </div>

          {/* Card 2: What's Next Checklist */}
          <div className="bg-[#EAE5D4] rounded-3xl p-8 border border-[#E3DCC8] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6 border-b border-[#D8D0B8] pb-4">
                <span className="material-symbols-outlined text-[20px] text-brand-dark">
                  checklist
                </span>
                <h3 className="font-display text-base font-bold text-brand-dark">
                  What's Next
                </h3>
              </div>

              <div className="space-y-4">
                {/* Checkbox 1 */}
                <div
                  onClick={() => toggleCheck('invites')}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                      checklist.invites
                        ? 'bg-brand-dark border-brand-dark text-white'
                        : 'border-[#8E8B7B] group-hover:border-brand-dark'
                    }`}
                  >
                    {checklist.invites && (
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-dark">Send Invitations</h4>
                    <p className="text-[11px] text-[#5E5E5E]">Download and share our template.</p>
                  </div>
                </div>

                {/* Checkbox 2 */}
                <div
                  onClick={() => toggleCheck('headcount')}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                      checklist.headcount
                        ? 'bg-brand-dark border-brand-dark text-white'
                        : 'border-[#8E8B7B] group-hover:border-brand-dark'
                    }`}
                  >
                    {checklist.headcount && (
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-dark">Confirm Headcount</h4>
                    <p className="text-[11px] text-[#5E5E5E]">Final numbers needed 3 days prior.</p>
                  </div>
                </div>

                {/* Checkbox 3 */}
                <div
                  onClick={() => toggleCheck('waivers')}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                      checklist.waivers
                        ? 'bg-brand-dark border-brand-dark text-white'
                        : 'border-[#8E8B7B] group-hover:border-brand-dark'
                    }`}
                  >
                    {checklist.waivers && (
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-dark">Sign Waivers</h4>
                    <p className="text-[11px] text-[#5E5E5E]">Parents can sign online beforehand.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleDownloadInvite}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-olive text-white text-sm font-extrabold px-8 py-3.5 rounded-full hover:bg-black active:scale-95 transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download Invite Template
          </button>

          <Link
            href="/saved"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-[#EBE5D3] text-brand-dark text-sm font-extrabold px-8 py-3.5 rounded-full hover:bg-[#F9F5E8] active:scale-95 transition-all shadow-sm"
          >
            View My Bookings
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
