import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Plus, Users, Trash2, Loader2, Search, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';

export default function SuperAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [newCompany, setNewCompany] = useState({ name: '', nit: '', email: '', phone: '', address: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignCompanyId, setAssignCompanyId] = useState('');

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
      const { error } = await supabase.from('companies').insert({
        name: newCompany.name,
        nit: newCompany.nit,
        email: newCompany.email || null,
        phone: newCompany.phone || null,
        address: newCompany.address || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-companies'] });
      toast({ title: 'Empresa creada exitosamente' });
      setNewCompany({ name: '', nit: '', email: '', phone: '', address: '' });
      setCreateOpen(false);
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: async () => {
      // Look up user by email using edge function
      const { data, error } = await supabase.functions.invoke('lookup-user-by-email', {
        body: { email: assignEmail },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Usuario no encontrado');
      
      const userId = data.user_id;
      
      // Check if already assigned
      const { data: existing } = await supabase
        .from('user_company_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', assignCompanyId)
        .maybeSingle();
      
      if (existing) throw new Error('El usuario ya está asignado a esta empresa');
      
      const { error: assignError } = await supabase
        .from('user_company_assignments')
        .insert({ user_id: userId, company_id: assignCompanyId });
      if (assignError) throw assignError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-assignments'] });
      toast({ title: 'Usuario asignado exitosamente' });
      setAssignEmail('');
      setAssignCompanyId('');
      setAssignOpen(false);
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    },
  });

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.nit.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Empresas</h1>
          <p className="text-muted-foreground">Panel de super-administrador para gestionar todas las empresas del sistema</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Asignar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Asignar Usuario a Empresa</DialogTitle>
                <DialogDescription>Asigna un usuario existente a una empresa para que pueda acceder a ella</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Correo del usuario</Label>
                  <Input
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={assignEmail}
                    onChange={e => setAssignEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Empresa</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={assignCompanyId}
                    onChange={e => setAssignCompanyId(e.target.value)}
                  >
                    <option value="">Seleccionar empresa...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.nit})</option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => assignUserMutation.mutate()}
                  disabled={!assignEmail || !assignCompanyId || assignUserMutation.isPending}
                >
                  {assignUserMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Asignar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Empresa</DialogTitle>
                <DialogDescription>Ingresa los datos de la nueva empresa</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={newCompany.name} onChange={e => setNewCompany(p => ({ ...p, name: e.target.value }))} placeholder="Mi Empresa S.A.S" />
                </div>
                <div>
                  <Label>NIT *</Label>
                  <Input value={newCompany.nit} onChange={e => setNewCompany(p => ({ ...p, nit: e.target.value }))} placeholder="900123456-7" />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
              <DialogFooter>
                <Button
                  onClick={() => createCompanyMutation.mutate()}
                  disabled={!newCompany.name || !newCompany.nit || createCompanyMutation.isPending}
                >
                  {createCompanyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Crear Empresa
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o NIT..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Usuarios</TableHead>
                  <TableHead>Creada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map(company => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" />
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
                  </TableRow>
                ))}
                {filteredCompanies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No se encontraron empresas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
