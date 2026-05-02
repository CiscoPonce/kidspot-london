'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  Users, 
  CreditCard, 
  History, 
  TrendingUp, 
  ShieldCheck, 
  ArrowLeft,
  Search
} from 'lucide-react';

export default function AdminRevenuePage() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/admin/revenue/stats`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/admin/audit-logs?limit=10`)
        ]);

        const statsData = await statsRes.json();
        const logsData = await logsRes.json();

        if (statsData.success) setStats(statsData.data);
        if (logsData.success) setLogs(logsData.data);
      } catch (err) {
        console.error('Failed to fetch admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) return <div className="p-12 text-center font-bold">Accessing Admin Panel...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-full hover:bg-slate-100 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-display text-xl font-black tracking-tighter">
              KIDSPOT<span className="text-primary">.</span>ADMIN
            </h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
            <ShieldCheck size={14} />
            Secure Session
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard 
            title="Estimated MRR" 
            value={`£${stats?.totalEstimatedMRR || 0}`} 
            icon={TrendingUp} 
            color="text-green-600" 
            bgColor="bg-green-50" 
          />
          <StatCard 
            title="Active Subscriptions" 
            value={stats?.totalActiveSubscriptions || 0} 
            icon={CreditCard} 
            color="text-blue-600" 
            bgColor="bg-blue-50" 
          />
          <StatCard 
            title="Claimed Venues" 
            value={stats?.totalClaimedVenues || 0} 
            icon={Users} 
            color="text-purple-600" 
            bgColor="bg-purple-50" 
          />
          <StatCard 
            title="Sponsor Conversions" 
            value={`${((stats?.totalActiveSubscriptions / (stats?.totalClaimedVenues || 1)) * 100).toFixed(1)}%`} 
            icon={BarChart3} 
            color="text-orange-600" 
            bgColor="bg-orange-50" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Audit Logs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                <History size={24} className="text-slate-400" />
                Administrative Audit Trail
              </h2>
              <button className="text-sm font-bold text-primary hover:underline">View All</button>
            </div>
            
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Target</th>
                      <th className="px-6 py-4">Details</th>
                      <th className="px-6 py-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold uppercase">
                            {log.action_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold">#{log.target_id}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-mono truncate max-w-[200px]">
                          {JSON.stringify(log.payload)}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                          No recent administrative actions recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tier Distribution */}
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold flex items-center gap-2">
              <BarChart3 size={24} className="text-slate-400" />
              Tier Split
            </h2>
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
              {stats?.tierDistribution.map((tier: any) => (
                <div key={tier.sponsor_tier} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold capitalize">{tier.sponsor_tier}</span>
                    <span className="text-xs font-medium text-slate-400">{tier.venue_count} venues</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        tier.sponsor_tier === 'gold' ? 'bg-amber-400' : 
                        tier.sponsor_tier === 'silver' ? 'bg-slate-400' : 'bg-orange-400'
                      }`}
                      style={{ width: `${(tier.venue_count / (stats.totalActiveSubscriptions || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!stats?.tierDistribution || stats.tierDistribution.length === 0) && (
                <div className="py-12 text-center text-slate-400 italic">
                  No active subscriptions yet.
                </div>
              )}
            </div>

            <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10">
              <h3 className="font-bold text-sm mb-2">Quick Search</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Venue ID or Email..." 
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bgColor }: any) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <div className={`w-12 h-12 rounded-2xl ${bgColor} ${color} flex items-center justify-center mb-4`}>
        <Icon size={24} />
      </div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
      <h3 className="text-3xl font-bold">{value}</h3>
    </div>
  );
}
