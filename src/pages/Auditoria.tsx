import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, History, Loader2, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export default function Auditoria() {
  const { currentCompanyId, isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', currentCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!isSuperAdmin && currentCompanyId) {
        query = query.eq('company_id', currentCompanyId);
      } else if (!isSuperAdmin) {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin || !!currentCompanyId,
  });

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20';
      case 'update':
        return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'delete':
        return 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
    }
  };

  const formatEntityName = (type: string) => {
    const names: Record<string, string> = {
      'company': 'Empresa',
      'user': 'Usuario',
      'operation_center': 'Centro de Operación',
      'employee': 'Empleado',
      'vacancy': 'Vacante',
      'candidate': 'Candidato',
    };
    return names[type] || type;
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const uniqueEntities = Array.from(new Set(logs.map(l => l.entity_type))).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Auditoría y Trazabilidad
          </h1>
          <p className="text-muted-foreground">Historial de acciones y cambios en el sistema</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Registro de Actividad</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuario o entidad..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Acción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="create">Creación</SelectItem>
                  <SelectItem value="update">Actualización</SelectItem>
                  <SelectItem value="delete">Eliminación</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueEntities.map(type => (
                    <SelectItem key={type} value={type}>{formatEntityName(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No se encontraron registros que coincidan con la búsqueda.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="font-medium">{new Date(log.created_at).toLocaleDateString('es-CO')}</div>
                        <div className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleTimeString('es-CO')}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{log.user_email || 'Sistema'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getActionColor(log.action)}>
                          {log.action.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatEntityName(log.entity_type)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.entity_name || log.entity_id || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8">
                              Ver datos
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-4">
                              <h4 className="font-medium text-sm">Detalles del Cambio</h4>
                              {log.old_values && Object.keys(log.old_values).length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-xs font-semibold text-rose-500">Valores Anteriores:</span>
                                  <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                                    {JSON.stringify(log.old_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_values && Object.keys(log.new_values).length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-xs font-semibold text-emerald-500">Nuevos Valores:</span>
                                  <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                                    {JSON.stringify(log.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {!log.old_values && !log.new_values && (
                                <p className="text-sm text-muted-foreground">No hay detalles adicionales.</p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
