import { useState, useEffect } from 'react';
import { GitBranch, Plus, MapPin, Building2, Users2, Shield, MoreVertical, Loader2 } from 'lucide-react';
import { useToast } from '../App';
import { supabase } from '../lib/supabaseClient';

interface Branch {
  id: string; // Changed to string for UUID compatibility
  name: string;
  location: string;
  manager: string;
  staffCount: number;
  status: string;
}

export function BranchManagement() {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      // Fetching all branches (Pawnshop records)
      // We also count profiles associated with each branch for the staffCount
      const { data, error } = await supabase
        .from('pawnshops')
        .select(`
          id,
          name,
          address,
          profiles ( id )
        `);

      if (error) throw error;

      const formattedBranches: Branch[] = (data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        location: b.address || 'Location Unset',
        manager: 'System Admin', // Fallback as manager isn't explicitly in the Pawnshop table
        staffCount: b.profiles?.length || 0,
        status: 'Active'
      }));

      setBranches(formattedBranches);
    } catch (err: any) {
      console.error("Branch Fetch Error:", err);
      showToast("Failed to sync branch network database", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleAddBranch = () => {
    showToast("Feature locked: System Admin must verify physical vault security before adding new branches.", "error");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
              <GitBranch className="w-8 h-8 text-white" />
            </div>
            Branch <span className="text-blue-600">Management</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">Global oversight of your pawnshop network assets.</p>
        </div>
        
        <button 
          onClick={handleAddBranch}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs transition-all shadow-lg active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Register New Branch
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Pinging Network Nodes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {branches.length > 0 ? (
            branches.map((branch) => (
              <div key={branch.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 hover:shadow-2xl hover:border-blue-500/30 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <Building2 className="w-7 h-7 text-slate-400 group-hover:text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      Live
                    </span>
                    <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <MoreVertical className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="relative z-10">
                  <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{branch.name}</h3>
                  <p className="text-slate-500 flex items-center gap-1.5 text-sm mb-8 font-bold">
                    <MapPin className="w-4 h-4 text-blue-500" /> {branch.location}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Auth Lead</p>
                        <p className="text-sm font-bold text-slate-700">{branch.manager}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Users2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Active Personnel</p>
                        <p className="text-sm font-bold text-slate-700">{branch.staffCount} Records</p>
                      </div>
                    </div>
                  </div>
                  
                  <button className="w-full mt-8 py-3 bg-slate-50 text-slate-400 text-[10px] font-black uppercase rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                    View Detailed Analytics
                  </button>
                </div>

                {/* Decorative node icon */}
                <GitBranch className="absolute -right-8 -bottom-8 w-48 h-48 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity" />
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">No branch entities registered in the system.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}