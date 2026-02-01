import { useState, useEffect } from 'react';
import { Wallet, Landmark, ArrowUpRight, ArrowDownRight, History } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../App';

interface FinanceTreasuryProps {
  branchId: string | null;
}

interface LedgerMovement {
  id: string;
  type: string;
  amount: number;
  source: string;
  timestamp: string;
}

export function FinanceTreasury({ branchId }: FinanceTreasuryProps) {
  const [liquidity, setLiquidity] = useState<number>(0);
  const [movements, setMovements] = useState<LedgerMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const fetchFinancialData = async () => {
    setIsLoading(true);

    try {
      // 1. Fetch Liquidity from Loan amounts
      let liquidityQuery = supabase
        .from('loan')
        .select('principalamount');
      
      if (branchId) {
        liquidityQuery = liquidityQuery.eq('pawnshop_id', branchId);
      }

      const { data: loanData, error: loanError } = await liquidityQuery;
      if (loanError) throw loanError;
      
      const total = (loanData || []).reduce((acc, curr) => acc + (curr.principalamount || 0), 0);
      setLiquidity(total);

      // 2. Fetch Recent Transactions from Loan table
      let ledgerQuery = supabase
        .from('loan')
        .select('id, principalamount, createdat, ticketid, status')
        .order('createdat', { ascending: false })
        .limit(4);

      if (branchId) {
        ledgerQuery = ledgerQuery.eq('pawnshop_id', branchId);
      }

      const { data: ledgerData, error: ledgerError } = await ledgerQuery;
      if (ledgerError) throw ledgerError;

      const formattedMovements: LedgerMovement[] = (ledgerData || []).map((item: any) => ({
        id: item.id,
        type: item.status === 'redeemed' ? 'Cash In (Redemption)' : 'Cash Out (Loan)',
        amount: item.principalamount || 0,
        source: `Ticket #${item.ticketid}`,
        timestamp: item.createdat ? new Date(item.createdat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'
      }));

      setMovements(formattedMovements);
    } catch (err: any) {
      console.error("Treasury Sync Error:", err);
      showToast("Financial data sync failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [branchId]);

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
            Finance <span className="text-blue-600">&</span> Treasury
          </h2>
          <p className="text-slate-500 font-medium uppercase text-[10px] tracking-widest">
            Liquidity and Asset Valuation
          </p>
        </div>
        <button 
          onClick={fetchFinancialData}
          className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <History className={`w-5 h-5 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Treasury Card */}
        <div className="bg-[#030213] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
          <Landmark className="absolute right-[-20px] bottom-[-20px] w-64 h-64 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
          
          <div className="relative z-10">
            <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Total Network Liquidity</p>
            {isLoading ? (
              <div className="h-12 w-48 bg-white/10 animate-pulse rounded-lg my-4" />
            ) : (
              <h3 className="text-5xl font-black tracking-tighter mb-8 transition-all">
                ₱{liquidity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            )}
            
            <div className="flex flex-wrap gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                <ArrowUpRight className="text-emerald-400 w-4 h-4" />
                <span className="text-sm font-bold text-emerald-400">+12.5% Yield</span>
              </div>
              <div className="bg-white/5 px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10">
                <ArrowDownRight className="text-rose-400 w-4 h-4" />
                <span className="text-sm font-bold">Safe Reserve Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Summary */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col">
          <h4 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            Live Ledger Movements
          </h4>
          
          <div className="space-y-4 flex-1">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-2xl w-full" />
              ))
            ) : movements.length > 0 ? (
              movements.map((move) => (
                <div key={move.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-blue-600 transition-colors">
                      <Wallet className="w-5 h-5 text-blue-600 group-hover:text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{move.type}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                        Ref: {move.source} • {move.timestamp}
                      </p>
                    </div>
                  </div>
                  <span className={`font-black text-sm ${move.type.includes('In') ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {move.type.includes('In') ? '+' : '-'}₱{move.amount.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <History className="w-8 h-8 mb-2" />
                <p className="text-[10px] font-black uppercase">No Recent Activity</p>
              </div>
            )}
          </div>
          
          <button className="w-full mt-6 py-3 border border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition-all">
            Download Audit Logs
          </button>
        </div>
      </div>
    </div>
  );
}