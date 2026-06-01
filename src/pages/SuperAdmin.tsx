import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Plus, Users, Loader2, Search, UserPlus, Shield, Edit, Image as ImageIcon, Briefcase, Mail, Phone, MapPin, Calendar, ExternalLink, Save, ArrowRight, LayoutGrid, CheckCircle2, MoreHorizontal, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { UsersTable } from '@/components/admin/UsersTable';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { RolesManager } from '@/components/roles/RolesManager';
import { MobileCardList } from '@/components/shared/MobileCardList';

export default function SuperAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [newCompany, setNewCompany] = useState({ name: '', nit: '', email: '', phone: '', address: '', contract_prefix: 'CT' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [horizontalLogoFile, setHorizontalLogoFile] = useState<File | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<{ id: string; name: string; nit: string; email: string; phone: string; address: string; logo_url: string | null; horizontal_logo_url: string | null; contract_prefix: string } | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { data: users = [], isLoading: usersLoading } = useAdminUsers();

  // Fetch all companies (super-admin sees all via RLS)
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['superadmin-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch user counts per company
  const { data: assignments = [] } = useQuery({
    queryKey: ['superadmin-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_company_assignments')
        .select('company_id, user_id');
      if (error) throw error;
      return data;
    },
  });

  const userCountMap = assignments.reduce((acc, a) => {
    acc[a.company_id] = (acc[a.company_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Fetch active employee counts per company
  const { data: activeEmployeeAssignments = [] } = useQuery({
    queryKey: ['superadmin-active-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees_v2')
        .select('company_id')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const employeeCountMap = activeEmployeeAssignments.reduce((acc, emp) => {
    acc[emp.company_id] = (acc[emp.company_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const createCompanyMutation = useMutation({
    mutationFn: async () => {
      let logoUrl = null;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('company_logos')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('company_logos')
          .getPublicUrl(filePath);

        logoUrl = publicUrlData.publicUrl;
      }

      let horizontalLogoUrl = null;
      if (horizontalLogoFile) {
        const fileExt = horizontalLogoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}_h.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('company_logos')
          .upload(filePath, horizontalLogoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('company_logos')
          .getPublicUrl(filePath);

        horizontalLogoUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('companies').insert({
        name: newCompany.name,
        nit: newCompany.nit,
        email: newCompany.email || null,
        phone: newCompany.phone || null,
        address: newCompany.address || null,
        logo_url: logoUrl,
        horizontal_logo_url: horizontalLogoUrl,
        contract_prefix: newCompany.contract_prefix || 'CT',
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-companies'] });
      toast({ title: 'Empresa creada exitosamente' });
      setNewCompany({ name: '', nit: '', email: '', phone: '', address: '', contract_prefix: 'CT' });
      setLogoFile(null);
      setHorizontalLogoFile(null);
      setCreateOpen(false);
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async () => {
      if (!editingCompany) return;
      let logoUrl = editingCompany.logo_url;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('company_logos')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('company_logos')
          .getPublicUrl(filePath);

        logoUrl = publicUrlData.publicUrl;
      }

      let horizontalLogoUrl = editingCompany.horizontal_logo_url;
      if (horizontalLogoFile) {
        const fileExt = horizontalLogoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}_h.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('company_logos')
          .upload(filePath, horizontalLogoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('company_logos')
          .getPublicUrl(filePath);

        horizontalLogoUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('companies').update({
        name: editingCompany.name,
        nit: editingCompany.nit,
        email: editingCompany.email || null,
        phone: editingCompany.phone || null,
        address: editingCompany.address || null,
        logo_url: logoUrl,
        horizontal_logo_url: horizontalLogoUrl,
        contract_prefix: editingCompany.contract_prefix || 'CT',
      }).eq('id', editingCompany.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-companies'] });
      toast({ title: 'Empresa actualizada exitosamente' });
      setEditingCompany(null);
      setLogoFile(null);
      setHorizontalLogoFile(null);
      setEditOpen(false);
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    },
  });

  const handleEditCompany = (company: any) => {
    setEditingCompany({
      id: company.id,
      name: company.name,
      nit: company.nit,
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      logo_url: company.logo_url,
      horizontal_logo_url: company.horizontal_logo_url,
      contract_prefix: company.contract_prefix || 'CT',
    });
    setLogoFile(null);
    setHorizontalLogoFile(null);
    setEditOpen(true);
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.nit.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2">
      {/* Header Premium Flat */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
            <Shield className="w-8 h-8 stroke-[2.5] text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">Maestro Admin</h1>
              <Badge className="bg-primary text-white border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">MASTER CONTROL</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Consola de gestión estratégica de infraestructura</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Entidades</p>
              <p className="text-lg font-black text-foreground leading-none">{companies.length}</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Usuarios</p>
              <p className="text-lg font-black text-foreground leading-none">{users.length}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="companies" className="space-y-8">
        <div className="flex justify-center px-1">
          <TabsList className="flex h-auto p-1.5 gap-1.5 bg-white border border-slate-100 rounded-2xl w-full max-w-2xl shadow-sm">
            {[
              { value: 'companies', label: 'Empresas', icon: Building2 },
              { value: 'users', label: 'Usuarios', icon: Users },
              { value: 'roles', label: 'Roles', icon: Shield },
            ].map((tab) => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
                className="flex-1 text-[9px] font-black uppercase tracking-widest py-3 px-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all shrink-0 shadow-sm"
              >
                <tab.icon className="w-3.5 h-3.5 mr-2.5 shrink-0" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-8 outline-none px-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative flex-1 max-w-md group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors stroke-[2.5]" />
              </div>
              <Input
                placeholder="FILTRAR POR NOMBRE O NIT..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-14 pl-14 rounded-2xl bg-white border-slate-100 focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
              />
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95 group w-full md:w-auto">
                  <Plus className="w-4 h-4 mr-3 stroke-[3] group-hover:rotate-90 transition-transform" />
                  REGISTRAR ENTIDAD
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-slate-100 p-0 shadow-2xl overflow-hidden sm:max-w-2xl bg-white">
                <DialogHeader className="p-8 border-b border-slate-50">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Building2 className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">Configuración Maestra</DialogTitle>
                      <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Instalación de nueva infraestructura corporativa</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Razón Social Jurídica</Label>
                      <Input value={newCompany.name} onChange={e => setNewCompany(p => ({ ...p, name: e.target.value }))} className="h-12 rounded-xl bg-slate-50 border-none font-black text-xs uppercase" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">NIT / Tax ID</Label>
                      <Input value={newCompany.nit} onChange={e => setNewCompany(p => ({ ...p, nit: e.target.value }))} className="h-12 rounded-xl bg-slate-50 border-none font-black text-xs uppercase" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Línea Telefónica</Label>
                      <Input value={newCompany.phone} onChange={e => setNewCompany(p => ({ ...p, phone: e.target.value }))} className="h-12 rounded-xl bg-slate-50 border-none font-black text-xs uppercase" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Correo Institucional</Label>
                      <Input value={newCompany.email} onChange={e => setNewCompany(p => ({ ...p, email: e.target.value }))} className="h-12 rounded-xl bg-slate-50 border-none font-black text-xs lowercase" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Dirección Principal</Label>
                      <Input value={newCompany.address} onChange={e => setNewCompany(p => ({ ...p, address: e.target.value }))} className="h-12 rounded-xl bg-slate-50 border-none font-black text-xs uppercase" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Prefijo de Contratos</Label>
                      <Input 
                        value={newCompany.contract_prefix} 
                        onChange={e => setNewCompany(p => ({ ...p, contract_prefix: e.target.value.toUpperCase() }))} 
                        className="h-12 rounded-xl bg-slate-50 border-none font-black text-xs uppercase"
                        placeholder="CT"
                        maxLength={5}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Avatar de Marca</Label>
                      <div onClick={() => document.getElementById('new-logo-avatar')?.click()} className="group/logo relative h-32 w-32 rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50 flex items-center justify-center cursor-pointer transition-all hover:bg-white hover:border-primary/40 overflow-hidden mx-auto md:mx-0">
                        {logoFile ? <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-contain p-4 transition-transform group-hover/logo:scale-110" /> : <ImageIcon className="w-8 h-8 text-slate-200" />}
                        <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-8 h-8 text-white stroke-[3]" />
                        </div>
                      </div>
                      <Input id="new-logo-avatar" type="file" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Logo Institucional</Label>
                      <div onClick={() => document.getElementById('new-logo-horizontal')?.click()} className="group/logo relative h-32 w-full rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50 flex items-center justify-center cursor-pointer transition-all hover:bg-white hover:border-primary/40 overflow-hidden">
                        {horizontalLogoFile ? <img src={URL.createObjectURL(horizontalLogoFile)} className="w-full h-full object-contain p-6 transition-transform group-hover/logo:scale-105" /> : <ImageIcon className="w-8 h-8 text-slate-200" />}
                        <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-8 h-8 text-white stroke-[3]" />
                        </div>
                      </div>
                      <Input id="new-logo-horizontal" type="file" className="hidden" onChange={e => setHorizontalLogoFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                </div>
                <DialogFooter className="p-8 border-t border-slate-50">
                  <Button onClick={() => createCompanyMutation.mutate()} disabled={!newCompany.name || !newCompany.nit || createCompanyMutation.isPending} className="h-14 w-full rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
                    {createCompanyMutation.isPending ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-3" />}
                    INSTALAR ENTIDAD
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="h-16 w-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escaneando red corporativa...</p>
            </div>
          ) : (
            <>
              <MobileCardList
                className="md:hidden"
                items={filteredCompanies.map(company => ({
                  id: company.id,
                  title: <span className="font-black text-foreground uppercase tracking-tight">{company.name}</span>,
                  subtitle: `NIT: ${company.nit}`,
                  badge: (
                    <div className="flex flex-col items-end gap-1">
                      <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[8px] uppercase px-1.5 py-0.5 rounded-lg">{userCountMap[company.id] || 0} USUARIOS</Badge>
                      <Badge className="bg-primary text-white border-none font-black text-[8px] uppercase px-1.5 py-0.5 rounded-lg">{employeeCountMap[company.id] || 0} EMPLEADOS</Badge>
                    </div>
                  ),
                  fields: [
                    { label: 'Ubicación', value: <span className="text-[9px] font-black uppercase text-slate-500">{company.address || 'NO DECLARADA'}</span> },
                    { label: 'Alta', value: <span className="text-[9px] font-black uppercase text-slate-500">{new Date(company.created_at).toLocaleDateString()}</span> }
                  ],
                  actions: (
                    <Button onClick={() => handleEditCompany(company)} className="w-full h-12 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[9px] gap-2">
                      <Edit className="w-3.5 h-3.5" />
                      GESTIONAR ENTIDAD
                    </Button>
                  )
                }))}
              />

              <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow className="border-slate-200 hover:bg-slate-100">
                      <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600">Entidad Estratégica</TableHead>
                      <TableHead className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-600">Identidad Fiscal</TableHead>
                      <TableHead className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-600">Población</TableHead>
                      <TableHead className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-600">Nómina Activa</TableHead>
                      <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600">Protocolo de Alta</TableHead>
                      <TableHead className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-600">Control</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-200 bg-white">
                    {filteredCompanies.map((company, idx) => (
                      <motion.tr 
                        key={company.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="group border-slate-200 transition-colors hover:bg-slate-50"
                      >
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center gap-5">
                            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition-transform group-hover:scale-105">
                              {company.logo_url ? <img src={company.logo_url} className="h-full w-full rounded-[inherit] object-cover" /> : <Building2 className="h-6 w-6 text-slate-400" />}
                            </div>
                            <div className="space-y-1 min-w-0">
                              <p className="truncate font-black uppercase leading-none tracking-tight text-slate-950">{company.name}</p>
                              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                <span className="truncate max-w-[180px]">{company.address || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-center">
                          <Badge className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-primary shadow-none hover:bg-primary/10">
                            NIT: {company.nit}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-center">
                          <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="text-sm font-black text-slate-950">{userCountMap[company.id] || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-center">
                          <div className="inline-flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-sm font-black text-primary">{employeeCountMap[company.id] || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-800">
                              <Calendar className="h-3.5 w-3.5 text-slate-500" />
                              {new Date(company.created_at).toLocaleDateString()}
                            </div>
                            <span className="ml-5 text-[8px] font-black uppercase tracking-widest text-slate-500">REGISTRO LEGACY</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditCompany(company)}
                            className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:border-primary hover:bg-primary hover:text-white"
                          >
                            <Edit className="w-4.5 h-4.5 stroke-[2.5]" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-8 outline-none px-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Users className="w-7 h-7 stroke-[2.5]" />
                </div>
                Operadores del Sistema
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Directorio centralizado de privilegios y accesos</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  Incluye celular
                </Badge>
                <span className="text-[10px] font-medium text-muted-foreground">
                  La invitación solicita correo y número colombiano de contacto.
                </span>
              </div>
            </div>
            <Button 
              onClick={() => setInviteDialogOpen(true)} 
              className="h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] w-full md:w-auto transition-all active:scale-95 group"
            >
              <UserPlus className="w-4 h-4 mr-3 stroke-[3] group-hover:scale-110 transition-transform" />
              INVITAR OPERADOR
            </Button>
          </div>
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden p-1">
            <UsersTable users={users} isLoading={usersLoading} />
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4 outline-none px-1">
          <RolesManager />
        </TabsContent>
      </Tabs>

      <InviteUserDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />

      {/* Edit Company Dialog - Modernized */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-[2.5rem] border-slate-100 p-0 shadow-2xl overflow-hidden sm:max-w-2xl bg-white">
          <DialogHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                <Edit className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Gestión de Entidad</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actualización de parámetros operativos</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {editingCompany && (
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Razón Social Jurídica</Label>
                  <Input value={editingCompany.name} onChange={e => setEditingCompany(p => ({ ...p!, name: e.target.value }))} className="h-12 rounded-xl bg-slate-50 border-none font-black text-xs uppercase" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">NIT / Tax ID</Label>
                  <Input value={editingCompany.nit} onChange={e => setEditingCompany(p => ({ ...p!, nit: e.target.value }))} className="h-12 rounded-xl bg-slate-50 border-none font-black text-xs uppercase" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Línea Telefónica</Label>
                  <Input value={editingCompany.phone} onChange={e => setEditingCompany(p => ({ ...p!, phone: e.target.value }))} className="h-12 rounded-xl bg-slate-50 border-none font-black text-xs uppercase" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Correo Institucional</Label>
                  <Input value={editingCompany.email} onChange={e => setEditingCompany(p => ({ ...p!, email: e.target.value }))} className="h-12 rounded-xl bg-slate-50 border-none font-black text-xs lowercase" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Dirección Principal</Label>
                  <Input value={editingCompany.address} onChange={e => setEditingCompany(p => ({ ...p!, address: e.target.value }))} className="h-12 rounded-xl bg-slate-50 border-none font-black text-xs uppercase" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Prefijo de Contratos</Label>
                  <Input 
                    value={editingCompany.contract_prefix} 
                    onChange={e => setEditingCompany(p => ({ ...p!, contract_prefix: e.target.value.toUpperCase() }))} 
                    className="h-12 rounded-xl bg-slate-50 border-none font-black text-xs uppercase"
                    maxLength={5}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Sustituir Avatar</Label>
                  <div onClick={() => document.getElementById('edit-logo-avatar')?.click()} className="group/logo relative h-32 w-32 rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50 flex items-center justify-center cursor-pointer transition-all hover:bg-white hover:border-primary/40 overflow-hidden mx-auto md:mx-0">
                    {(logoFile || editingCompany.logo_url) ? <img src={logoFile ? URL.createObjectURL(logoFile) : editingCompany.logo_url!} className="w-full h-full object-contain p-4 transition-transform group-hover/logo:scale-110" /> : <ImageIcon className="w-8 h-8 text-slate-200" />}
                    <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="w-8 h-8 text-white stroke-[3]" />
                    </div>
                  </div>
                  <Input id="edit-logo-avatar" type="file" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Sustituir Logo</Label>
                  <div onClick={() => document.getElementById('edit-logo-horizontal')?.click()} className="group/logo relative h-32 w-full rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50 flex items-center justify-center cursor-pointer transition-all hover:bg-white hover:border-primary/40 overflow-hidden">
                    {(horizontalLogoFile || editingCompany.horizontal_logo_url) ? <img src={horizontalLogoFile ? URL.createObjectURL(horizontalLogoFile) : editingCompany.horizontal_logo_url!} className="w-full h-full object-contain p-6 transition-transform group-hover/logo:scale-105" /> : <ImageIcon className="w-8 h-8 text-slate-200" />}
                    <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="w-8 h-8 text-white stroke-[3]" />
                    </div>
                  </div>
                  <Input id="edit-logo-horizontal" type="file" className="hidden" onChange={e => setHorizontalLogoFile(e.target.files?.[0] || null)} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="p-8 border-t border-slate-50">
            <Button onClick={() => updateCompanyMutation.mutate()} disabled={!editingCompany?.name || !editingCompany?.nit || updateCompanyMutation.isPending} className="h-14 w-full rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
              {updateCompanyMutation.isPending ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Save className="w-4 h-4 mr-3 stroke-[2.5]" />}
              CONFIRMAR ACTUALIZACIÓN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
