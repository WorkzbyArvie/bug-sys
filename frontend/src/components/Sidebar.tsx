import { 
  LayoutDashboard, 
  Users, 
  Package, 
  LogOut, 
  ShieldCheck, 
  Banknote, 
  Building2,
  Settings,
  RotateCcw,
  Wallet,
  UserSquare2,
  Gavel,
  BrainCircuit // Added for Decision Support
} from 'lucide-react';

// Roles matching your system logic
type Role = 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'STAFF' | 'SUPER' | 'SHOP_ADMIN' | 'BRANCH ADMIN';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  isMobileView: boolean;
  userRole: Role; 
}

export function Sidebar({ activeView, onNavigate, isMobileView, userRole }: SidebarProps) {
  
  // Navigation items strictly mapped to access guidelines
  const allNavItems = [
    // --- BRANCH LEVEL PANELS (Hidden from Super Admin) ---
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      roles: ['BRANCH ADMIN', 'STAFF', 'OWNER', 'MANAGER', 'SHOP_ADMIN'] // Removed Super Admins
    },
    // --- SUPER ADMIN ONLY PANELS ---
    { 
      id: 'branches', 
      label: 'Platform Control', 
      icon: Building2, 
      roles: ['SUPER', 'SUPER_ADMIN'] // Strictly for Super Admin
    },
    { 
      id: 'system', 
      label: 'System Control', 
      icon: Settings, 
      roles: ['SUPER', 'SUPER_ADMIN'] // Strictly for Super Admin
    },
    // --- SHARED BRANCH ACCESS ---
    { 
      id: 'loans', 
      label: 'Loan Management', 
      icon: Banknote, 
      roles: ['BRANCH ADMIN', 'STAFF', 'OWNER', 'MANAGER', 'SHOP_ADMIN'] //
    },
    { 
      id: 'customers', 
      label: 'Customers', 
      icon: Users, 
      roles: ['BRANCH ADMIN', 'STAFF', 'OWNER', 'MANAGER', 'SHOP_ADMIN'] //
    },
    { 
      id: 'inventory', 
      label: 'Inventory & Vault', 
      icon: Package, 
      roles: ['BRANCH ADMIN', 'MANAGER', 'OWNER', 'SHOP_ADMIN'] // Staff typically excluded
    },
    { 
      id: 'redemption', 
      label: 'Redemption', 
      icon: RotateCcw, 
      roles: ['BRANCH ADMIN', 'STAFF', 'OWNER', 'MANAGER'] 
    },
    // --- AI DECISION SUPPORT (Branch Admin only) ---
    {
      id: 'ai-support',
      label: 'Decision Support',
      icon: BrainCircuit,
      roles: ['BRANCH ADMIN', 'OWNER'] // Hidden from Super Admin
    },
    { 
      id: 'finance', 
      label: 'Finance & Treasury', 
      icon: Wallet, 
      roles: ['BRANCH ADMIN', 'OWNER', 'MANAGER'] 
    },
    { 
      id: 'staff', 
      label: 'Staff Matrix', 
      icon: UserSquare2, 
      roles: ['BRANCH ADMIN', 'OWNER', 'MANAGER'] 
    },
    { 
      id: 'auction', 
      label: 'Auction House', 
      icon: Gavel, 
      roles: ['BRANCH ADMIN', 'OWNER', 'MANAGER'] 
    },
  ];

  // Filter based on the current userRole
  const visibleNavItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className={`bg-[#030213] text-white flex flex-col h-screen transition-all duration-300 ${isMobileView ? 'w-20' : 'w-64'} border-r border-white/5`}>
      <div className="p-6 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          {!isMobileView && (
            <div>
              <h2 className="font-black italic tracking-tighter text-xl uppercase leading-none">PawnGold</h2>
              <p className="text-[9px] uppercase tracking-[0.2em] text-indigo-400 font-black mt-1">
                {userRole.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <ul className="space-y-2">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-500 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
                  {!isMobileView && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800/50">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all group">
          <LogOut className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
          {!isMobileView && <span className="font-bold text-sm">Sign Out</span>}
        </button>
        
        {!isMobileView && (
          <div className="mt-4 px-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Secured</span>
            </div>
            <p className="text-[9px] font-bold text-slate-700 uppercase mt-1">PawnGold HQ v2.0</p>
          </div>
        )}
      </div>
    </aside>
  );
}