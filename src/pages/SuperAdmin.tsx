import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Plus, Users, Loader2, Search, UserPlus, Shield, Edit } from 'lucide-react';
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
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<{ id: string; name: string; nit: string; email: string; phone: string; address: string; logo_url: string | null } | null>(null);
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

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('company_logos')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('company_logos')
          .getPublicUrl(filePath);

        logoUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('companies').insert({
        name: newCompany.name,
        nit: newCompany.nit,
        email: newCompany.email || null,
        phone: newCompany.phone || null,
        address: newCompany.address || null,
        logo_url: logoUrl,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-companies'] });
      toast({ title: 'Empresa creada exitosamente' });
      setNewCompany({ name: '', nit: '', email: '', phone: '', address: '' });
      setLogoFile(null);
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

      const { error } = await supabase.from('companies').update({
        name: editingCompany.name,
        nit: editingCompany.nit,
        email: editingCompany.email || null,
        phone: editingCompany.phone || null,
        address: editingCompany.address || null,
        logo_url: logoUrl,
      }).eq('id', editingCompany.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-companies'] });
      toast({ title: 'Empresa actualizada exitosamente' });
      setEditingCompany(null);
      setLogoFile(null);
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
    });
    setLogoFile(null);
    setEditOpen(true);
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.nit.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Panel Super-Administrador</h1>
          <p className="text-muted-foreground">Gestión global de empresas, usuarios y roles del sistema</p>
        </div>
      </div>

      <Tabs defaultValue="companies" className="space-y-4">
        <div className="scrollbar-hide w-full overflow-x-auto pb-1">
        <TabsList className="inline-flex h-auto min-w-max justify-start sm:grid sm:w-full sm:grid-cols-3">
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="w-4 h-4" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="w-4 h-4" />
            Roles
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full items-center gap-2 sm:max-w-sm">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o NIT..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="min-w-0 flex-1"
              />
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Empresa
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
                  <div>
                    <Label>Logo de la Empresa</Label>
                    <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
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
                    <div>
                      <Label>Logo de la Empresa</Label>
                      <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                      {editingCompany.logo_url && !logoFile && (
                        <p className="text-xs text-muted-foreground mt-1">Logo actual cargado</p>
                      )}
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
            <Card className="hidden md:block">
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>NIT</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Usuarios</TableHead>
                      <TableHead>Creada</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map(company => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                              {company.logo_url ? (
                                <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                              ) : (
                                <Building2 className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{company.name}</p>
                              {company.address && <p className="text-xs text-muted-foreground">{company.address}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{company.nit}</Badge></TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {company.email && <p>{company.email}</p>}
                            {company.phone && <p className="text-muted-foreground">{company.phone}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>{userCountMap[company.id] || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(company.created_at).toLocaleDateString('es-CO')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCompany(company)}>
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCompanies.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No se encontraron empresas
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
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setInviteDialogOpen(true)} className="w-full sm:w-auto">
              <UserPlus className="w-4 h-4 mr-2" />
              Invitar Usuario
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
