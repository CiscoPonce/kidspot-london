'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import type { Venue } from '@/lib/api';
import { displayPhone } from '@/lib/display-phone';
import { trustSignals } from '@/lib/trust';

interface CompareTableProps {
  venues: Venue[];
  onRemove?: (id: Venue['id']) => void;
  readOnly?: boolean;
}

function priceText(v: Venue): string {
  if (typeof v.party_price_from === 'number') {
    const amount = Number.isInteger(v.party_price_from) ? `£${v.party_price_from}` : `£${v.party_price_from.toFixed(2)}`;
    const unit = v.party_price_unit === 'per_hour' ? '/hr' : v.party_price_unit === 'flat' ? '' : '/child';
    return `from ${amount}${unit ? ` ${unit}` : ''}`;
  }
  if (v.type === 'park') return 'Free';
  return '—';
}

const ROWS: Array<{ label: string; render: (v: Venue) => React.ReactNode }> = [
  { label: 'Type', render: (v) => v.type.replace('_', ' ') },
  { label: 'Area', render: (v) => v.borough || '—' },
  { label: 'Price', render: (v) => priceText(v) },
  { label: 'Phone', render: (v) => displayPhone(v.phone) || '—' },
  { label: 'Max capacity', render: (v) => (v.party_max_capacity ? `${v.party_max_capacity}` : '—') },
  {
    label: 'Hosts parties',
    render: (v) => (v.party_capable === true ? 'Yes' : v.party_capable === false ? 'No' : '—'),
  },
  {
    label: 'Catering & Cake',
    render: (v) => {
      const parts: string[] = [];
      if (v.byo_food_allowed === true) parts.push('BYO food');
      if (v.food_provided === true) parts.push('Food included');
      return parts.length ? parts.join(' · ') : 'Ask the venue';
    },
  },
  { label: 'Rating', render: (v) => (v.rating ? Number(v.rating).toFixed(1) : '—') },
  {
    label: 'Trust',
    render: (v) => {
      const t = trustSignals(v);
      return t.length ? t.map((s) => s.label).join(', ') : '—';
    },
  },
];

export function CompareTable({ venues, onRemove, readOnly }: CompareTableProps) {
  if (venues.length === 0) return null;

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-28 sticky left-0 bg-brand-paper" />
            {venues.map((v) => (
              <th key={String(v.id)} className="p-2 align-top text-left">
                <div className="rounded-2xl bg-white border border-[#EBE5D3] p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/venue/${v.slug}`}
                      className="font-display font-bold leading-tight text-brand-dark hover:underline line-clamp-2"
                    >
                      {v.name}
                    </Link>
                    {!readOnly && onRemove && (
                      <button
                        type="button"
                        onClick={() => onRemove(v.id)}
                        aria-label={`Remove ${v.name} from compare`}
                        className="shrink-0 rounded-full p-1 text-[#5E5E5E] hover:bg-[#F3EEDA]"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-t border-brand-border">
              <td className="sticky left-0 bg-brand-paper py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                {row.label}
              </td>
              {venues.map((v) => (
                <td key={String(v.id)} className="py-3 px-2 align-top capitalize text-brand-dark font-medium">
                  {row.render(v)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-brand-border">
            <td className="sticky left-0 bg-brand-paper py-3 pr-2" />
            {venues.map((v) => {
              const enquiry = v.party_enquiry_url || v.booking_url;
              return (
                <td key={String(v.id)} className="py-3 px-2 align-top">
                  {enquiry ? (
                    <a
                      href={enquiry}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full bg-brand-yellow text-brand-dark px-4 py-2 text-xs font-bold hover:bg-brand-yellow-hover transition-colors shadow-sm"
                    >
                      Enquire
                    </a>
                  ) : v.phone ? (
                    <a
                      href={`tel:${v.phone}`}
                      className="inline-flex items-center justify-center rounded-full bg-brand-yellow text-brand-dark px-4 py-2 text-xs font-bold hover:bg-brand-yellow-hover transition-colors shadow-sm"
                    >
                      Call
                    </a>
                  ) : (
                    <Link
                      href={`/venue/${v.slug}`}
                      className="inline-flex items-center justify-center rounded-full bg-brand-dark text-white px-4 py-2 text-xs font-bold hover:bg-black transition-colors shadow-sm"
                    >
                      View
                    </Link>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
