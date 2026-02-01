import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { UserPlus, Loader2, Mail, Lock, ShieldCheck } from "lucide-react";

interface AddAdminModalProps {
  branchId: string;
  branchName: string;
}

export function AddAdminModal({ branchId, branchName }: AddAdminModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return alert("Error: No branch context found.");
    setLoading(true);
    
    try {
      // 1. Auth Sign Up
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'BRANCH_ADMIN',
            branchId: branchId
          }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        // 2. Insert into Staff (Matches image_255e1f.png constraint)
        const { error: staffError } = await supabase.from('Staff').insert({
          id: data.user.id,
          fullName: `${branchName} Admin`,
          email: email,
          password: password, 
          role: 'BRANCH_ADMIN',
          branchId: branchId,
          isVerified: true 
        });

        if (staffError) throw staffError;

        // 3. Insert into Profiles (Fixes image_254e99.png relationship error)
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: `${branchName} Admin`, //
          email: email, //
          role: 'BRANCH_ADMIN',
          pawnshop_id: branchId 
        });

        if (profileError) throw profileError;

        alert(`Success! Admin access granted for ${branchName}.`);
        setIsOpen(false);
        setEmail('');
        setPassword('');
      }
    } catch (err: any) {
      console.error("Provisioning Error:", err);
      alert(`Provisioning Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 px-6 rounded-2xl flex gap-2 transition-all shadow-lg shadow-indigo-200">
          <UserPlus size={18} /> Add Branch Admin
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[450px] rounded-[32px] p-8 border-none shadow-2xl bg-white">
        <DialogHeader className="mb-6">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck size={28} />
          </div>
          <DialogTitle className="text-2xl font-black uppercase italic tracking-tight text-slate-900">
            Internal <span className="text-indigo-600">Provisioning</span>
          </DialogTitle>
          <p className="text-slate-500 text-sm font-medium">
            Creating administrative access for <span className="text-slate-900 font-bold underline">{branchName}</span>.
          </p>
        </DialogHeader>

        <form onSubmit={handleCreateAdmin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Mail size={12} className="text-indigo-500" /> Admin Credentials
            </label>
            <Input 
              type="email" 
              placeholder="admin@branch.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="p-4 h-auto rounded-xl border-slate-100 bg-slate-50 font-medium focus:bg-white transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Lock size={12} className="text-indigo-500" /> Temporary Access Key
            </label>
            <Input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="p-4 h-auto rounded-xl border-slate-100 bg-slate-50 font-medium focus:bg-white transition-colors"
            />
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#030213] hover:bg-indigo-600 text-white font-black uppercase tracking-widest py-7 rounded-2xl transition-all shadow-xl hover:scale-[1.01] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Authorizing...
                </span>
              ) : (
                "Grant Admin Privileges"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}