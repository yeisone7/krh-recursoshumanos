import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link2, QrCode, Copy, Trash2, ToggleLeft, ToggleRight, Plus, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QRCodeDialog } from '@/components/training';
import { useTrainingCourses, useTrainingAccessTokens, useCreateAccessToken, useToggleAccessToken, useDeleteAccessToken } from '@/hooks/useTraining';
import { toast } from 'sonner';
import type { TrainingAccessToken } from '@/types/training';

export default function GenerarAcceso() {
  const [searchParams] = useSearchParams();
  const preselectedCourseId = searchParams.get('courseId') || '';
  const { data: courses = [] } = useTrainingCourses();
  const { data: tokens = [] } = useTrainingAccessTokens();
  const createToken = useCreateAccessToken();
  const toggleToken = useToggleAccessToken();
  const deleteToken = useDeleteAccessToken();

  const [courseId, setCourseId] = useState(preselectedCourseId);
  const [accessType, setAccessType] = useState('solo_link');
  const [usageType, setUsageType] = useState('multiple');
  const [maxUses, setMaxUses] = useState<number | undefined>();
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [requiresEvaluation, setRequiresEvaluation] = useState(false);
  const [qrDialog, setQrDialog] = useState<{ url: string; title: string } | null>(null);

  const publishedCourses = courses.filter(c => c.status === 'publicado');

  const handleCreate = async () => {
    if (!courseId) { toast.error('Seleccione una capacitación'); return; }
    try {
      await createToken.mutateAsync({ courseId, accessType, usageType, maxUses, expiresInDays, requiresEvaluation });
      toast.success('Enlace creado');
    } catch { toast.error('Error al crear enlace'); }
  };

  const getAccessUrl = (token: string) => `${window.location.origin}/capacitaciones/acceso?token=${token}`;

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(getAccessUrl(token));
    toast.success('Enlace copiado');
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Enlaces de Acceso</h1><p className="text-muted-foreground">Genera enlaces para que el personal acceda a capacitaciones</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader><CardTitle>Crear Nuevo Enlace</CardTitle><CardDescription>Configure el acceso a la capacitación</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Capacitación *</Label>
              <Select value={courseId} onValueChange={setCourseId}><SelectTrigger><SelectValue placeholder="Seleccionar capacitación" /></SelectTrigger><SelectContent>{publishedCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
              {publishedCourses.length === 0 && <p className="text-xs text-muted-foreground mt-1">Solo se muestran capacitaciones publicadas</p>}
            </div>
            <div><Label>Tipo de Acceso</Label>
              <Select value={accessType} onValueChange={setAccessType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="solo_link">Solo Link</SelectItem><SelectItem value="link_cedula">Link + Cédula</SelectItem></SelectContent></Select>
            </div>
            <div><Label>Tipo de Uso</Label>
              <Select value={usageType} onValueChange={setUsageType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unico">Único</SelectItem><SelectItem value="multiple">Múltiple</SelectItem></SelectContent></Select>
            </div>
            {usageType === 'multiple' && <div><Label>Máximo de usos (opcional)</Label><Input type="number" value={maxUses || ''} onChange={e => setMaxUses(e.target.value ? Number(e.target.value) : undefined)} /></div>}
            <div><Label>Expiración</Label>
              <Select value={String(expiresInDays)} onValueChange={v => setExpiresInDays(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1, 3, 7, 14, 30, 90].map(d => <SelectItem key={d} value={String(d)}>{d} días</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="flex items-center gap-3"><Switch checked={requiresEvaluation} onCheckedChange={setRequiresEvaluation} /><Label>Evaluación Requerida</Label></div>
            <Button className="w-full" onClick={handleCreate} disabled={createToken.isPending}><Plus className="h-4 w-4 mr-2" /> Crear Enlace</Button>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader><CardTitle>Enlaces Creados</CardTitle><CardDescription>{tokens.length} enlaces</CardDescription></CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {tokens.length === 0 && <p className="text-center text-muted-foreground py-8">No hay enlaces creados</p>}
            {(tokens as TrainingAccessToken[]).map(token => {
              const isExpired = new Date(token.expires_at) < new Date();
              const isActive = token.is_active && !isExpired;
              const maxReached = token.max_uses && token.uses_count >= token.max_uses;
              return (
                <div key={token.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate flex-1">{token.course?.name || 'Capacitación'}</span>
                    <Badge variant={isActive && !maxReached ? 'default' : 'secondary'}>{isActive && !maxReached ? 'Activo' : isExpired ? 'Expirado' : maxReached ? 'Agotado' : 'Inactivo'}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">{token.access_type === 'link_cedula' ? <><Shield className="h-3 w-3" /> Link + Cédula</> : <><Link2 className="h-3 w-3" /> Solo Link</>}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {token.uses_count}{token.max_uses ? `/${token.max_uses}` : ''} usos</span>
                    <span>Exp: {format(parseISO(token.expires_at), 'dd/MM/yy')}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(token.token)}><Copy className="h-3 w-3 mr-1" /> Copiar</Button>
                    <Button variant="outline" size="sm" onClick={() => setQrDialog({ url: getAccessUrl(token.token), title: token.course?.name || 'QR' })}><QrCode className="h-3 w-3 mr-1" /> QR</Button>
                    <Button variant="outline" size="sm" onClick={() => toggleToken.mutateAsync({ id: token.id, isActive: !token.is_active })}>{token.is_active ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteToken.mutateAsync(token.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {qrDialog && <QRCodeDialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)} url={qrDialog.url} title={qrDialog.title} />}
    </div>
  );
}
