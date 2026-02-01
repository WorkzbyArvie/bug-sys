import { useState, useEffect, createContext, useContext } from 'react';
import { 
  X, 
  LayoutDashboard, 
  BadgePercent, 
  Undo2, 
  Users, 
  Warehouse, 
  BrainCircuit,
  Gavel, 
  ShieldCheck,
  ChevronRight,
  Globe,
  Settings2,
  Wallet,
  Users2,
  LogOut,
  ArrowLeftCircle,
  UserPlus,
  Loader2
} from 'lucide-react';

// Import Libs
import { supabase } from './lib/supabaseClient';

// --- AUTH IMPORT ---
import Login from './components/Auth/Login'; 

// Import Components & Pages
import Dashboard from './components/Dashboard';
import { SalesPos } from './components/SalesPos';
import { CrmTable } from './components/CrmTable';
import { InventoryVault } from './components/InventoryVault';
import { DecisionSupport } from './components/DecisionSupport';
import { Redemption } from './components/Redemption';
import { AuctionTab } from './components/AuctionTab';
import { BranchManagement } from './components/BranchManagement';
import { SuperAdminDashboard } from './pages/admin/SuperAdminDashboard';
import { StaffMatrix } from './components/StaffMatrix';
import { FinanceTreasury } from './components/FinanceTreasury';

// Standardized Roles [cite: 2026-01-22]
export type Role = 'Super Admin' | 'Branch Admin' | 'Manager' | 'Staff' | 'Shop Admin' | 'Owner';


