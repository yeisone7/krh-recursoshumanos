import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Copy, Ban, Link2, CheckCircle, Clock, XCircle, Trash2, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  useRegistrationTokens,
  useDeactivateRegistrationToken,
  useDeleteRegistrationToken,
  useUpdateRegistrationTokenName,
} from '@/hooks/useRegistrationTokens';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  vacancyId?: string;
  targetType?: 'candidate' | 'employee';
}

export function RegistrationTokensList({ vacancyId, targetType }: Props) {
  const { companies, currentCompanyId } = useAuth();
  const currentCompany = companies.find(c => c.id === currentCompanyId);
  const { data: allTokens = [], isLoading } = useRegistrationTokens(vacancyId);
  const tokens = useMemo(() => {
    let filtered = allTokens;
    if (currentCompanyId) {
      filtered = filtered.filter(t => t.company_id === currentCompanyId);
    }
    if (targetType) {
      filtered = filtered.filter(t => t.target_type === targetType);
    }
    return filtered;
  }, [allTokens, currentCompanyId, targetType]);
  const deactivate = useDeactivateRegistrationToken();
  const deleteToken = useDeleteRegistrationToken();
  const updateName = useUpdateRegistrationTokenName();
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const getStatus = (token: typeof tokens[0]) => {
    if (token.is_used) return 'used';
    if (new Date(token.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  const statusConfig = {
    active: { label: 'Activo', icon: Clock, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    used: { label: 'Utilizado', icon: CheckCircle, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    expired: { label: 'Expirado', icon: XCircle, className: 'bg-background text-muted-foreground' },
  };

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/registro?token=${token}`);
    toast.success('Enlace copiado');
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivate.mutateAsync(id);
      toast.success('Enlace desactivado');
    } catch {
      toast.error('Error al desactivar');
    }
  };

  const startEditing = (id: string, currentName: string | null) => {
    setEditingTokenId(id);
    setDraftName(currentName || '');
  };

  const cancelEditing = () => {
    setEditingTokenId(null);
    setDraftName('');
  };

  const handleSaveName = async (id: string) => {
    try {
      await updateName.mutateAsync({ tokenId: id, name: draftName });
      toast.success(draftName.trim() ? 'Nombre actualizado' : 'Nombre removido');
      cancelEditing();
    } catch {
      toast.error('Error al guardar el nombre');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-muted shrink-0" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
            </div>
            <div className="h-8 w-8 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-6 bg-background rounded-lg">
        <Link2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No hay enlaces generados</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tokens.map(token => {
        const status = getStatus(token);
        const config = statusConfig[status];
        const StatusIcon = config.icon;
        const tokenSuffix = token.token.slice(-8);
        const tokenName = token.name?.trim();

        return (
          <div
            key={token.id}
            className="flex flex-col gap-3 p-3 rounded-lg border bg-card sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-md bg-background flex items-center justify-center shrink-0 overflow-hidden border">
                {currentCompany?.logo_url ? (
                  <img src={currentCompany.logo_url} alt={currentCompany.name} className="w-full h-full object-contain" />
                ) : (
                  <Link2 className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {editingTokenId === token.id ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleSaveName(token.id);
                        if (event.key === 'Escape') cancelEditing();
                      }}
                      placeholder="Nombre del enlace"
                      maxLength={80}
                      autoFocus
                      className="h-9"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveName(token.id)}
                        disabled={updateName.isPending}
                        title="Guardar nombre"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={cancelEditing} title="Cancelar">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tokenName || `Enlace ...${tokenSuffix}`}
                    </p>
                    <Badge className={`text-xs shrink-0 ${config.className}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {tokenName ? `Token ...${tokenSuffix} | ` : ''}
                  Creado {format(new Date(token.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                  {' | '}Expira {format(new Date(token.expires_at), 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEditing(token.id, token.name)}
                title="Nombrar enlace"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              {status === 'active' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(token.token)} title="Copiar enlace">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeactivate(token.id)}
                    title="Desactivar"
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={async () => {
                  try {
                    await deleteToken.mutateAsync(token.id);
                    toast.success('Enlace eliminado');
                  } catch {
                    toast.error('Error al eliminar');
                  }
                }}
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
