import { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Calendar, 
  Weight, 
  TrendingUp, 
  ChevronDown,
  Loader2,
  Lock
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface InventoryItem {
  id: string;
  ticketNumber: string;
  name: string; 
  category: string;
  weight: number;
  pawnDate: string;
  estimatedValue: number;
  status: string;
  customerName: string;
  location: string;
}

interface InventoryVaultProps {
  branchId: string | null;
}

export function InventoryVault({ branchId }: InventoryVaultProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Active branch context
  const activePawnshopId = branchId ?? null;

  useEffect(() => {
    fetchInventory();
  }, [activePawnshopId]);

  const fetchInventory = async () => {
    if (!activePawnshopId) return;
    setIsLoading(true);
    
    try {
      // Fetching from Ticket and joining with Customer & Inventory table
      let query = supabase
        .from('ticket')
        .select(`
          id,
          ticket_number,
          category,
          description,
          weight,
          loan_amount,
          status,
          created_at,
          pawnshop_id,
          customer (
            full_name
          ),
          inventory (
            storage_location,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (activePawnshopId) {
        query = query.eq('pawnshop_id', activePawnshopId as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      const transformedData: InventoryItem[] = (data || []).map((ticket: any) => ({
        id: ticket.id,
        ticketNumber: ticket.ticket_number || 'N/A',
        name: ticket.description || ticket.category || 'Asset',
        category: ticket.category || 'Uncategorized',
        weight: ticket.weight || 0,
        pawnDate: ticket.created_at,
        estimatedValue: ticket.loan_amount || 0,
        status: ticket.status?.toUpperCase() || 'ACTIVE',
        customerName: ticket.customer?.full_name || 'Walk-in Customer',
        location: ticket.inventory?.[0]?.storage_location || 'Main Vault'
      }));

      setItems(transformedData);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTotalValue = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase();
    const baseClass = "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border";
    
    switch(s) {
      case 'ACTIVE':
        return <span className={`${baseClass} bg-blue-50 text-blue-600 border-blue-100`}><Lock className="w-2 h-2 mr-1"/> In Vault</span>;
      case 'REDEEMED':
        return <span className={`${baseClass} bg-emerald-50 text-emerald-600 border-emerald-100`}>Released</span>;
      case 'AUCTION':
        return <span className={`${baseClass} bg-purple-50 text-purple-600 border-purple-100`}>For Auction</span>;
      default:
        return <span className={`${baseClass} bg-slate-50 text-slate-600 border-slate-100`}>{status}</span>;
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = 
        item.category?.toLowerCase().includes(searchStr) ||
        item.ticketNumber?.toLowerCase().includes(searchStr) ||
        item.customerName?.toLowerCase().includes(searchStr) ||
        item.name?.toLowerCase().includes(searchStr);
      
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, filterStatus]);

  const stats = useMemo(() => ({
    total: items.length,
    inVault: items.filter(i => i.status === 'ACTIVE').length,
    redeemed: items.filter(i => i.status === 'REDEEMED').length,
    forAuction: items.filter(i => i.status === 'AUCTION').length,
    vaultValue: items
      .filter(i => i.status === 'ACTIVE')
      .reduce((sum, i) => sum + (Number(i.estimatedValue) || 0), 0)
  }), [items]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-inter text-left">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-none">
            Vault <span className="text-blue-600">Inventory</span>
          </h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Branch Secured: {activePawnshopId ? activePawnshopId.slice(0, 8) : '--------'}
          </p>
        </div>
        <button 
          onClick={fetchInventory}
          className="flex items-center gap-2 bg-white text-slate-900 px-5 py-3 rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4 text-blue-600" />}
          <span className="text-[10px] font-black uppercase tracking-widest">Refresh Vault</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Items', val: stats.total, color: 'text-slate-600' },
          { label: 'In Vault', val: stats.inVault, color: 'text-blue-600' },
          { label: 'Redeemed', val: stats.redeemed, color: 'text-emerald-600' },
          { label: 'In Auction', val: stats.forAuction, color: 'text-purple-600' },
          { label: 'Vault Value', val: formatTotalValue(stats.vaultValue), color: 'text-slate-900' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-slate-400">{s.label}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-slate-300 absolute left-6 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assets, customers, or ticket IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 rounded-2xl border-none bg-slate-50 text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        
        <div className="relative group">
          <Filter className="w-4 h-4 text-blue-500 absolute left-5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none pl-12 pr-12 py-4 rounded-2xl bg-slate-50 border-none text-[11px] font-black uppercase tracking-[0.15em] text-slate-700 cursor-pointer focus:ring-2 focus:ring-blue-500/20 transition-all w-full md:w-56"
          >
            <option value="all">Status: All Assets</option>
            <option value="ACTIVE">Status: In Vault</option>
            <option value="REDEEMED">Status: Redeemed</option>
            <option value="AUCTION">Status: Auction</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Accessing Vault Records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className={`group bg-white rounded-[2.8rem] border border-slate-100 p-3 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 ${item.status === 'REDEEMED' ? 'opacity-75' : ''}`}
            >
              <div className="h-44 rounded-[2.2rem] bg-slate-50 flex items-center justify-center relative overflow-hidden">
                <Package className={`w-16 h-16 transition-transform duration-700 ${item.status === 'REDEEMED' ? 'text-emerald-100' : 'text-slate-200 group-hover:scale-110'}`} />
                <div className="absolute top-5 left-5">
                  {getStatusBadge(item.status)}
                </div>
                <div className="absolute bottom-5 right-5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white shadow-sm">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{item.category}</p>
                </div>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-slate-900 text-lg leading-tight mb-1 truncate max-w-[180px]">{item.name}</h4>
                    <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter">REF: {item.ticketNumber}</span>
                  </div>
                  <div className="flex flex-col items-end">
                     <p className="text-[8px] font-black text-slate-300 uppercase">Location</p>
                     <p className="text-[10px] font-bold text-slate-500">{item.location}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Weight className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Weight</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{item.weight}g</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pawned</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{new Date(item.pawnDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Customer</span>
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[110px]">{item.customerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Principal</span>
                    <span className="text-lg font-black text-slate-900 leading-none">₱{Number(item.estimatedValue).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-32 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
            <Package className="w-8 h-8 text-slate-200" />
          </div>
          <h3 className="text-slate-900 font-black text-xl italic tracking-tight">No Assets Found</h3>
          <p className="text-slate-400 text-sm font-medium mt-1">Check your connection or adjust filters.</p>
        </div>
      )}
    </div>
  );
}