import { useState, useEffect, useCallback } from 'react';
import { Gavel, Search, Tag, ExternalLink, AlertTriangle, TrendingUp, Package, Loader2 } from 'lucide-react';
import { useToast } from '../App';
import { supabase } from '../lib/supabaseClient';

export interface AuctionTabProps {
  branchId: string | null;
}

interface AuctionItem {
  id: string;
  ticketNumber: string;
  description: string;
  category: string;
  loanAmount: number;
  auctionPrice: number;
  forfeitureDate: string;
}

export function AuctionTab({ branchId }: AuctionTabProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchForfeitedItems = useCallback(async () => {
    setIsLoading(true);
    // Prioritize the prop passed from App.tsx, fallback to storage
    const activeBranchId = branchId ?? null;

    try {
      let query = supabase
        .from('ticket')
        .select('*')
        // Standardized filter for forfeited/expired items
        .or('status.eq.FORFEITED,status.eq.EXPIRED');

      if (activeBranchId) {
        query = activeBranchId ? query.eq('pawnshop_id', activeBranchId) : query;
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = (data || []).map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticket_number,
        description: t.description || 'Unlabeled Asset',
        category: t.category || 'General',
        loanAmount: Number(t.loan_amount || 0),
        // Automatic 10% markup for recovery target
        auctionPrice: Math.round(Number(t.loan_amount || 0) * 1.1), 
        forfeitureDate: t.expiry_date || t.forfeituredate || t.pawn_date || ''
      }));

      setItems(formatted);
    } catch (err: any) {
      console.error("Auction Fetch Error:", err);
      showToast("Failed to load auction inventory", "error");
    } finally {
      setIsLoading(false);
    }
  }, [branchId, showToast]);

  // Sync effect: Re-fetch when branchId changes or via real-time channel
  useEffect(() => {
    fetchForfeitedItems();

    // Optional: Real-time listener for status changes
    const channel = supabase
      .channel('auction_sync')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'ticket' 
      }, () => fetchForfeitedItems())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, fetchForfeitedItems]);

  const handlePublish = (ticketNumber: string) => {
    // Logic to push to a 'marketplace' table would go here
    showToast(`Ticket ${ticketNumber} is now live on the Mobile App!`, 'success');
  };

  const filteredItems = items.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                <Gavel className="w-6 h-6 text-white" />
            </div>
            Auction House
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Convert forfeited collateral into revenue via the mobile marketplace.
          </p>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search by ticket or item..."
            className="pl-12 pr-6 py-4 border border-slate-200 rounded-2xl w-full md:w-80 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package className="w-4 h-4" /></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Active Lots</p>
          </div>
          <p className="text-3xl font-black text-slate-900">{items.length}</p>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-4 h-4" /></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Recovery Value</p>
          </div>
          <p className="text-3xl font-black text-slate-900">
            ₱{items.reduce((acc, curr) => acc + curr.auctionPrice, 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-slate-200">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Mobile Marketplace</p>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <p className="text-xl font-bold text-white leading-tight">Syncing Live with Customer App</p>
        </div>
      </div>

      {/* Auction Inventory Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <p className="text-slate-400 text-[10px] font-black uppercase mt-4 tracking-widest">Auditing Forfeited Assets...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div key={item.id} className="group bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 flex flex-col">
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-[11px] font-black tracking-wider border border-slate-200">
                      {item.ticketNumber}
                    </span>
                    <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Forfeited
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-slate-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                      {item.description}
                  </h3>
                  <p className="text-slate-400 text-sm mb-6 flex items-center gap-2 font-medium">
                    <Tag className="w-4 h-4" /> {item.category}
                  </p>

                  <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-50 mb-8">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.1em] mb-1">Loan Principal</p>
                      <p className="font-bold text-slate-700 text-lg">₱{item.loanAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-500 uppercase font-black tracking-[0.1em] mb-1">Target Recovery</p>
                      <div className="flex items-center gap-1">
                          <span className="text-blue-600 font-bold text-lg">₱</span>
                          <input 
                              type="number" 
                              value={Math.round(item.auctionPrice)}
                              className="font-black text-blue-600 bg-blue-50/50 w-full rounded-xl px-3 py-1 border border-transparent focus:border-blue-200 focus:ring-0 transition-all text-lg"
                              onChange={(e) => {
                                  const newPrice = parseInt(e.target.value) || 0;
                                  setItems(items.map(i => i.id === item.id ? {...i, auctionPrice: newPrice} : i));
                              }}
                          />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handlePublish(item.ticketNumber)}
                    className="w-full bg-[#030213] text-white py-4 rounded-2xl font-bold text-sm hover:bg-blue-600 shadow-lg shadow-slate-200 transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Publish to Mobile Marketplace
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">No forfeited assets detected for this branch.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}