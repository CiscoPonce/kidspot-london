'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  MousePointer2, 
  Eye, 
  ArrowUpRight, 
  Settings, 
  LogOut,
  LayoutDashboard,
  Building2,
  ChevronRight,
  TrendingUp,
  Mail,
  Phone,
  Globe
} from 'lucide-react';

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDashboard = async () => {
      const token = localStorage.getItem('owner_token');
      const storedVenues = JSON.parse(localStorage.getItem('owner_venues') || '[]');

      if (!token || storedVenues.length === 0) {
        router.push('/owner/login');
        return;
      }

      setVenues(storedVenues);
      const initialVenue = storedVenues[0];
      setSelectedVenue(initialVenue);
      
      await fetchStats(initialVenue.id, token);
      setLoading(false);
    };

    initDashboard();
  }, [router]);

  const fetchStats = async (venueId: number, token: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/owner/venues/${venueId}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('owner_token');
    localStorage.removeItem('owner_venues');
    router.push('/owner/login');
  };

  if (loading) return <div className="p-12 text-center font-bold">Loading your dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="font-display text-xl font-black tracking-tighter text-on-surface">
            KIDSPOT<span className="text-primary">.</span>OWNER
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/owner/dashboard" className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-2xl font-bold">
            <LayoutDashboard size={20} />
            Overview
          </Link>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-2xl font-medium transition-colors">
            <Building2 size={20} />
            My Listing
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-2xl font-medium transition-colors">
            <Settings size={20} />
            Settings
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-2xl font-bold transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
              {selectedVenue?.name.charAt(0)}
            </div>
            <h2 className="font-display text-lg font-bold">{selectedVenue?.name}</h2>
          </div>
          
          <Link 
            href={`/venue/${selectedVenue?.slug}`}
            target="_blank"
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-primary transition-colors"
          >
            View Live Page
            <ArrowUpRight size={14} />
          </Link>
        </header>

        <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10">
          {/* Welcome section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">Performance Dashboard</p>
              <h1 className="font-display text-3xl font-bold text-on-surface">Good Morning!</h1>
            </div>
            
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400">Status:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                selectedVenue?.sponsor_tier ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {selectedVenue?.sponsor_tier || 'Free Listing'}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Total Impressions" 
              value={stats?.totalViews || 0} 
              icon={Eye} 
              color="text-blue-600" 
              bgColor="bg-blue-50" 
            />
            <StatCard 
              title="Outbound Clicks" 
              value={stats?.totalClicks || 0} 
              icon={MousePointer2} 
              color="text-green-600" 
              bgColor="bg-green-50" 
            />
            <StatCard 
              title="Conversion Rate" 
              value={`${((stats?.totalClicks / (stats?.totalViews || 1)) * 100).toFixed(1)}%`} 
              icon={TrendingUp} 
              color="text-purple-600" 
              bgColor="bg-purple-50" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Area (Simplified) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Traffic Trend</h2>
                <span className="text-xs font-bold text-slate-400">Last 30 Days</span>
              </div>
              
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-64 flex items-end gap-1">
                {stats?.trend.slice(-30).map((d: any, i: number) => {
                  const max = Math.max(...stats.trend.map((t: any) => t.views)) || 1;
                  const height = (d.views / max) * 100;
                  return (
                    <div 
                      key={i} 
                      className="flex-1 bg-primary/20 rounded-t-sm hover:bg-primary transition-colors group relative"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {d.views} views
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Click Breakdown */}
            <div className="space-y-6">
              <h2 className="font-display text-xl font-bold">Click Sources</h2>
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                {stats?.clicksByType.map((c: any) => (
                  <div key={c.click_type} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      {c.click_type === 'website' && <Globe size={18} className="text-slate-400" />}
                      {c.click_type === 'phone' && <Phone size={18} className="text-slate-400" />}
                      {c.click_type === 'booking' && <ChevronRight size={18} className="text-slate-400" />}
                      <span className="text-sm font-bold capitalize">{c.click_type}</span>
                    </div>
                    <span className="font-mono text-sm font-black">{c.count}</span>
                  </div>
                ))}
                {(!stats?.clicksByType || stats.clicksByType.length === 0) && (
                  <div className="py-8 text-center text-slate-400 italic text-sm">
                    No clicks recorded yet.
                  </div>
                )}
              </div>

              {!selectedVenue?.sponsor_tier && (
                <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100">
                  <h3 className="font-bold text-sm text-amber-900 mb-2">Boost your reach</h3>
                  <p className="text-xs text-amber-700 leading-relaxed mb-4">
                    Sponsored venues get up to 10x more traffic. Upgrade to Bronze or higher to appear at the top.
                  </p>
                  <Link 
                    href={`/venue/${selectedVenue?.slug}/pricing`}
                    className="block text-center py-3 bg-amber-200 text-amber-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-300 transition-colors"
                  >
                    View Tiers
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bgColor }: any) {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <div className={`w-12 h-12 rounded-2xl ${bgColor} ${color} flex items-center justify-center mb-6`}>
        <Icon size={24} />
      </div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
      <h3 className="text-3xl font-bold">{value}</h3>
    </div>
  );
}
