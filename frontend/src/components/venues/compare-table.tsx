'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import type { Venue } from '@/lib/api';
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
  { label: 'Max capacity', render: (v) => (v.party_max_capacity ? `${v.party_max_capacity}` : '—') },
  {
    label: 'Hosts parties',
    render: (v) => (v.party_capable === true ? 'Yes' : v.party_capable === false ? 'No' : '—'),
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
            <th className="w-28 sticky left-0 bg-background" />
            {venues.map((v) => (
              <th key={String(v.id)} className="p-2 align-top text-left">
                <div className="rounded-2xl bg-surface-container p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/venue/${v.slug}`}
                      className="font-display font-bold leading-tight text-on-background hover:underline line-clamp-2"
                    >
                      {v.name}
                    </Link>
                    {!readOnly && onRemove && (
                      <button
                        type="button"
                        onClick={() => onRemove(v.id)}
                        aria-label={`Remove ${v.name} from compare`}
                        className="shrink-0 rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high"
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
            <tr key={row.label} className="border-t border-outline-variant/50">
              <td className="sticky left-0 bg-background py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-outline">
                {row.label}
              </td>
              {venues.map((v) => (
                <td key={String(v.id)} className="py-3 px-2 align-top capitalize text-on-background">
                  {row.render(v)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-outline-variant/50">
            <td className="sticky left-0 bg-background py-3 pr-2" />
            {venues.map((v) => {
              const enquiry = v.party_enquiry_url || v.booking_url;
              return (
                <td key={String(v.id)} className="py-3 px-2 align-top">
                  {enquiry ? (
                    <a
                      href={enquiry}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full bg-primary text-on-primary px-4 py-2 text-xs font-bold"
                    >
                      Enquire
                    </a>
                  ) : v.phone ? (
                    <a
                      href={`tel:${v.phone}`}
                      className="inline-flex items-center justify-center rounded-full bg-primary text-on-primary px-4 py-2 text-xs font-bold"
                    >
                      Call
                    </a>
                  ) : (
                    <Link
                      href={`/venue/${v.slug}`}
                      className="inline-flex items-center justify-center rounded-full bg-primary-container text-on-primary-container px-4 py-2 text-xs font-bold"
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
