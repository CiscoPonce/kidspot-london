'use client';

import React, { useState, useEffect } from 'react';

interface ChecklistItem {
  id: string;
  label: string;
  tip: string;
}

const DEFAULT_ITEMS: ChecklistItem[] = [
  {
    id: 'venue_booked',
    label: 'Book venue & confirm time slot',
    tip: 'Confirm party start/end times and early access for setup.',
  },
  {
    id: 'cake_ordered',
    label: 'Order birthday cake & candles',
    tip: 'Venues do not supply the cake — remember candles, cake knife & napkins!',
  },
  {
    id: 'food_drinks',
    label: 'Plan party food & drinks',
    tip: 'Check venue BYO food rules or confirm dietary options for in-house packages.',
  },
  {
    id: 'decorations_bags',
    label: 'Party bags, invitations & decorations',
    tip: 'Send invites 3-4 weeks in advance and check venue balloon/confetti policy.',
  },
  {
    id: 'parent_tea',
    label: 'Parent hospitality supplies',
    tip: 'If hiring a hall, bring tea bags, instant coffee, milk and cups for attending adults.',
  },
];

const STORAGE_KEY = 'kidspot_party_checklist_state';

export function PartyChecklist() {
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCheckedIds(JSON.parse(saved));
      }
    } catch {
      /* ignore */
    }
    setIsLoaded(true);
  }, []);

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const progress = isLoaded ? Math.round((checkedIds.length / DEFAULT_ITEMS.length) * 100) : 0;

  return (
    <div className="rounded-3xl border border-[#EBE5D3] bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBE5D3] pb-5">
        <div>
          <h3 className="font-display text-xl sm:text-2xl font-extrabold text-brand-dark flex items-center gap-2">
            <span>🎉</span>
            <span>Parent Party Planning Checklist</span>
          </h3>
          <p className="text-xs sm:text-sm text-[#5E5E5E] mt-1">
            Essential reminders to keep your party planning smooth and stress-free.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 sm:w-32 bg-[#EBE5D3] rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-brand-dark h-full transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold text-brand-dark whitespace-nowrap">
            {checkedIds.length}/{DEFAULT_ITEMS.length} done
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {DEFAULT_ITEMS.map((item) => {
          const isDone = checkedIds.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`cursor-pointer rounded-2xl p-3.5 border transition-all flex items-start gap-3.5 ${
                isDone
                  ? 'bg-[#F9F8F3] border-[#EBE5D3] text-[#7B785F]'
                  : 'bg-white border-[#EBE5D3] hover:border-brand-dark/40 shadow-xs'
              }`}
            >
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => {}} // handled by parent onClick
                className="mt-1 h-4 w-4 rounded text-brand-dark focus:ring-brand-dark cursor-pointer"
              />
              <div className="flex-1">
                <div className={`text-sm font-bold ${isDone ? 'line-through text-[#7B785F]' : 'text-brand-dark'}`}>
                  {item.label}
                </div>
                <div className="text-[11px] text-[#7B785F] mt-0.5 leading-relaxed">
                  {item.tip}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
