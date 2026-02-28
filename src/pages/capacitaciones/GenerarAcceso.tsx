import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Link2, QrCode, Copy, Trash2, Plus, Shield, Users, Clock, Building2, ClipboardCheck, ExternalLink, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QRCodeDialog } from '@/components/training';
import { useTrainingCourses, useTrainingAccessTokens, useCreateAccessToken, useToggleAccessToken, useDeleteAccessToken } from '@/hooks/useTraining';
import { useOperationCenters } from '@/hooks/useCompanies';
import { toast } from 'sonner';
import type { TrainingAccessToken } from '@/types/training';

export default function GenerarAcceso() {
  const [searchParams] = useSearchParams();
  const preselectedCourseId = searchParams.get('courseId') || '';
  const { data: courses = [] } = useTrainingCourses();
  const { data: tokens = [] } = useTrainingAccessTokens();
  const { data: centers = [] } = useOperationCenters();
  const createToken = useCreateAccessToken();
  const toggleToken = useToggleAccessToken();
  const deleteToken = useDeleteAccessToken();

  const [courseId, setCourseId] = useState(preselectedCourseId);
  const [accessType, setAccessType] = useState('solo_link');
  const [usageType, setUsageType] = useState('multiple');
  const [maxUses, setMaxUses] = useState<number | undefined>();
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [requiresEvaluation, setRequiresEvaluation] = useState(false);
  const [operationCenterId, setOperationCenterId] = useState<string>('');
  const [qrDialog, setQrDialog] = useState<{ url: string; title: string } | null>(null);

  const publishedCourses = courses.filter(c => c.status === 'publicado');

  const handleCreate = async () => {
    if (!courseId) { toast.error('Seleccione una capacitación'); return; }
    try {
      await createToken.mutateAsync({ courseId, accessType, usageType, maxUses, expiresInDays, requiresEvaluation, operationCenterId: operationCenterId && operationCenterId !== 'sin_centro' ? operationCenterId : undefined });
      toast.success('Enlace creado');
    } catch { toast.error('Error al crear enlace'); }
  };

  const getAccessUrl = (token: string) => `${window.location.origin}/capacitacion?token=${token}`;

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(getAccessUrl(token));
    toast.success('Enlace copiado');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generar Enlaces de Acceso</h1>
        <p className="text-muted-foreground text-sm">Crea enlaces temporales para que el personal acceda a las capacitaciones</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="border rounded-xl bg-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Nuevo Enlace de Acceso</h2>
              <p className="text-xs text-muted-foreground">Configura los parámetros del enlace</p>
            </div>
          </div>

          <Separator />

          {/* Capacitación */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Capacitación *</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="Selecciona una capacitación" /></SelectTrigger>
              <SelectContent>{publishedCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
           </div>

          {/* Centro de Operación */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Centro de Operación
            </Label>
            <Select value={operationCenterId} onValueChange={setOperationCenterId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un centro (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sin_centro">Sin centro específico</SelectItem>
                {centers.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="text-xs font-mono text-muted-foreground mr-2">{c.code || '—'}</span>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Acceso */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" /> Tipo de Acceso
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccessType('solo_link')}
                className={`rounded-lg border-2 p-4 text-left transition-all ${accessType === 'solo_link' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}
              >
                <span className="font-medium text-sm">Solo Link</span>
                <p className="text-xs text-muted-foreground mt-0.5">Acceso directo sin identificación</p>
              </button>
              <button
                type="button"
                onClick={() => setAccessType('link_cedula')}
                className={`rounded-lg border-2 p-4 text-left transition-all ${accessType === 'link_cedula' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}
              >
                <span className="font-medium text-sm">Link + Cédula</span>
                <p className="text-xs text-muted-foreground mt-0.5">Requiere nombre y cédula</p>
              </button>
            </div>
          </div>

          {/* Tipo de Uso */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" /> Tipo de Uso
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUsageType('unico')}
                className={`rounded-lg border-2 p-4 text-left transition-all ${usageType === 'unico' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}
              >
                <span className="font-medium text-sm">Uso Único</span>
                <p className="text-xs text-muted-foreground mt-0.5">Solo una persona puede usar el enlace</p>
              </button>
              <button
                type="button"
                onClick={() => setUsageType('multiple')}
                className={`rounded-lg border-2 p-4 text-left transition-all ${usageType === 'multiple' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}
              >
                <span className="font-medium text-sm">Múltiple</span>
                <p className="text-xs text-muted-foreground mt-0.5">Varias personas pueden usar el enlace</p>
              </button>
            </div>
          </div>

          {/* Máximo de usos */}
          {usageType === 'multiple' && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Máximo de Usos (opcional)</Label>
              <Input
                type="number"
                placeholder="Sin límite"
                value={maxUses || ''}
                onChange={e => setMaxUses(e.target.value ? Number(e.target.value) : undefined)}
              />
              <p className="text-xs text-muted-foreground">Deja vacío para usos ilimitados</p>
            </div>
          )}

          {/* Expiración */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Expiración
            </Label>
            <Select value={String(expiresInDays)} onValueChange={v => setExpiresInDays(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 3, 7, 14, 30, 90].map(d => <SelectItem key={d} value={String(d)}>{d} días</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Evaluación */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" /> Evaluación Requerida
            </Label>
            <div className={`rounded-lg border-2 p-4 flex items-center justify-between transition-all ${requiresEvaluation ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <div>
                <span className="font-medium text-sm">{requiresEvaluation ? 'Con Evaluación' : 'Sin Evaluación'}</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {requiresEvaluation ? 'El operador debe aprobar la evaluación' : 'El operador puede firmar directamente después de leer'}
                </p>
              </div>
              <Switch checked={requiresEvaluation} onCheckedChange={setRequiresEvaluation} />
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={handleCreate} disabled={createToken.isPending}>
            <Link2 className="h-4 w-4 mr-2" /> Generar Enlace de Acceso
          </Button>
        </div>

        {/* List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Enlaces Creados</h2>
            <Badge variant="secondary">{tokens.length} enlaces</Badge>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {tokens.length === 0 && (
              <div className="border rounded-xl p-8 text-center text-muted-foreground bg-card">
                <Link2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No hay enlaces creados</p>
              </div>
            )}
            {(tokens as TrainingAccessToken[]).map(token => {
              const isExpired = new Date(token.expires_at) < new Date();
              const isActive = token.is_active && !isExpired;
              const maxReached = token.max_uses && token.uses_count >= token.max_uses;

              return (
                <div key={token.id} className={`border rounded-xl bg-card p-4 space-y-3 transition-opacity ${!token.is_active ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                  {/* Header row */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{token.course?.name || 'Capacitación'}</h3>
                      {token.center && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {token.center.name}
                        </p>
                      )}
                      {token.course?.category && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {token.course.category}
                        </p>
                      )}
                    </div>
                    <div className="pointer-events-auto">
                      <Switch
                        checked={token.is_active}
                        onCheckedChange={(checked) => {
                          toggleToken.mutateAsync({ id: token.id, isActive: checked })
                            .then(() => toast.success(checked ? 'Enlace activado' : 'Enlace desactivado'))
                            .catch(() => toast.error('Error al cambiar estado del enlace'));
                        }}
                      />
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {!token.is_active && (
                      <Badge variant="destructive" className="text-xs">
                        Inhabilitado
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {token.access_type === 'link_cedula' ? 'Link + Cédula' : 'Solo Link'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {token.usage_type === 'multiple' ? 'Múltiple' : 'Único'}
                    </Badge>
                    {token.requires_evaluation && (
                      <Badge className="text-xs bg-primary/15 text-primary border-0 hover:bg-primary/20">
                        <ClipboardCheck className="h-3 w-3 mr-1" /> Evaluación
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {token.uses_count}{token.max_uses ? `/${token.max_uses}` : ''} usos
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {isExpired ? (
                        <span className="text-destructive">Expirado</span>
                      ) : maxReached ? (
                        <span className="text-destructive">Agotado</span>
                      ) : (
                        <span>Exp: {format(parseISO(token.expires_at), 'dd/MM/yy')}</span>
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleCopy(token.token)}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar Enlace
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setQrDialog({ url: getAccessUrl(token.token), title: token.course?.name || 'QR' })}
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => window.open(getAccessUrl(token.token), '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    {token.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        title="Desactivar enlace"
                        onClick={() => {
                          toggleToken.mutateAsync({ id: token.id, isActive: false })
                            .then(() => toast.success('Enlace desactivado'))
                            .catch(() => toast.error('Error al desactivar enlace'));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {qrDialog && <QRCodeDialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)} url={qrDialog.url} title={qrDialog.title} />}
    </div>
  );
}
