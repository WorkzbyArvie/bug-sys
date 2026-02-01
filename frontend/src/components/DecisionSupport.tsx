import { useState, useEffect, useMemo } from 'react';
import { 
  BrainCircuit,
  Activity,
  ShieldAlert,
  Zap,
  LineChart,
  SearchX,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  RefreshCcw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Cell,
  Tooltip
} from 'recharts';
import { supabase } from '../lib/supabaseClient';

interface DecisionSupportProps {
  branchId: string | null;
}

export function DecisionSupport({ branchId }: DecisionSupportProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [inventory, setInventory] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchLiveData = async () => {
    setIsLoading(true);

    try {
      let query = supabase
        .from('ticket')
        .select('*, customer(full_name)');

      if (branchId) {
        query = query.eq('pawnshop_id', branchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const normalized = data
          .filter(t => !t.status || t.status.toUpperCase() === 'ACTIVE')
          .map((t: any) => ({
            ...t,
            loan_amount: parseFloat(t.loan_amount || t.loanAmount || 0),
            category: t.category || 'General',
            isHighRisk: new Date(t.created_at) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          }));
        setInventory(normalized);
      }
    } catch (err) {
      console.error("Neural Engine Error:", err);
    } finally {
      setTimeout(() => setIsLoading(false), 800);
    }
  };

  useEffect(() => { fetchLiveData(); }, [branchId]);

  useEffect(() => {
    if (inventory.length > 0) {
      const groups = inventory.reduce((acc: any, item) => {
        const cat = item.category || 'Others';
        acc[cat] = (acc[cat] || 0) + item.loan_amount;
        return acc;
      }, {});

      setChartData(Object.keys(groups).map(key => ({
        name: key,
        estimatedValue: groups[key]
      })));
    } else {
      setChartData([]);
    }
  }, [inventory]);

  const metrics = useMemo(() => {
    const total = inventory.reduce((sum, item) => sum + item.loan_amount, 0);
    const highRiskCount = inventory.filter(i => i.isHighRisk).length;
    return {
      total,
      revenue: total * 0.035,
      count: inventory.length,
      riskLevel: highRiskCount > (inventory.length * 0.2) ? 'Moderate' : 'Optimal',
      highRiskCount
    };
  }, [inventory]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-[32px] border border-slate-100 shadow-sm">
        <BrainCircuit className="w-12 h-12 text-indigo-500 animate-pulse" />
        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Analyzing Branch Ecosystem...</p>
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-white rounded-[32px] border border-slate-100 text-center p-8">
        <SearchX className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-900">No Neural Data Found</h3>
        <p className="text-slate-400 text-sm mt-2">No active tickets detected for Branch: {branchId}</p>
        <button onClick={fetchLiveData} className="mt-6 flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">
           <RefreshCcw className="w-4 h-4" /> Retry Sync
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">Neural <span className="text-indigo-600">Engine</span></h2>
          <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Predictive Intelligence & Risk Mitigation</p>
        </div>
        <div className="flex gap-2">
           <button onClick={fetchLiveData} className="p-3 text-slate-400 hover:text-indigo-600 bg-white rounded-xl border border-slate-100 shadow-sm transition-all">
             <RefreshCcw className="w-5 h-5"/>
           </button>
           <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
             <Zap className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">Real-time Analysis</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#030213] rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden group">
          <TrendingUp className="absolute -right-2 -top-2 w-20 h-20 text-white/5 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Projected Interest</p>
          <p className="text-3xl font-black italic">₱{metrics.revenue.toLocaleString()}</p>
          <div className="mt-2 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> EST. 3.5% ROI
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Exposure</p>
          <p className="text-3xl font-black text-slate-900 italic">₱{metrics.total.toLocaleString()}</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4">
            <div className="bg-indigo-600 h-full rounded-full w-2/3"></div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Risk Status</p>
          <p className={`text-3xl font-black italic ${metrics.riskLevel === 'Optimal' ? 'text-emerald-500' : 'text-amber-500'}`}>
            {metrics.riskLevel}
          </p>
          <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase">{metrics.highRiskCount} Aging Assets</p>
        </div>

        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Activity</p>
          <Activity className="w-6 h-6 text-indigo-500 mb-1" />
          <p className="text-xl font-black text-indigo-600 italic">SECURE</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
              <LineChart className="text-indigo-600 w-5 h-5" /> Asset Concentration
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight="900" tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="900" tick={{fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="estimatedValue" radius={[12, 12, 12, 12]} barSize={50}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#4f46e5' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-indigo-600 rounded-[40px] p-8 text-white shadow-xl flex flex-col">
          <h3 className="font-black uppercase italic text-xl mb-6 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6" /> Recommendations
          </h3>
          <div className="space-y-4 flex-1">
             {metrics.highRiskCount > 0 ? (
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex gap-3">
                   <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
                   <div>
                      <p className="text-[10px] font-black uppercase text-indigo-200">Attention Required</p>
                      <p className="text-xs font-bold leading-tight">Liquidate {metrics.highRiskCount} aging assets to free up branch capital.</p>
                   </div>
                </div>
             ) : (
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex gap-3">
                   <CheckCircle className="w-5 h-5 text-emerald-300 shrink-0" />
                   <div>
                      <p className="text-[10px] font-black uppercase text-indigo-200">Status Nominal</p>
                      <p className="text-xs font-bold leading-tight">Portfolio is within healthy risk parameters.</p>
                   </div>
                </div>
             )}
          </div>
          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-300">Neural Link Stable</p>
          </div>
        </div>
      </div>
    </div>
  );
}