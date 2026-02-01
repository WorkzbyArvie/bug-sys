import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  DollarSign, TrendingUp, Users, RotateCcw, Building2, AlertTriangle, 
  ChevronRight, Box, ShieldCheck, UserCog
} from "lucide-react";
import { supabase } from '../lib/supabaseClient';

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `₱${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `₱${(value / 1000).toFixed(1)}K`;
  return `₱${value.toLocaleString()}`;
};

interface DashboardProps {
  branchId: string | null; 
  setActiveTab: (tab: string) => void;
  userRole: string;
  isEnabled: (featureKey: string) => boolean; 
  setUserRole: (role: any) => void;         
}

export default function Dashboard({ 
  branchId, 
  setActiveTab, 
  userRole,
  isEnabled,
  setUserRole 
}: DashboardProps) {
  
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeBranchName, setActiveBranchName] = useState<string>("Loading...");
  const [loading, setLoading] = useState(true);
  // Use the `branchId` passed from App. If null, we won't query branch-scoped data.
  const targetUuid = branchId ?? null;
  const HQ_UUID = '00000000-0000-0000-0000-000000000000';

  useEffect(() => {
    // Only attempt to load when a branch is selected.
    loadDashboardData();
  }, [targetUuid]); // Only depend on targetUuid

  // Real-time sync: subscribe to Ticket changes and refresh dashboard
  useEffect(() => {
    if (!targetUuid) return; // nothing to subscribe to when no branch selected
    const channel = supabase
      .channel('dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket' }, (payload) => {
        console.debug('dashboard realtime event', payload);
        loadDashboardData();
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('Failed to remove dashboard realtime channel', e);
      }
    };
  }, [targetUuid]);

  const loadDashboardData = async () => {
    console.debug('loadDashboardData called with targetUuid:', targetUuid);
    setLoading(true);
    setError(null);
    try {
      console.debug('loadDashboardData start', { targetUuid });

      // If no branch is selected, we won't fetch branch-scoped dashboard data.
      if (!targetUuid) {
        setStats({
          totalLoans: 0,
          totalInterest: 0,
          portfolioGrowth: 0,
          activeTickets: 0,
          staffOnDuty: 0,
          efficiency: 0,
          clientCount: 0,
          inventorySummary: []
        });
        setLoading(false);
        return;
      }

      // 1. Fetch Branch Identity
      const { data: shopData, error: shopError } = await supabase
        .from('pawnshops')
        .select('name')
        .eq('id', targetUuid)
        .maybeSingle();

      console.debug('Pawnshop query result', { shopData, shopError });

      if (shopError) {
          if (shopError.code === '42501') throw new Error("Permission Denied: Pawnshop Access Restricted");
          throw shopError;
      }
      
      setActiveBranchName(shopData?.name || (targetUuid === HQ_UUID ? "PawnGold HQ" : "Branch Office"));

      // 2. Parallel Fetch: Tickets and Customer Count
      const [ticketsRes, customersRes] = await Promise.all([
        supabase.from('ticket').select('loan_amount, category, status').eq('pawnshop_id', targetUuid),
        supabase.from('customer').select('*', { count: 'exact', head: true }).eq('pawnshop_id', targetUuid)
      ]);

      console.debug('ticketsRes, customersRes', { ticketsRes, customersRes });

      if (ticketsRes.error) throw ticketsRes.error;
      if (customersRes.error) throw customersRes.error;

      const tickets = ticketsRes.data || [];
      
      // --- EMPTY STATE HANDLER ---
      // If no tickets are found, we set default stats and STOP loading to prevent the loop
      if (tickets.length === 0) {
        setStats({
          totalLoans: 0,
          totalInterest: 0,
          portfolioGrowth: 0,
          activeTickets: 0,
          staffOnDuty: 0,
          efficiency: 0,
          clientCount: customersRes.count || 0,
          inventorySummary: []
        });
        setLoading(false);
        console.debug('loadDashboardData: no tickets, returning early');
        return;
      }

      const activeTickets = tickets.filter(t => t.status?.toUpperCase() === 'ACTIVE');
      const totalPrincipal = activeTickets.reduce((sum, t) => sum + (Number(t.loan_amount) || 0), 0);
      
      const categoryMap = activeTickets.reduce((acc: any, t: any) => {
        const catName = t.category || 'Other';
        acc[catName] = (acc[catName] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalLoans: totalPrincipal,
        totalInterest: totalPrincipal * 0.035,
        portfolioGrowth: 12.5,
        activeTickets: activeTickets.length,
        staffOnDuty: 4,
        efficiency: totalPrincipal > 0 ? 98 : 0,
        clientCount: customersRes.count || 0,
        inventorySummary: Object.keys(categoryMap).map(name => ({
          name,
          count: categoryMap[name],
          color: name.toLowerCase().includes('gold') ? '#4F46E5' : '#10B981'
        })).sort((a, b) => b.count - a.count)
      });
      setLoading(false);
    } catch (err: any) {
      console.error("Dashboard Load Error:", err);
      setError(err.message.includes("permission denied") || err.code === '42501'
        ? "Access Denied: Please check database RLS policies." 
        : err.message || "Sync Error: Database schema mismatch.");
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 space-y-4">
      <RotateCcw className="animate-spin text-indigo-600" size={32} />
      <p className="animate-pulse uppercase tracking-widest text-[10px] font-black italic">Connecting to Branch Database...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-rose-500 space-y-6 text-center px-10">
      <div className="p-6 bg-rose-50 rounded-full">
        <AlertTriangle size={48} />
      </div>
      <div>
        <p className="font-black uppercase tracking-tighter text-xl">{error}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-xs mx-auto">
          Verify Row Level Security policies or contact Super Admin for access.
        </p>
      </div>
      <button 
        onClick={loadDashboardData} 
        className="px-8 py-3 bg-rose-50 text-rose-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
      >
        Retry Connection
      </button>
    </div>
  );

  return (
    <div className="p-0 space-y-8 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-[#030213] uppercase italic tracking-tighter leading-none">
            Operational <span className="text-indigo-600">Intelligence</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Building2 size={14} className="text-indigo-500" />
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              {activeBranchName} <span className="text-slate-300 ml-1 font-mono">[{targetUuid ? targetUuid.slice(0, 8) : '--------'}]</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2 items-center">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">System Live</span>
            </div>
            {userRole === 'Super Admin' && (
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <UserCog size={12} className="ml-1 text-slate-400" />
                    <select 
                        className="bg-transparent text-[9px] font-black uppercase tracking-tighter outline-none cursor-pointer"
                        value={userRole}
                        onChange={(e) => setUserRole(e.target.value)}
                    >
                        <option value="Super Admin">Super Admin View</option>
                        <option value="Branch Admin">Branch Admin View</option>
                        <option value="Staff">Staff View</option>
                    </select>
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Total Principal" 
          value={formatCurrency(stats?.totalLoans || 0)} 
          sub="Current Active Portfolio" 
          growth={stats?.portfolioGrowth || 0} 
          icon={<DollarSign className="text-blue-600" />} 
        />
        <MetricCard 
          title="Projected Interest" 
          value={formatCurrency(stats?.totalInterest || 0)} 
          sub="30-Day Accrual Estimate" 
          growth={8.3} 
          icon={<TrendingUp className="text-green-500" />} 
        />
        <MetricCard 
          title="Active Clients" 
          value={stats?.clientCount || 0} 
          sub="Unique Branch Members" 
          growth={1.2} 
          icon={<Users className="text-purple-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vault Composition</p>
                <h3 className="text-xl font-black text-slate-900 uppercase italic">Asset Distribution</h3>
              </div>
              <Box className="text-indigo-600" size={20} />
            </div>
            
            <div className="h-[250px] w-full flex flex-col md:flex-row items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.inventorySummary || []}
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {stats?.inventorySummary?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="w-full md:w-1/2 space-y-4 md:pl-8 mt-6 md:mt-0">
                {stats?.inventorySummary?.length > 0 ? (
                  stats.inventorySummary.map((item: any) => (
                    <div key={item.name} className="flex justify-between items-center group cursor-default">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{item.name}</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">{item.count} Units</span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-100 rounded-3xl p-6">
                    <p className="text-[10px] text-slate-400 uppercase font-black italic text-center">Vault Empty: No active tickets found</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-sm bg-indigo-600 text-white overflow-hidden">
          <CardContent className="p-8 space-y-8">
            <div className="flex justify-between items-start">
              <ShieldCheck size={32} />
              <div className="text-right">
                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Operational Score</p>
                <p className="text-4xl font-black italic">{stats?.efficiency || 0}%</p>
              </div>
            </div>

            <div className="space-y-6">
              <StatusRow label="Staff On Duty" value={stats?.staffOnDuty || 0} />
              <StatusRow label="Active Tickets" value={stats?.activeTickets || 0} />
              <StatusRow label="Vault Capacity" value={stats?.activeTickets > 0 ? "42%" : "0%"} />
            </div>

            {isEnabled('loan_management') ? (
                <button 
                  onClick={() => setActiveTab('Loan Management')}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl flex justify-between items-center px-6 transition-all group"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">New Transaction</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
            ) : (
                <div className="w-full py-4 bg-black/10 rounded-2xl flex justify-center items-center px-6 opacity-50 cursor-not-allowed">
                     <span className="text-[10px] font-black uppercase tracking-widest italic">Module Locked</span>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, sub, growth, icon }: any) {
  return (
    <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden text-left hover:shadow-md transition-all group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tighter group-hover:text-indigo-600 transition-colors">{value}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">{sub}</p>
            <div className="flex items-center gap-1 mt-3">
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+{growth}%</span>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-[1.5rem] text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, value }: { label: string, value: any }) {
  return (
    <div className="flex justify-between items-center border-b border-white/10 pb-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}