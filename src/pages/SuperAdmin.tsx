import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Plus, Users, Loader2, Search, UserPlus, Shield, Edit, Image as ImageIcon } from 'lucide-react';
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
  const [newCompany, setNewCompany] = useState({ name: '', nit: '', email: '', phone: '', address: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [horizontalLogoFile, setHorizontalLogoFile] = useState<File | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<{ id: string; name: string; nit: string; email: string; phone: string; address: string; logo_url: string | null; horizontal_logo_url: string | null } | null>(null);
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
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-companies'] });
      toast({ title: 'Empresa creada exitosamente' });
      setNewCompany({ name: '', nit: '', email: '', phone: '', address: '' });
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
    <div className="min-h-screen pb-20 space-y-8 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header Premium Flat */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative p-8 rounded-[2.5rem] bg-white border border-slate-100"
      >
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0 group">
              <div className="relative h-20 w-20 flex items-center justify-center rounded-[1.75rem] bg-primary transition-all duration-300">
                <Shield className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Panel de Control Maestro
                </Badge>
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Protocolo de Alta Seguridad</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground uppercase sm:text-4xl">
                Super Administrador
              </h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Gestión global de infraestructura multisectorial</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-background border border-slate-100 flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Empresas</p>
                <p className="text-sm font-black text-slate-900">{companies.length}</p>
              </div>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-background border border-slate-100 flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Usuarios</p>
                <p className="text-sm font-black text-slate-900">{users.length}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="companies" className="space-y-8">
        <div className="flex justify-center">
          <TabsList className="max-w-2xl w-full sm:grid sm:grid-cols-3">
            {[
              { value: 'companies', label: 'Empresas', icon: Building2 },
              { value: 'users', label: 'Usuarios', icon: Users },
              { value: 'roles', label: 'Roles', icon: Shield },
            ].map((tab) => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
              >
                <tab.icon className="w-3.5 h-3.5 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
            <div className="relative w-full sm:max-w-md group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                placeholder="BUSCAR EMPRESA O NIT..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-12 pl-12 rounded-2xl bg-white/50 border-slate-200 focus:bg-white focus:border-primary focus:ring-primary/10 transition-all font-bold text-[10px] uppercase tracking-widest"
              />
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="h-12 px-8 rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover font-black uppercase tracking-widest text-[10px]">
                  <Plus className="w-4 h-4 mr-2 stroke-[3]" />
                  REGISTRAR EMPRESA
                </Button>
              </DialogTrigger>
              <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-md">
                <DialogHeader className="shrink-0">
                  <DialogTitle>Crear Nueva Empresa</DialogTitle>
                  <DialogDescription>Ingresa los datos de la nueva empresa</DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                  <div>
                    <Label>Nombre *</Label>
                    <Input value={newCompany.name} onChange={e => setNewCompany(p => ({ ...p, name: e.target.value }))} placeholder="Mi Empresa S.A.S" />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ImageIcon className="h-3 w-3" /> Identidad Visual
                    </Label>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      {/* Avatar */}
                      <div className="space-y-2 flex-shrink-0">
                        <Label className="text-[10px] text-muted-foreground">Avatar (Cuadrado)</Label>
                        <div 
                          onClick={() => document.getElementById('new-logo-avatar')?.click()}
                          className="relative h-24 w-24 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-background transition-all hover:border-border 0 hover:group"
                        >
                          {logoFile ? (
                            <img src={URL.createObjectURL(logoFile)} alt="Preview" className="h-full w-full object-contain p-2" />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                              <Plus className="h-5 w-5" />
                              <span className="text-[8px]">1:1</span>
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/5 group-hover:opacity-100 transition-all">
                            <Plus className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <Input id="new-logo-avatar" type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="hidden" />
                      </div>

                      {/* Horizontal */}
                      <div className="space-y-2 flex-1">
                        <Label className="text-[10px] text-muted-foreground">Branding (Reportes/Contratos)</Label>
                        <div 
                          onClick={() => document.getElementById('new-logo-horizontal')?.click()}
                          className="relative h-24 w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-background transition-all hover:border-border 0 hover:group"
                        >
                          {horizontalLogoFile ? (
                            <img src={URL.createObjectURL(horizontalLogoFile)} alt="Preview" className="h-full w-full object-contain p-3" />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                              <Plus className="h-5 w-5" />
                              <span className="text-[8px]">Horizontal</span>
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/5 group-hover:opacity-100 transition-all">
                            <Plus className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <Input id="new-logo-horizontal" type="file" accept="image/*" onChange={e => setHorizontalLogoFile(e.target.files?.[0] || null)} className="hidden" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>NIT *</Label>
                    <Input value={newCompany.nit} onChange={e => setNewCompany(p => ({ ...p, nit: e.target.value }))} placeholder="900123456-7" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Correo</Label>
                      <Input value={newCompany.email} onChange={e => setNewCompany(p => ({ ...p, email: e.target.value }))} placeholder="empresa@ejemplo.com" />
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <Input value={newCompany.phone} onChange={e => setNewCompany(p => ({ ...p, phone: e.target.value }))} placeholder="+57 300 123 4567" />
                    </div>
                  </div>
                  <div>
                    <Label>Dirección</Label>
                    <Input value={newCompany.address} onChange={e => setNewCompany(p => ({ ...p, address: e.target.value }))} placeholder="Calle 123 #45-67" />
                  </div>
                </div>
                <DialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
                  <Button
                    onClick={() => createCompanyMutation.mutate()}
                    disabled={!newCompany.name || !newCompany.nit || createCompanyMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {createCompanyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Crear Empresa
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Company Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-md">
                <DialogHeader className="shrink-0">
                  <DialogTitle>Editar Empresa</DialogTitle>
                  <DialogDescription>Actualiza los datos de la empresa seleccionada</DialogDescription>
                </DialogHeader>
                {editingCompany && (
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                    <div>
                      <Label>Nombre *</Label>
                      <Input value={editingCompany.name} onChange={e => setEditingCompany(p => ({ ...p!, name: e.target.value }))} placeholder="Mi Empresa S.A.S" />
                    </div>
                    <div className="space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <ImageIcon className="h-3 w-3" /> Identidad Visual
                      </Label>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        {/* Avatar */}
                        <div className="space-y-2 flex-shrink-0">
                          <Label className="text-[10px] text-muted-foreground">Avatar (Cuadrado)</Label>
                          <div 
                            onClick={() => document.getElementById('edit-logo-avatar')?.click()}
                            className="relative h-24 w-24 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-background transition-all hover:border-border 0 hover:group"
                          >
                            {(logoFile || editingCompany.logo_url) ? (
                              <img 
                                src={logoFile ? URL.createObjectURL(logoFile) : editingCompany.logo_url!} 
                                alt="Avatar" 
                                className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105" 
                              />
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                                <Plus className="h-5 w-5" />
                                <span className="text-[8px]">1:1</span>
                              </div>
                            )}
                            
                            {editingCompany.logo_url && !logoFile && (
                              <div className="absolute top-1.5 right-1.5">
                                <Badge className="bg-success hover:bg-success/90 text-[8px] h-3.5 px-1 border-none">Actual</Badge>
                              </div>
                            )}

                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/10 group-hover:opacity-100 transition-all text-primary">
                              <Edit className="h-4 w-4" />
                            </div>
                          </div>
                          <Input id="edit-logo-avatar" type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="hidden" />
                        </div>

                        {/* Horizontal branding */}
                        <div className="space-y-2 flex-1">
                          <Label className="text-[10px] text-muted-foreground">Branding (Reportes/Contratos)</Label>
                          <div 
                            onClick={() => document.getElementById('edit-logo-horizontal')?.click()}
                            className="relative h-24 w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-background transition-all hover:border-border 0 hover:group"
                          >
                            {(horizontalLogoFile || editingCompany.horizontal_logo_url) ? (
                              <img 
                                src={horizontalLogoFile ? URL.createObjectURL(horizontalLogoFile) : editingCompany.horizontal_logo_url!} 
                                alt="Horizontal" 
                                className="h-full w-full object-contain p-4 transition-transform group-hover:scale-105" 
                              />
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                                <Plus className="h-5 w-5" />
                                <span className="text-[8px]">Horizontal</span>
                              </div>
                            )}

                            {editingCompany.horizontal_logo_url && !horizontalLogoFile && (
                              <div className="absolute top-1.5 right-1.5">
                                <Badge className="bg-success hover:bg-success/90 text-[8px] h-3.5 px-1 border-none">Actual</Badge>
                              </div>
                            )}

                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/10 group-hover:opacity-100 transition-all text-primary">
                              <Edit className="h-4 w-4" />
                            </div>
                          </div>
                          <Input id="edit-logo-horizontal" type="file" accept="image/*" onChange={e => setHorizontalLogoFile(e.target.files?.[0] || null)} className="hidden" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>NIT *</Label>
                      <Input value={editingCompany.nit} onChange={e => setEditingCompany(p => ({ ...p!, nit: e.target.value }))} placeholder="900123456-7" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Correo</Label>
                        <Input value={editingCompany.email} onChange={e => setEditingCompany(p => ({ ...p!, email: e.target.value }))} placeholder="empresa@ejemplo.com" />
                      </div>
                      <div>
                        <Label>Teléfono</Label>
                        <Input value={editingCompany.phone} onChange={e => setEditingCompany(p => ({ ...p!, phone: e.target.value }))} placeholder="+57 300 123 4567" />
                      </div>
                    </div>
                    <div>
                      <Label>Dirección</Label>
                      <Input value={editingCompany.address} onChange={e => setEditingCompany(p => ({ ...p!, address: e.target.value }))} placeholder="Calle 123 #45-67" />
                    </div>
                  </div>
                )}
                <DialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
                  <Button
                    onClick={() => updateCompanyMutation.mutate()}
                    disabled={!editingCompany?.name || !editingCompany?.nit || updateCompanyMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {updateCompanyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Guardar Cambios
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
            <MobileCardList
              className="md:hidden"
              emptyMessage="No se encontraron empresas"
              items={filteredCompanies.map(company => ({
                id: company.id,
                title: company.name,
                subtitle: company.address || 'Sin dirección registrada',
                badge: <Badge variant="outline">{company.nit}</Badge>,
                fields: [
                  {
                    label: 'Contacto',
                    value: (
                      <div className="space-y-0.5">
                        <p>{company.email || '—'}</p>
                        <p className="text-muted-foreground">{company.phone || '—'}</p>
                      </div>
                    ),
                    className: 'col-span-2',
                  },
                  {
                    label: 'Usuarios',
                    value: (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {userCountMap[company.id] || 0}
                      </span>
                    ),
                  },
                  {
                    label: 'Creada',
                    value: new Date(company.created_at).toLocaleDateString('es-CO'),
                  },
                ],
                actions: (
                  <Button variant="outline" size="sm" onClick={() => handleEditCompany(company)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                ),
              }))}
            />
            <Card className="hidden md:block rounded-[2.5rem] bg-white border border-slate-100">
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="px-8 py-5">Entidad Corporativa</TableHead>
                      <TableHead className="px-8 py-5">Identificación</TableHead>
                      <TableHead className="px-8 py-5">Contacto & Canales</TableHead>
                      <TableHead className="px-8 py-5 text-center">Talento Humano</TableHead>
                      <TableHead className="px-8 py-5">Fecha Alta</TableHead>
                      <TableHead className="w-[100px] px-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map(company => (
                      <TableRow key={company.id} className="group hover:bg-primary/[0.02] transition-colors border-slate-50">
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="relative h-12 w-12 shrink-0 group/avatar">
                              <div className="absolute -inset-0.5 bg-primary/20 rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                              <div className="relative h-full w-full rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
                                {company.logo_url ? (
                                  <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Building2 className="w-5 h-5 text-slate-300" />
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{company.name}</p>
                              {company.address && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{company.address}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6">
                          <Badge variant="outline" className="bg-background border-slate-200 text-slate-600 font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">
                            NIT {company.nit}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-8 py-6">
                          <div className="space-y-1">
                            {company.email && <p className="text-xs font-bold text-slate-600 lowercase tracking-tight">{company.email}</p>}
                            {company.phone && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{company.phone}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-center">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-[10px] font-black text-primary tracking-widest">
                            <Users className="w-3.5 h-3.5" />
                            {userCountMap[company.id] || 0} ACTIVOS
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {new Date(company.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditCompany(company)}
                            className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCompanies.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-20">
                          <div className="flex flex-col items-center gap-4 opacity-40">
                            <Building2 className="w-12 h-12 text-slate-300" />
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">No se encontraron entidades registradas</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Directorio Global
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión de identidades y accesos multisectoriales</p>
            </div>
            <Button 
              onClick={() => setInviteDialogOpen(true)} 
              className="h-12 px-8 rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover font-black uppercase tracking-widest text-[10px]"
            >
              <UserPlus className="w-4 h-4 mr-2 stroke-[3]" />
              INVITAR OPERADOR
            </Button>
          </div>
          <UsersTable users={users} isLoading={usersLoading} />
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <RolesManager />
        </TabsContent>
      </Tabs>

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  );
}