interface ToastContextType {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

function App() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('Staff');
  
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
    return localStorage.getItem('app_perspective') === 'SHOP';
  });

  const branchName = currentBranchId ? `Branch: ${String(currentBranchId).slice(0, 8)}` : "Platform Overview";

  // Helper to normalize roles from DB to match our types
  const normalizeRole = (role: string | null): string => {
    if (!role) return 'Staff';
    const cleaned = role.toString().toUpperCase().replace(/[_\s]/g, '');
    switch (cleaned) {
      case 'SUPERADMIN':
      case 'SUPER':
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'BRANCHADMIN':
      case 'BRANCH_ADMIN':
      case 'ADMIN':
        return 'Branch Admin';
      case 'MANAGER':
        return 'Manager';
      case 'OWNER':
        return 'Owner';
      case 'STAFF':
      default:
        // Preserve human-friendly capitalization for unknown roles
        return role.split(/[_\s]+/).map((w: string) => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  };

  useEffect(() => {
    const fetchUserData = async (userId: string) => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, pawnshop_id')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('fetchUserData error', error);
          throw error;
        }
        return profile;
      } catch (err) {
        console.error('fetchUserData unexpected error', err);
        throw err;
      }
    };

    const initializeAuth = async () => {
      console.debug('initializeAuth: start');
      setLoading(true);

      // Try to get existing session from Supabase. If present, restore it immediately
      // so the UI treats the user as logged in while profile fetching runs in background.
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.debug('initializeAuth: got session', currentSession);

        if (currentSession) {
          // Immediately restore session so reloads don't force a re-login flow.
          setSession(currentSession);
          // Fire-and-forget profile fetch: populate role/branch when available,
          // but do NOT block or throw if profile is missing — keep user logged in.
          (async () => {
            try {
              const profile = await fetchUserData(currentSession.user.id);
              console.debug('initializeAuth (bg): profile', profile);
              if (profile) {
                const finalRole = normalizeRole(profile.role);
                let finalBranchId: string | null = finalRole === 'Super Admin' ? null : (profile.pawnshop_id || null);
                setUserRole(finalRole);
                setCurrentBranchId(finalBranchId);
                localStorage.setItem('user_role', finalRole);
                if (finalRole === 'Super Admin') setActiveTab('platform-control');
              } else {
                console.warn('initializeAuth (bg): profile not found — keeping session but using defaults');
              }
            } catch (bgErr) {
              console.error('initializeAuth (bg) profile fetch error:', bgErr);
            }
          })();

          // Done: we can stop showing the loading spinner now — session restored.
          setLoading(false);
          return;
        }

        console.debug('initializeAuth: no session found, showing Login');
      } catch (err: any) {
        console.error('initializeAuth error:', err, { stack: err?.stack });
        setToast({ msg: 'Session initialization error. See console.', type: 'error' });
      } finally {
        // Ensure loading is false if no session restored above
        setLoading(false);
        console.debug('initializeAuth: finished, loading set to false');
      }
    };

    // Global handlers to reveal otherwise-silent async errors
    const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
      console.error('UnhandledPromiseRejection:', ev.reason);
    };
    const onError = (event: ErrorEvent) => {
      console.error('Window error:', event.message, event.error || event);
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onError);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'app_perspective') {
        setIsImpersonating(e.newValue === 'SHOP');
      }
    };
    window.addEventListener('storage', onStorage);

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.debug('onAuthStateChange event, session:', newSession);
      setSession(newSession);
      // If a new session exists, fetch profile but do not force sign-out if profile fetch fails.
      if (newSession) {
        (async () => {
          try {
            const profile = await fetchUserData(newSession.user.id);
            console.debug('onAuthStateChange profile', profile);
            if (profile) {
              const role = normalizeRole(profile.role);
              setUserRole(role);
              if (role === 'Super Admin') setActiveTab('platform-control');
              const finalBranchId = role === 'Super Admin' ? null : (profile.pawnshop_id || null);
              setCurrentBranchId(finalBranchId);
            } else {
              console.warn('onAuthStateChange: profile missing — keeping defaults');
            }
          } catch (err) {
            console.error('onAuthStateChange profile fetch error:', err);
          }
        })();
      } else {
        // Clear client-side stored state when session ends
        localStorage.clear();
        setUserRole('Staff');
        setCurrentBranchId(null);
        setActiveTab('dashboard');
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onError);
      window.removeEventListener('storage', onStorage);
    };
  }, [isImpersonating]);

  const [systemConfig, setSystemConfig] = useState({ 
    crm_enabled: true, 
    vault_enabled: true, 
    finance_enabled: true, 
    hr_enabled: true, 
    auction_enabled: true, 
    decision_enabled: true 
  });

  const isEnabled = (featureKey: string) => {
    if (userRole === 'Super Admin' && !isImpersonating) return true;
    return (systemConfig as any)[featureKey];
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/";
  };

  const exitBranchView = () => {
    localStorage.removeItem('app_perspective');
    localStorage.removeItem('active_pawnshop_id');
    localStorage.removeItem('active_pawnshop_name');
    window.location.reload(); 
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- NAVIGATION CONFIG [cite: 2026-01-22] ---
  const allNavItems = [
    { id: 'platform-control', label: 'Platform Control', icon: Globe, roles: ['Super Admin'], type: 'PLATFORM' },
    { id: 'system-settings', label: 'System Control', icon: Settings2, roles: ['Super Admin'], type: 'PLATFORM' },
    { id: 'branches', label: 'Branch Management', icon: Warehouse, roles: ['Super Admin'], type: 'PLATFORM' },

    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Branch Admin', 'Staff', 'Manager'], type: 'OPERATIONAL' },
    { id: 'sales', label: 'Loan Management', icon: BadgePercent, roles: ['Branch Admin', 'Staff'], type: 'OPERATIONAL' },
    { id: 'crm', label: 'Customers', icon: Users2, roles: ['Branch Admin', 'Staff'], type: 'OPERATIONAL', feature: 'crm_enabled' },
    { id: 'inventory', label: 'Inventory & Vault', icon: Warehouse, roles: ['Branch Admin', 'Manager'], type: 'OPERATIONAL', feature: 'vault_enabled' },
    { id: 'redemption', label: 'Redemption', icon: Undo2, roles: ['Branch Admin', 'Staff', 'Manager'], type: 'OPERATIONAL' },
    { id: 'finance', label: 'Finance & Treasury', icon: Wallet, roles: ['Branch Admin', 'Owner'], type: 'OPERATIONAL', feature: 'finance_enabled' },
    { id: 'hr', label: 'Staff Matrix', icon: Users, roles: ['Branch Admin', 'Manager'], type: 'OPERATIONAL', feature: 'hr_enabled' },
    { id: 'auction', label: 'Auction House', icon: Gavel, roles: ['Branch Admin', 'Manager'], type: 'OPERATIONAL', feature: 'auction_enabled' },
    { id: 'decision', label: 'Decision Support', icon: BrainCircuit, roles: ['Branch Admin', 'Manager', 'Owner'], type: 'OPERATIONAL', feature: 'decision_enabled' },
  ];

  const filteredNavItems = allNavItems.filter(item => {
    if (userRole === 'Super Admin' && !isImpersonating) {
      return item.type === 'PLATFORM';
    }
    const roleMatch = item.roles?.includes(userRole);
    const featureEnabled = item.feature ? isEnabled(item.feature) : true;
    return item.type === 'OPERATIONAL' && roleMatch && featureEnabled;
  });

  if (loading) return (
    <div className="h-screen w-screen bg-[#030213] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      <p className="text-slate-400 text-sm">Initializing session...</p>
    </div>
  );

  if (!session) return <Login />;

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="flex h-screen w-screen bg-[#f8fafc] overflow-hidden font-sans relative text-left">
        
        {toast && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100]">
            <div className={`flex items-center gap-4 px-8 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${
              toast.type === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white' : 'bg-rose-600/90 border-rose-400 text-white'
            }`}>
              <span className="font-bold text-sm">{toast.msg}</span>
              <button onClick={() => setToast(null)}><X className="w-4 h-4 opacity-50" /></button>
            </div>
          </div>
        )}

        <aside className="w-72 bg-[#030213] text-white p-8 hidden lg:flex flex-col border-r border-slate-800 h-full shrink-0">
          <div className="mb-10 flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">PawnGold</h1>
                <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1">
                  {isImpersonating ? 'LIVE BRANCH VIEW' : userRole}
                </p>
              </div>
          </div>
          
          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-300 ${
                    isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-800 space-y-4">
            <button onClick={handleSignOut} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all">
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
            <p className="text-[11px] text-slate-500 font-medium italic pl-5">{branchName}</p>
          </div>
        </aside>

        <main className="flex-1 h-full overflow-y-auto bg-[#F8FAFC] relative">
          {isImpersonating && (
            <div className="sticky top-0 z-[50] w-full bg-[#F8FAFC]/80 backdrop-blur-md px-12 py-6 flex justify-between items-center border-b border-slate-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                    Impersonation Mode: <span className="text-rose-500">{branchName}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveTab('hr')}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
                  >
                    <UserPlus size={16} /> Add Admin
                  </button>
                  <button 
                    onClick={exitBranchView}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-rose-500 text-rose-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <ArrowLeftCircle size={16} /> Exit
                  </button>
                </div>
            </div>
          )}

          <div className="p-8 lg:p-12 max-w-[1600px] mx-auto min-h-full">
            {activeTab === 'dashboard' && (
              <Dashboard 
                branchId={currentBranchId} 
                setActiveTab={setActiveTab} 
                userRole={userRole} 
                isEnabled={isEnabled} 
                setUserRole={setUserRole} // Fixed missing prop
              />
            )}
            {activeTab === 'sales' && <SalesPos branchId={currentBranchId} setActiveTab={setActiveTab} />}
            {activeTab === 'redemption' && <Redemption branchId={currentBranchId} />}
            {activeTab === 'crm' && <CrmTable branchId={currentBranchId} />}
            {activeTab === 'inventory' && <InventoryVault branchId={currentBranchId} />}
            {activeTab === 'decision' && <DecisionSupport branchId={currentBranchId} />}
            {activeTab === 'auction' && <AuctionTab branchId={currentBranchId} />}
            {activeTab === 'branches' && <BranchManagement />}
            {activeTab === 'finance' && <FinanceTreasury branchId={currentBranchId} />}
            {activeTab === 'hr' && <StaffMatrix branchId={currentBranchId} userRole={userRole} />}
            
            {(activeTab === 'platform-control' || activeTab === 'system-settings') && 
             userRole === 'Super Admin' && !isImpersonating && (
              <SuperAdminDashboard 
                setActiveTab={setActiveTab} 
                activeTab={activeTab}
                globalConfig={systemConfig} 
                setGlobalConfig={setSystemConfig} 
              />
            )}
          </div>
        </main>
      </div>
    </ToastContext.Provider>
  );
}

export default App;