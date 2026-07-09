import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Link2, QrCode, Copy, Trash2, Shield, Users, Clock, Building2, ClipboardCheck, ExternalLink, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QRCodeDialog } from '@/components/training';
import { useTrainingCourses, useTrainingAccessTokens, useCreateAccessToken, useToggleAccessToken } from '@/hooks/useTraining';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AccessType, TrainingAccessToken, UsageType } from '@/types/training';

const DEFAULT_ACCESS_TYPE: AccessType = 'link_cedula';
const DEFAULT_USAGE_TYPE: UsageType = 'multiple';
const DEFAULT_MAX_USES: number | undefined = undefined;
const DEFAULT_EXPIRES_IN_DAYS = 30;
const DEFAULT_REQUIRES_EVALUATION = true;

export default function GenerarAcceso() {
  const [searchParams] = useSearchParams();
  const preselectedCourseId = searchParams.get('courseId') || '';
  const { data: courses = [] } = useTrainingCourses();
  const { data: tokens = [] } = useTrainingAccessTokens();
  const { data: centers = [] } = useOperationCenters();
  const createToken = useCreateAccessToken();
  const toggleToken = useToggleAccessToken();
  const { isAdmin } = useAuth();
  const canEditLinkSettings = isAdmin;

  const [courseId, setCourseId] = useState(preselectedCourseId);
  const [accessType, setAccessType] = useState<AccessType>(DEFAULT_ACCESS_TYPE);
  const [usageType, setUsageType] = useState<UsageType>(DEFAULT_USAGE_TYPE);
  const [maxUses, setMaxUses] = useState<number | undefined>(DEFAULT_MAX_USES);
  const [expiresInDays, setExpiresInDays] = useState(DEFAULT_EXPIRES_IN_DAYS);
  const [requiresEvaluation, setRequiresEvaluation] = useState(DEFAULT_REQUIRES_EVALUATION);
  const [operationCenterId, setOperationCenterId] = useState<string>('');
  const [qrDialog, setQrDialog] = useState<{ url: string; title: string } | null>(null);

  const publishedCourses = courses.filter(c => c.status === 'publicado');

  const handleCreate = async () => {
    const effectiveAccessType = canEditLinkSettings ? accessType : DEFAULT_ACCESS_TYPE;
    const effectiveUsageType = canEditLinkSettings ? usageType : DEFAULT_USAGE_TYPE;
    const effectiveMaxUses = canEditLinkSettings ? maxUses : DEFAULT_MAX_USES;
    const effectiveExpiresInDays = canEditLinkSettings ? expiresInDays : DEFAULT_EXPIRES_IN_DAYS;
    const effectiveRequiresEvaluation = canEditLinkSettings ? requiresEvaluation : DEFAULT_REQUIRES_EVALUATION;

    if (!courseId) { toast.error('Seleccione una capacitación'); return; }
    try {
      await createToken.mutateAsync({
        courseId,
        accessType: effectiveAccessType,
        usageType: effectiveUsageType,
        maxUses: effectiveUsageType === 'multiple' ? effectiveMaxUses : undefined,
        expiresInDays: effectiveExpiresInDays,
        requiresEvaluation: effectiveRequiresEvaluation,
        operationCenterId: operationCenterId && operationCenterId !== 'sin_centro' ? operationCenterId : undefined,
      });
      toast.success('Enlace creado');
    } catch { toast.error('Error al crear enlace'); }
  };

  const getAccessUrl = (token: string) => `${window.location.origin}/capacitacion?token=${token}`;

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(getAccessUrl(token));
    toast.success('Enlace copiado');
  };

  const optionButtonClass = (selected: boolean) =>
    `rounded-2xl border-2 p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-100 ${
      selected
        ? 'border-primary bg-background shadow-inner'
        : canEditLinkSettings
          ? 'border-border/50 bg-background hover:border-primary/30'
          : 'border-border/50 bg-muted/30 text-muted-foreground'
    }`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border border-border/50 rounded-[2rem] shadow-sm mb-8">
        
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Generar Enlaces de Acceso</h1>
            <p className="text-muted-foreground font-medium mt-1">Crea enlaces temporales para que el personal acceda a las capacitaciones</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="border border-border/50 rounded-[2rem] bg-card p-8 shadow-sm space-y-6 h-fit bg-gradient-to-b from-background to-muted/10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
              <Link2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-xl">Nuevo Enlace de Acceso</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Configura los parámetros del enlace</p>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Capacitación */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Capacitación *</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="h-12 rounded-xl bg-background"><SelectValue placeholder="Selecciona una capacitación" /></SelectTrigger>
              <SelectContent className="rounded-xl">{publishedCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
           </div>

          {/* Centro de Operación */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-muted-foreground" /> Centro de Operación
            </Label>
            <Select value={operationCenterId} onValueChange={setOperationCenterId}>
              <SelectTrigger className="h-12 rounded-xl bg-background"><SelectValue placeholder="Selecciona un centro (opcional)" /></SelectTrigger>
              <SelectContent className="rounded-xl">
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
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-muted-foreground" /> Tipo de Acceso
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccessType('solo_link')}
                disabled={!canEditLinkSettings}
                className={optionButtonClass(accessType === 'solo_link')}
              >
                <span className="font-bold text-sm">Solo Link</span>
                <p className="text-xs text-muted-foreground mt-1">Acceso directo sin identificación</p>
              </button>
              <button
                type="button"
                onClick={() => setAccessType('link_cedula')}
                disabled={!canEditLinkSettings}
                className={optionButtonClass(accessType === 'link_cedula')}
              >
                <span className="font-bold text-sm">Link + Cédula</span>
                <p className="text-xs text-muted-foreground mt-1">Requiere nombre y cédula</p>
              </button>
            </div>
          </div>

          {/* Tipo de Uso */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" /> Tipo de Uso
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUsageType('unico')}
                disabled={!canEditLinkSettings}
                className={optionButtonClass(usageType === 'unico')}
              >
                <span className="font-bold text-sm">Uso Único</span>
                <p className="text-xs text-muted-foreground mt-1">Solo una persona puede usar el enlace</p>
              </button>
              <button
                type="button"
                onClick={() => setUsageType('multiple')}
                disabled={!canEditLinkSettings}
                className={optionButtonClass(usageType === 'multiple')}
              >
                <span className="font-bold text-sm">Múltiple</span>
                <p className="text-xs text-muted-foreground mt-1">Varias personas pueden usar el enlace</p>
              </button>
            </div>
          </div>

          {/* Máximo de usos */}
          {usageType === 'multiple' && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Máximo de Usos (opcional)</Label>
              <Input
                type="number"
                placeholder="Sin límite"
                className={`h-12 rounded-xl disabled:cursor-not-allowed disabled:opacity-100 ${canEditLinkSettings ? 'bg-background' : 'bg-muted/30'}`}
                value={maxUses ?? ''}
                onChange={e => setMaxUses(e.target.value ? Number(e.target.value) : undefined)}
                readOnly={!canEditLinkSettings}
                disabled={!canEditLinkSettings}
              />
              <p className="text-xs text-muted-foreground font-medium">Deja vacío para usos ilimitados</p>
            </div>
          )}

          {/* Expiración */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" /> Expiración
            </Label>
            <Select value={String(expiresInDays)} onValueChange={v => setExpiresInDays(Number(v))} disabled={!canEditLinkSettings}>
              <SelectTrigger className={`h-12 rounded-xl disabled:cursor-not-allowed disabled:opacity-100 ${canEditLinkSettings ? 'bg-background' : 'bg-muted/30'}`}><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {[1, 3, 7, 14, 30, 90].map(d => <SelectItem key={d} value={String(d)}>{d} días</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Evaluación */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" /> Evaluación Requerida
            </Label>
            <div className={`rounded-2xl border-2 p-4 flex items-center justify-between transition-all bg-background ${requiresEvaluation ? 'border-primary shadow-inner' : 'border-border/50'}`}>
              <div>
                <span className="font-bold text-sm">{requiresEvaluation ? 'Con Evaluación' : 'Sin Evaluación'}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {requiresEvaluation ? 'El operador debe aprobar la evaluación' : 'El operador puede firmar directamente después de leer'}
                </p>
              </div>
              <Switch checked={requiresEvaluation} onCheckedChange={setRequiresEvaluation} disabled={!canEditLinkSettings} />
            </div>
          </div>

          <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all mt-4" onClick={handleCreate} disabled={createToken.isPending}>
            <Link2 className="h-5 w-5 mr-2" /> Generar Enlace de Acceso
          </Button>
        </div>

        {/* List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-bold text-xl">Enlaces Creados</h2>
            <Badge variant="outline" className="bg-background rounded-full px-3">{tokens.length} enlaces</Badge>
          </div>

          <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 pb-4">
            {tokens.length === 0 && (
              <div className="border border-border/50 rounded-[2rem] p-12 text-center text-muted-foreground bg-card shadow-sm">
                <Link2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hay enlaces creados</p>
              </div>
            )}
            {(tokens as TrainingAccessToken[]).map(token => {
              const isExpired = new Date(token.expires_at) < new Date();
              const isActive = token.is_active && !isExpired;
              const maxReached = token.max_uses && token.uses_count >= token.max_uses;

              return (
                <div key={token.id} className={`border border-border/50 rounded-2xl bg-card p-5 space-y-4 shadow-sm hover:shadow-md transition-all ${!token.is_active ? 'opacity-50 pointer-events-none select-none grayscale-[50%]' : ''}`}>
                  {/* Header row */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-base leading-snug">{token.course?.name || 'Capacitación'}</h3>
                      {token.center && (
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {token.center.name}
                        </p>
                      )}
                      {token.course?.category && (
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
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
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl h-10 font-bold text-xs hover:bg-background"
                      onClick={() => handleCopy(token.token)}
                    >
                      <Copy className="h-4 w-4 mr-2" /> Copiar Enlace
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl hover:bg-background"
                      onClick={() => setQrDialog({ url: getAccessUrl(token.token), title: token.course?.name || 'QR' })}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl hover:bg-background"
                      onClick={() => window.open(getAccessUrl(token.token), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {token.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Desactivar enlace"
                        onClick={() => {
                          toggleToken.mutateAsync({ id: token.id, isActive: false })
                            .then(() => toast.success('Enlace desactivado'))
                            .catch(() => toast.error('Error al desactivar enlace'));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
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
