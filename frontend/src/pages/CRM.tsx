import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Phone, Mail, Shield } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// 1. ADD THIS INTERFACE
interface CrmTableProps {
  branchId: string | null;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_type: string;
  id_number: string;
  created_at: string;
}

// 2. UPDATE THE FUNCTION SIGNATURE TO ACCEPT branchId
export function CrmTable({ branchId }: CrmTableProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        // 3. FILTER BY BRANCH
        if (branchId) {
          query = query.eq('pawnshop_id', branchId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setCustomers(data || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [branchId]); // RE-RUN when branch changes

  const filteredCustomers = customers.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="p-20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Querying Client Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search by name or phone..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all">
          <Filter className="w-4 h-4" /> Filter Result
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Identity</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Info</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                      {customer.first_name[0]}{customer.last_name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{customer.first_name} {customer.last_name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">UID: {customer.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone className="w-3 h-3 text-slate-400" /> {customer.phone}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Mail className="w-3 h-3 text-slate-400" /> {customer.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-700">{customer.id_type}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{customer.id_number}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}