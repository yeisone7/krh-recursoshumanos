import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, History, Download, Plus, Loader2, Copy, Pencil, ListChecks, Building2 } from 'lucide-react';
import { usePositionProfiles } from '@/hooks/usePositionProfiles';
import { generatePositionProfilePdf } from '@/lib/positionProfilePdfGenerator';
import { PositionProfileFormDialog } from './PositionProfileFormDialog';
import { ClonePositionProfileDialog } from './ClonePositionProfileDialog';
import { PositionOnboardingTemplates } from '@/components/positions/PositionOnboardingTemplates';
import { ProfileAnnexesTab } from './ProfileAnnexesTab';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string;
  positionName: string;
  areaName?: string;
}

export function PositionProfileDetailDialog({ open, onOpenChange, positionId, positionName, areaName }: Props) {
  const { data: versions = [] } = usePositionProfiles(positionId);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'new_version' | 'edit'>('create');

  const current = versions.find((v: any) => v.is_current) || versions[0];
  const profile = selectedVersion || current;

  const handleExportPdf = async () => {
    if (!profile) return;
    setExporting(true);
    try {
      await generatePositionProfilePdf(profile, positionName, areaName);
    } finally {
      setExporting(false);
    }
  };

  const handleNewVersion = () => {
    setFormMode('new_version');
    setShowForm(true);
  };

  const handleEdit = () => {
    setFormMode('edit');
    setShowForm(true);
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h4 className="text-sm font-semibold text-primary mb-2">{children}</h4>
  );

  const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right max-w-[60%]">{value || '—'}</span>
    </div>
  );

  if (!profile && !showForm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle>Perfil del Cargo — {positionName}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Este cargo aún no tiene un perfil configurado.</p>
            <Button onClick={() => { setFormMode('create'); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />Crear Perfil
            </Button>
          </div>
          <PositionProfileFormDialog
            open={showForm}
            onOpenChange={setShowForm}
            positionId={positionId}
            positionName={positionName}
            mode="create"
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-4xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              <DialogTitle>Perfil del Cargo — {positionName}</DialogTitle>
              {profile && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Versión {profile.version}</Badge>
                  {profile.is_current && <Badge className="bg-success/10 text-success border-success/20">Vigente</Badge>}
                  {profile.effective_date && (
                    <span className="text-xs text-muted-foreground">
                      desde {format(new Date(profile.effective_date), 'dd MMM yyyy', { locale: es })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-0 border-t md:flex-row">
            {/* Sidebar versiones */}
            <div className="shrink-0 space-y-1 overflow-x-auto border-b bg-background p-3 md:w-48 md:overflow-visible md:border-b-0 md:border-r">
              <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-2">
                <History className="w-3 h-3" />Versiones
              </div>
              {versions.map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVersion(v)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                    (selectedVersion?.id || current?.id) === v.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-background text-muted-foreground'
                  }`}
                >
                  v{v.version} {v.is_current && '✓'}
                  <div className="text-[10px] opacity-70">
                    {format(new Date(v.created_at), 'dd/MM/yy')}
                  </div>
                </button>
              ))}
              <Separator className="my-2" />
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleEdit}>
                <Pencil className="w-3 h-3 mr-1" />Editar perfil
              </Button>
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleNewVersion}>
                <Plus className="w-3 h-3 mr-1" />Nueva versión
              </Button>
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleExportPdf} disabled={exporting}>
                {exporting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}Exportar PDF
              </Button>
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setShowClone(true)}>
                <Copy className="w-3 h-3 mr-1" />Clonar a otro cargo
              </Button>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Tabs defaultValue="profile" className="w-full">
                <div className="scrollbar-hide overflow-x-auto px-4 pt-4 pb-0 sm:px-5">
                  <TabsList className="h-8 min-w-max">
                    <TabsTrigger value="profile" className="text-xs gap-1"><FileText className="w-3 h-3" />Perfil</TabsTrigger>
                    <TabsTrigger value="onboarding" className="text-xs gap-1"><ListChecks className="w-3 h-3" />Onboarding</TabsTrigger>
                    <TabsTrigger value="annexes" className="text-xs gap-1"><Building2 className="w-3 h-3" />Anexos por Centro</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="profile">
              {profile && (
                <div className="p-5 space-y-5">
                  {/* Identificación */}
                  <Card>
                    <CardContent className="pt-4">
                      <SectionTitle>1. Identificación del Cargo</SectionTitle>
                      <InfoRow label="Objetivo" value={profile.purpose} />
                      <InfoRow label="Reporta a" value={profile.reports_to} />
                      <InfoRow label="Supervisa a" value={profile.supervises} />
                      <InfoRow label="N° de cargos" value={profile.num_positions} />
                    </CardContent>
                  </Card>

                  {/* Perfil */}
                  <Card>
                    <CardContent className="pt-4">
                      <SectionTitle>2. Perfil del Cargo</SectionTitle>
                      <InfoRow label="Educación" value={profile.education_level} />
                      <InfoRow label="Formación" value={profile.education_detail} />
                      <InfoRow label="Experiencia" value={profile.experience} />
                      {profile.specific_knowledge?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Conocimientos Específicos:</p>
                          {profile.specific_knowledge.map((k: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm py-0.5">
                              <span>{k.topic}</span>
                              <Badge variant="outline" className="text-[10px]">{k.level}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                      {profile.skills?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Competencias:</p>
                          {profile.skills.map((s: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm py-0.5">
                              <span>{s.name}</span>
                              <Badge variant="outline" className="text-[10px]">{s.level}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Funciones */}
                  {profile.functions?.length > 0 && (
                    <Card>
                      <CardContent className="pt-4">
                        <SectionTitle>3. Funciones del Cargo</SectionTitle>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                          {profile.functions.map((f: string, i: number) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>
                  )}

                  {/* Responsabilidades */}
                  {profile.responsibilities && Object.keys(profile.responsibilities).length > 0 && (
                    <Card>
                      <CardContent className="pt-4">
                        <SectionTitle>4. Responsabilidades</SectionTitle>
                        {[
                          ['equipment', 'Equipos'],
                          ['materials', 'Materiales'],
                          ['money', 'Dinero'],
                          ['information', 'Información'],
                          ['internal_relationships', 'Relaciones internas'],
                          ['external_relationships', 'Relaciones externas'],
                        ].map(([key, label]) => (
                          (profile.responsibilities as any)[key] && <InfoRow key={key} label={label} value={(profile.responsibilities as any)[key]} />
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Condiciones */}
                  {profile.working_conditions && Object.keys(profile.working_conditions).length > 0 && (
                    <Card>
                      <CardContent className="pt-4">
                        <SectionTitle>5. Condiciones de Trabajo</SectionTitle>
                        {[
                          ['physical_effort', 'Esfuerzo Físico'],
                          ['mental_effort', 'Esfuerzo Mental'],
                          ['work_environment', 'Ambiente de Trabajo'],
                          ['risks', 'Riesgos'],
                        ].map(([key, label]) => (
                          (profile.working_conditions as any)[key] && <InfoRow key={key} label={label} value={(profile.working_conditions as any)[key]} />
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Aprobaciones */}
                    <Card>
                    <CardContent className="pt-4">
                      <SectionTitle>6. Aprobaciones</SectionTitle>
                        <div className="grid grid-cols-1 gap-4 text-center text-sm sm:grid-cols-3">
                        <div><p className="text-muted-foreground">Elaborado por</p><p className="font-medium">{profile.elaborated_by || '—'}</p></div>
                        <div><p className="text-muted-foreground">Revisado por</p><p className="font-medium">{profile.reviewed_by || '—'}</p></div>
                        <div><p className="text-muted-foreground">Aprobado por</p><p className="font-medium">{profile.approved_by || '—'}</p></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
                </TabsContent>
                <TabsContent value="onboarding">
                  <div className="p-5">
                    <PositionOnboardingTemplates positionId={positionId} positionName={positionName} />
                  </div>
                </TabsContent>
                <TabsContent value="annexes">
                  <div className="p-5">
                    {profile && <ProfileAnnexesTab profileId={profile.id} baseProfile={profile} />}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PositionProfileFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        positionId={positionId}
        positionName={positionName}
        existingData={profile}
        mode={formMode}
      />

      {profile && (
        <ClonePositionProfileDialog
          open={showClone}
          onOpenChange={setShowClone}
          sourceProfile={profile}
          sourcePositionName={positionName}
        />
      )}
    </>
  );
}
