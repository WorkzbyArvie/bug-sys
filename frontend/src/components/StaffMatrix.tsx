import { useState, useEffect } from 'react';
import { Users, Shield, Clock, TrendingUp, Loader2, UserMinus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../App';

interface StaffMatrixProps {
  branchId: string | null;
  userRole?: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: string;
  performance: string;
  shift: string;
  clearance: string;
  email?: string;
}

export function StaffMatrix({ branchId, userRole: propUserRole }: StaffMatrixProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>(propUserRole || '');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF'
  });
  const [changePasswordData, setChangePasswordData] = useState<{ staffId: string; newPassword: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Get current user role
  useEffect(() => {
    if (propUserRole) {
      setUserRole(propUserRole.toUpperCase().replace(/_/g, ' '));
    } else {
      const session = supabase.auth.getSession();
      session.then(({ data }) => {
        const role = data?.session?.user?.user_metadata?.role || 'STAFF';
        setUserRole(role.toUpperCase().replace(/_/g, ' '));
      });
    }
  }, [propUserRole]);

  const canManageStaff = ['ADMIN', 'SUPER ADMIN', 'BRANCH ADMIN'].includes(userRole);
  const isSuperAdmin = userRole === 'SUPER ADMIN';

  const fetchStaffData = async () => {
    setIsLoading(true);
    try {
      // Fetch from Supabase profiles (where platform control creates accounts)
      let query = supabase
        .from('profiles')
        .select('*');

      if (branchId) {
        query = query.eq('pawnshop_id', branchId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedStaff: StaffMember[] = (data || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || u.email?.split('@')[0] || "Unknown User",
        email: u.email,
        role: u.role || "Staff",
        status: u.is_online ? "Active" : "Offline",
        performance: u.performance_score ? `${u.performance_score}%` : "N/A",
        shift: u.shift_hours || "Not Assigned",
        clearance: u.role === 'SUPER_ADMIN' ? "Lvl 4 Clear" : "Lvl 2 Clear"
      }));

      setStaff(formattedStaff);
    } catch (err: any) {
      console.error("Staff Matrix Sync Error:", err);
      showToast("Unable to sync personnel database", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newStaffData.name || !newStaffData.email || !newStaffData.password) {
      showToast("Please fill all required fields", "error");
      return;
    }

    try {
      const activeBranchId = branchId || null;
      // Call backend API to create staff
      const response = await fetch('http://localhost:3000/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newStaffData.name,
          email: newStaffData.email,
          password: newStaffData.password,
          role: newStaffData.role,
          branchId: activeBranchId
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', response.status, errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      console.log('Staff created:', result);
      // If backend returned the new user id, ensure a profiles row exists/updated
      try {
        if (result?.id) {
          await supabase.from('profiles').upsert([{
            id: result.id,
            full_name: newStaffData.name,
            role: newStaffData.role,
            pawnshop_id: activeBranchId || null
          }]);
        }
      } catch (upsertErr) {
        console.warn('profiles upsert warning', upsertErr);
      }

      showToast(`Staff account "${newStaffData.name}" created and verified successfully`, "success");
      setNewStaffData({ name: '', email: '', password: '', role: 'STAFF' });
      setShowAddStaffModal(false);
      fetchStaffData();
    } catch (err: any) {
      console.error("Error creating staff:", err);
      showToast(`Failed to create staff account: ${err.message}`, "error");
    }
  };

  const handleChangePassword = async (staffId: string, newPassword: string) => {
    if (!newPassword) {
      showToast("Please enter a new password", "error");
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/staff/${staffId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });

      if (!response.ok) throw new Error('Failed to change password');

      showToast("Password changed successfully", "success");
      setChangePasswordData(null);
    } catch (err: any) {
      console.error("Error changing password:", err);
      showToast("Failed to change password", "error");
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/staff/${staffId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete staff');

      showToast("Staff account deleted successfully", "success");
      setDeleteConfirmId(null);
      fetchStaffData();
    } catch (err: any) {
      console.error("Error deleting staff:", err);
      showToast("Failed to delete staff account", "error");
    }
  };

  const canManageStaffMember = (staffRole: string) => {
    const normalizedStaffRole = staffRole.toUpperCase().replace(/_/g, ' ');
    
    if (isSuperAdmin) return true;
    if (['ADMIN', 'BRANCH ADMIN'].includes(userRole) && normalizedStaffRole === 'STAFF') return true;
    return false;
  };

  useEffect(() => {
    fetchStaffData();
  }, [branchId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Add Staff Button removed from here */}

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
            Staff <span className="text-blue-600">Matrix</span>
          </h2>
          <p className="text-slate-500 font-medium uppercase text-[10px] tracking-widest">
            Human Capital & Access Management
          </p>
        </div>
        <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Personnel</p>
            <p className="text-2xl font-black text-slate-900">{staff.length}</p>
        </div>
      </div>

      {/* Hidden Add Staff Button - Only visible to ADMIN and SUPER_ADMIN via click handler */}
      {canManageStaff && (
        <button 
          onClick={() => setShowAddStaffModal(!showAddStaffModal)}
          style={{ display: 'none' }}
          id="add-staff-btn"
        />
      )}
      {showAddStaffModal && canManageStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddStaffModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-900 mb-4">Add Staff Account</h3>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <input 
                type="text" 
                placeholder="Full Name"
                value={newStaffData.name}
                onChange={(e) => setNewStaffData({...newStaffData, name: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <input 
                type="email" 
                placeholder="Email"
                value={newStaffData.email}
                onChange={(e) => setNewStaffData({...newStaffData, email: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <input 
                type="password" 
                placeholder="Password"
                value={newStaffData.password}
                onChange={(e) => setNewStaffData({...newStaffData, password: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <select 
                value={newStaffData.role}
                onChange={(e) => setNewStaffData({...newStaffData, role: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="STAFF">Staff</option>
                {isSuperAdmin && <option value="ADMIN">Admin</option>}
              </select>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
                >
                  Create Account
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="flex-1 bg-slate-200 text-slate-900 py-2 rounded-lg font-bold text-sm hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden Password Change Modal */}
      {changePasswordData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setChangePasswordData(null)}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 mb-4">Change Password</h3>
            <input 
              type="password" 
              placeholder="New Password"
              id="new-password-input"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4"
            />
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const newPassword = (document.getElementById('new-password-input') as HTMLInputElement)?.value;
                  handleChangePassword(changePasswordData.staffId, newPassword);
                }}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
              >
                Update
              </button>
              <button 
                onClick={() => setChangePasswordData(null)}
                className="flex-1 bg-slate-200 text-slate-900 py-2 rounded-lg font-bold text-sm hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 mb-4">Confirm Delete</h3>
            <p className="text-slate-600 text-sm mb-4">Are you sure you want to delete this staff account?</p>
            <div className="flex gap-2">
              <button 
                onClick={() => handleDeleteStaff(deleteConfirmId)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-red-700"
              >
                Delete
              </button>
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-slate-200 text-slate-900 py-2 rounded-lg font-bold text-sm hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Employee Records...</p>
        </div>
      ) : staff.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map(person => (
            <div key={person.id} className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 hover:border-blue-500 transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                    person.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {person.status}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Shield className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase">{person.clearance}</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                <h3 className="text-xl font-black text-slate-900">{person.name}</h3>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-tighter mb-4">{person.role}</p>
                
                <div className="flex items-center gap-2 mb-6 bg-slate-50 p-2 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[11px] font-bold text-slate-600">{person.shift}</span>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-bold">{person.performance}</span>
                  </div>
                  <button 
                    onClick={() => showToast(`Opening Permissions for ${person.name}`, "success")}
                    className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                  >
                    Manage Access
                  </button>
                </div>
              </div>

              {/* Hidden management buttons - accessible via data attributes */}
              {canManageStaffMember(person.role) && (
                <>
                  <button 
                    onClick={() => setChangePasswordData({ staffId: person.id, newPassword: '' })}
                    style={{ display: 'none' }}
                    id={`change-password-${person.id}`}
                  />
                  <button 
                    onClick={() => setDeleteConfirmId(person.id)}
                    style={{ display: 'none' }}
                    id={`delete-staff-${person.id}`}
                  />
                </>
              )}

              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                 <Users className="w-32 h-32" />
              </div>
            </div>
          ))}
          </div>
          {canManageStaff && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddStaffModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors uppercase tracking-tight shadow-lg"
              >
                + Add Staff
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <UserMinus className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No personnel assigned to this branch.</p>
        </div>
      )}
    </div>
  );
}