import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Phone, 
  Shield, 
  Edit2, 
  Trash2, 
  User, 
  MapPin, 
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../App';

interface CrmTableProps {
  branchId: string | null;
}

interface Customer {
  id: string;
  full_name: string;
  contact_number: string;
  address: string;
  pawnshop_id: string | null;
  created_at: string;
}

export function CrmTable({ branchId }: CrmTableProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editFormData, setEditFormData] = useState({ address: '', contactNumber: '' });
  
  const { showToast } = useToast();
  
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('customer')
        .select('*')
        .order('created_at', { ascending: false });

      if (branchId) {
        query = query.eq('pawnshop_id', branchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Fetch error:', error);
      showToast(error.message || 'Failed to sync with customer ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [branchId]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact_number?.includes(searchTerm) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditFormData({
      address: customer.address || '',
      contactNumber: customer.contact_number || '',
    });
    setOpenMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    setIsProcessing(true);
    
    try {
      const { error } = await supabase
        .from('customer')
        .update({
          address: editFormData.address,
          contact_number: editFormData.contactNumber,
        })
        .eq('id', editingCustomer.id);

      if (error) throw error;

      setCustomers(customers.map(c =>
        c.id === editingCustomer.id
          ? { ...c, address: editFormData.address, contact_number: editFormData.contactNumber }
          : c
      ));

      showToast('Client profile updated successfully', 'success');
      setEditingCustomer(null);
    } catch (error: any) {
      showToast(error.message || 'Update failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    setIsProcessing(true);
    try {
      // Step 1: Locate associated tickets
      const { data: tickets } = await supabase
        .from('ticket')
        .select('id')
        .eq('customer_id', customerId); 

      if (tickets && tickets.length > 0) {
        const ticketIds = tickets.map(t => t.id);

        // Step 2: Cascading delete of linked assets
        await supabase.from('loan').delete().in('ticketid', ticketIds);
        await supabase.from('inventory').delete().in('ticketid', ticketIds);
        await supabase.from('transaction').delete().in('ticketid', ticketIds);
        await supabase.from('ticket').delete().in('id', ticketIds);
      }

      // Step 3: Delete the Customer record
      const { error } = await supabase
        .from('customer')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      setCustomers(prev => prev.filter(c => c.id !== customerId));
      showToast('Client and associated history purged', 'success');
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('Purge error:', error);
      showToast('Security protocol: Deletion failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Syncing Client Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-[500px]">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search by name, phone, or UUID..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 shadow-sm rounded-2xl text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Total Records</p>
            <p className="text-sm font-black text-indigo-600">{customers.length}</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg">
            <Filter className="w-4 h-4 text-indigo-400" /> Filter
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Identity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="group hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-sm border border-indigo-100 group-hover:scale-105 transition-transform">
                        {customer.full_name ? customer.full_name.substring(0, 2).toUpperCase() : '??'}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-base leading-none mb-1">{customer.full_name}</p>
                        <span className="text-[9px] font-black text-white bg-indigo-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">Verified</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-indigo-400" /> {customer.contact_number || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-300" /> 
                        <span className="truncate max-w-[180px]">{customer.address || 'No address'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="text-[10px] font-black text-slate-900 uppercase">Active</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">ID: {customer.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="relative inline-block">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
                        className="p-2.5 hover:bg-slate-100 rounded-xl transition-all active:scale-90"
                      >
                        <MoreVertical className="w-5 h-5 text-slate-400" />
                      </button>
                      
                      {openMenuId === customer.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                          <button onClick={() => handleEdit(customer)} className="flex items-center gap-3 w-full px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                            <Edit2 className="w-4 h-4 text-indigo-500" /> Edit Record
                          </button>
                          <button onClick={() => { setDeleteConfirm(customer.id); setOpenMenuId(null); }} className="flex items-center gap-3 w-full px-5 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border-t border-slate-50">
                            <Trash2 className="w-4 h-4" /> Purge Client
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredCustomers.length === 0 && (
          <div className="py-20 text-center">
            <User className="w-12 h-12 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No Matching Clients Found</p>
          </div>
        )}
      </div>

      {/* Edit Overlay */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase italic">Edit <span className="text-indigo-600">Profile</span></h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 border-b border-slate-100 pb-4">Internal Record Update</p>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                <div className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-400 select-none cursor-not-allowed italic">{editingCustomer.full_name}</div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                <input
                  type="text"
                  value={editFormData.contactNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, contactNumber: e.target.value })}
                  className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-500/20 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registered Address</label>
                <textarea
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-500/20 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none h-28 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={() => setEditingCustomer(null)} className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Discard</button>
              <button disabled={isProcessing} onClick={handleSaveEdit} className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Commit Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Purge Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2 uppercase">Purge Record?</h2>
            <p className="text-xs font-bold text-slate-500 leading-relaxed mb-8">
              Deleting this client will permanently remove <span className="text-red-600 underline">all associated tickets and active loans</span> from the ledger.
            </p>
            <div className="flex flex-col gap-3">
              <button disabled={isProcessing} onClick={() => handleDeleteCustomer(deleteConfirm)} className="w-full px-6 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all">
                {isProcessing ? 'Processing Purge...' : 'Confirm Destruction'}
              </button>
              <button onClick={() => setDeleteConfirm(null)} className="w-full px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}