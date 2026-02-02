import { useState, useEffect } from 'react';
import { 
  Plus, Building2, Globe, Ban, CheckCircle2, LayoutDashboard, 
  Loader2, ArrowLeft, X, Trash2, AlertTriangle, Search,
  TrendingUp, Wallet, Users
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface PlatformControlProps {
  setActiveTab: (tab: string) => void;
  userRole: string;
}

export function PlatformControl({ setActiveTab, userRole }: PlatformControlProps) {
  const [pawnshops, setPawnshops] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // MODAL STATES
  const [shopToDelete, setShopToDelete] = useState<any>(null);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false, message: '', type: 'success'
  });

  const isSuperAdmin = userRole === 'SUPER' || userRole === 'SUPER_ADMIN' || userRole === 'Super Admin';
  console.log('User Role:', userRole, 'Is Super Admin:', isSuperAdmin);

  useEffect(() => {
    if (isSuperAdmin) fetchPawnshops();
  }, [isSuperAdmin]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const fetchPawnshops = async () => {
    const { data, error } = await supabase
      .from('pawnshops')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setPawnshops(data);
  };

  const handleRegisterShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !newShopName || !ownerEmail) return;
    setIsSubmitting(true);
    
    try {
      const payload = { 
        name: newShopName, 
        owner_email: ownerEmail,
        settings: { 
          max_interest: 4.0, 
          currency: 'PHP',
          total_loans: 0,
          active_customers: 0 
        },
        is_active: true
      };

      const { error } = await supabase.from('pawnshops').insert([payload]);
      if (error) throw error;

      setNewShopName('');
      setOwnerEmail('');
      await fetchPawnshops(); 
      showNotification(`${newShopName} initialized successfully!`);
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * FIXED DELETE LOGIC
   * Handles Foreign Key constraints by ensuring child records are 
   * addressed before removing the branch.
   */
  const handleDeleteConfirm = async () => {
    if (!shopToDelete) return;
    setIsDeleting(true);
    try {
      // 1. Remove admin invites and profiles referencing this pawnshop
      await supabase.from('admin_invites').delete().eq('pawnshop_id', shopToDelete.id);
      await supabase.from('profiles').delete().eq('pawnshop_id', shopToDelete.id);

      // 2. Find tickets for this pawnshop and remove dependent rows
      const { data: ticketRows, error: ticketErr } = await supabase
        .from('ticket')
        .select('id')
        .eq('pawnshop_id', shopToDelete.id);

      if (ticketErr) throw ticketErr;

      const ticketIds = (ticketRows || []).map((t: any) => t.id).filter(Boolean);

      if (ticketIds.length > 0) {
        // Delete Loans tied to tickets
        await supabase.from('loan').delete().in('ticketid', ticketIds as any[]);
        // Delete Inventory tied to tickets
        await supabase.from('inventory').delete().in('ticketid', ticketIds as any[]);
        // Delete Transactions tied to tickets
        await supabase.from('transaction').delete().in('ticketid', ticketIds as any[]);
        // Delete Tickets
        await supabase.from('ticket').delete().in('id', ticketIds as any[]);
      }

      // 3. Delete customers linked to pawnshop
      await supabase.from('customer').delete().eq('pawnshop_id', shopToDelete.id);

      // 4. Finally delete the pawnshop
      const { error } = await supabase.from('pawnshops').delete().eq('id', shopToDelete.id);
      if (error) throw error;

      showNotification(`${shopToDelete.name} has been removed.`);
      await fetchPawnshops();
      setShopToDelete(null);
    } catch (err: any) {
      // If a foreign key constraint blocks this, the error message will now appear
      console.error('delete pawnshop error', err);
      showNotification(err.message || "Constraint Error: Delete related records first.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleShopStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('pawnshops').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) {
      fetchPawnshops();
      showNotification(`Status updated to ${!currentStatus ? 'Active' : 'Suspended'}`);
    }
  };

  /**
   * FIXED ENTER DASHBOARD LOGIC
   * Switches context to a specific branch so that Dashboard, Customers,
   * and Inventory panels load relevant data [cite: 2026-01-22].
   */
  const enterBranchDashboard = (shop: any) => {
    // 1. Set 'BRANCH ADMIN' role perspective to reveal the Dashboard,
    // Loan Management, and Inventory/Vault panels. We avoid persisting
    // active pawnshop id to localStorage; app will use authenticated
    // profile.pawnshop_id when available.
    localStorage.setItem('app_perspective', 'SHOP');
    localStorage.setItem('user_role', 'BRANCH ADMIN'); 
    
    showNotification(`Synchronizing ${shop.name} live environment...`, 'success');
    
    // 3. Force a hard refresh to re-initialize app state
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 800);
  };

  const filteredShops = pawnshops.filter(shop => 
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.owner_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isSuperAdmin) return <div className="p-20 text-center font-black uppercase italic">Access Denied</div>;

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-500 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-4xl font-light text-slate-900 tracking-tight">
            Platform <span className="font-bold text-indigo-600 italic">Control</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium italic">Manage branch isolation and real-time performance.</p>
        </div>
        <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
          <ArrowLeft size={16} /> Exit Admin
        </button>
      </div>

      {/* SEARCH & ADD FORM */}
      <div className="space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Search branches..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-100 bg-white shadow-sm outline-none font-medium text-slate-900"
          />
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 text-left">
          <h2 className="text-xl font-bold text-slate-800 italic uppercase mb-6 flex items-center gap-2">
            <Plus size={20} className="text-indigo-600"/> Onboard New Pawnshop
          </h2>
          <form onSubmit={handleRegisterShop} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <input type="text" placeholder="Branch Name" value={newShopName} onChange={(e) => setNewShopName(e.target.value)} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none font-medium text-slate-900" required />
            <input type="email" placeholder="Owner Email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none font-medium text-slate-900" required />
            <button type="submit" disabled={isSubmitting} className="bg-[#030213] text-white font-black uppercase tracking-widest text-xs py-5 rounded-2xl hover:bg-indigo-600 transition-all disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Initialize Tenant'}
            </button>
          </form>
        </div>
      </div>

      {/* BRANCH GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
        {filteredShops.map((shop) => (
          <div key={shop.id} className="group bg-white p-8 rounded-[32px] border border-slate-100 hover:border-indigo-200 transition-all duration-300 shadow-sm hover:shadow-2xl relative">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Building2 size={24} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShopToDelete(shop)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                <button onClick={() => toggleShopStatus(shop.id, shop.is_active)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all ${shop.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                  {shop.is_active ? 'Active' : 'Suspended'}
                </button>
              </div>
            </div>

            <h3 className="font-bold text-2xl text-slate-900 mb-1 tracking-tight">{shop.name}</h3>
            <p className="text-sm text-slate-400 font-medium mb-6 italic">{shop.owner_email}</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Loans</p>
                <p className="font-bold text-slate-900 text-xs">₱{(shop.settings?.total_loans || 0).toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Users</p>
                <p className="font-bold text-slate-900 text-xs">{shop.settings?.active_customers || 0}</p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">
                <Globe size={12} /> ID: {shop.id?.toString().slice(0, 8)}
              </span>
              <button 
                onClick={() => setSelectedShop(shop)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
              >
                <TrendingUp size={14} /> Open Analytics
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ANALYTICS MODAL */}
      {selectedShop && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#030213]/80 backdrop-blur-md animate-in fade-in" onClick={() => setSelectedShop(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[48px] p-12 shadow-2xl animate-in slide-in-from-bottom-10 text-left">
            <div className="flex justify-between items-start mb-10">
              <div>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">Branch Performance</p>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{selectedShop.name}</h2>
              </div>
              <button onClick={() => setSelectedShop(null)} className="p-4 bg-slate-50 rounded-2xl hover:text-rose-500 transition-all"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center gap-6">
                <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center text-indigo-600 shadow-sm">
                  <Wallet size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loan Portfolio</p>
                  <p className="text-3xl font-black text-slate-900">₱{(selectedShop.settings?.total_loans || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center gap-6">
                <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center text-emerald-500 shadow-sm">
                  <Users size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Client Count</p>
                  <p className="text-3xl font-black text-slate-900">{selectedShop.settings?.active_customers || 0}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => enterBranchDashboard(selectedShop)} 
              className="w-full py-6 bg-[#030213] text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform"
            >
              <LayoutDashboard size={18} /> Enter Live Dashboard
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {shopToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#030213]/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShopToDelete(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl border border-slate-100 text-left">
            <AlertTriangle className="text-rose-500 mb-6" size={32} />
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-4 leading-none">Confirm Delete</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">Remove <span className="text-slate-900 font-bold underline">"{shopToDelete.name}"</span>? This will break all isolated branch references.</p>
            <div className="flex gap-4">
              <button onClick={() => setShopToDelete(null)} className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold text-xs uppercase">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={isDeleting} className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2">
                {isDeleting ? <Loader2 className="animate-spin" size={16} /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      {toast.show && (
        <div className="fixed bottom-10 right-10 flex items-center gap-4 bg-[#030213] text-white p-5 rounded-[24px] shadow-2xl z-50 text-left min-w-[320px] border border-white/10 animate-in slide-in-from-right-10">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <Ban size={20} />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">System Message</p>
            <p className="font-bold text-sm">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}