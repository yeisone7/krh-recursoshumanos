import { useState, useRef } from 'react';
import { format, differenceInYears, differenceInMonths, differenceInDays, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Briefcase, 
  Building, 
  Heart,
  FileText,
  Stethoscope,
  AlertCircle,
  CheckCircle,
  Loader2,
  Pencil,
  CreditCard,
  Shield,
  Clock,
  Syringe,
  Award,
  Users as UsersIcon,
  Plus,
  Trash2,
  ExternalLink,
  CalendarClock,
  RotateCcw,
  Cake,
  BadgeCheck,
  Droplets,
  Hash,
  Globe,
  Camera,
  Upload,
  AlertTriangle,
  History,
  ScrollText
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useEmployee } from '@/hooks/useEmployees';
import { useDeleteCertification, useDeleteVaccination, useDeleteDocument } from '@/hooks/useEmployeeHealth';
import { useContracts } from '@/hooks/useContracts';
import { useWorkInfoHistory } from '@/hooks/useWorkInfoHistory';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { CertificationFormDialog } from './CertificationFormDialog';
import { VaccinationFormDialog } from './VaccinationFormDialog';
import { DocumentFormDialog } from './DocumentFormDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  documentTypeLabels,
  genderLabels,
  maritalStatusLabels,
  linkTypeLabels,
  riskLevelLabels,
  accountTypeLabels,
  payrollTypeLabels,
  certificationTypeLabels,
  vaccineTypeLabels,
  employeeDocumentTypeLabels,
  getEmployeeFullName,
} from '@/types/employee';

interface EmployeeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
}

function InfoItem({ icon: Icon, label, value, className }: { icon?: any; label: string; value?: string | null; className?: string }) {
  if (!value) return null;
  return (
    <div className={cn("flex items-start gap-3 py-2.5", className)}>
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-none mb-1">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MetricChip({ icon: Icon, label, value, color = 'primary' }: { icon: any; label: string; value: string; color?: string }) {
  const colorClasses: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    secondary: 'text-secondary bg-secondary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    info: 'text-info bg-info/10',
    destructive: 'text-destructive bg-destructive/10',
    teal: 'text-teal bg-teal/10',
    violet: 'text-violet bg-violet/10',
  };

  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card flex-1 min-w-0">
      <div className={cn("p-2 rounded-lg", colorClasses[color] || colorClasses.primary)}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-[11px] text-muted-foreground leading-tight text-center">{label}</span>
      <span className="text-sm font-bold text-foreground text-center leading-tight truncate w-full">{value}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, action }: { title: string; icon: any; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card className="border border-border shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            {title}
          </h3>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function computeSeniority(hireDate: string): string {
  const hire = new Date(hireDate);
  const now = new Date();
  const years = differenceInYears(now, hire);
  const months = differenceInMonths(now, hire) % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} año${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mes${months > 1 ? 'es' : ''}`);
  if (parts.length === 0) {
    const days = differenceInDays(now, hire);
    return `${days} día${days !== 1 ? 's' : ''}`;
  }
  return parts.join(', ');
}

function computeAge(birthDate: string): string {
  return `${differenceInYears(new Date(), new Date(birthDate))} años`;
}

// ── Expiring Items Alert ──
function ExpiringItemsAlert({ employee }: { employee: any }) {
  const now = new Date();
  const alerts: { label: string; name: string; daysLeft: number }[] = [];

  // Check certifications
  employee.certifications?.forEach((cert: any) => {
    if (cert.expiry_date) {
      const days = differenceInCalendarDays(new Date(cert.expiry_date), now);
      if (days <= 30) {
        alerts.push({
          label: 'Certificación',
          name: certificationTypeLabels[cert.certification_type as keyof typeof certificationTypeLabels] || cert.certification_type,
          daysLeft: days,
        });
      }
    }
  });

  // Check documents
  employee.documents?.forEach((doc: any) => {
    if (doc.expiry_date) {
      const days = differenceInCalendarDays(new Date(doc.expiry_date), now);
      if (days <= 30) {
        alerts.push({
          label: 'Documento',
          name: doc.document_name || employeeDocumentTypeLabels[doc.document_type as keyof typeof employeeDocumentTypeLabels] || doc.document_type,
          daysLeft: days,
        });
      }
    }
  });

  // Check residence letter
  if (employee.contact?.residence_letter_expiry) {
    const days = differenceInCalendarDays(new Date(employee.contact.residence_letter_expiry), now);
    if (days <= 30) {
      alerts.push({ label: 'Documento', name: 'Carta de Residencia', daysLeft: days });
    }
  }

  if (alerts.length === 0) return null;

  // Sort most urgent first
  alerts.sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <Card className="border-warning/40 bg-warning/5 shadow-none">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-md bg-warning/15">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          </div>
          <span className="text-sm font-semibold text-foreground">Alertas de Vencimiento ({alerts.length})</span>
        </div>
        <div className="space-y-1.5">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md bg-background/80">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{a.label}:</span> {a.name}
              </span>
              <Badge
                variant={a.daysLeft < 0 ? 'destructive' : a.daysLeft <= 7 ? 'destructive' : 'secondary'}
                className="text-[10px] h-5"
              >
                {a.daysLeft < 0 ? 'Vencido' : a.daysLeft === 0 ? 'Vence hoy' : `${a.daysLeft}d`}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Contract Summary Card ──
function ContractSummaryCard({ employeeId }: { employeeId: string }) {
  const { data: allContracts, isLoading } = useContracts();

  if (isLoading) return null;

  const empContracts = allContracts?.filter((c: any) => c.employee_id === employeeId) || [];
  const activeContracts = empContracts.filter((c: any) => !c.is_terminated);
  const terminatedCount = empContracts.length - activeContracts.length;

  if (!empContracts?.length) return null;

  return (
    <SectionCard title="Contratos" icon={ScrollText}>
      <div className="space-y-2">
        {activeContracts.length > 0 ? (
          activeContracts.map((c: any) => {
            const daysToEnd = c.end_date ? differenceInCalendarDays(new Date(c.end_date), new Date()) : null;
            return (
              <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.contract_type}</span>
                    <Badge className="bg-success/10 text-success border-success/20 text-[10px] h-5">Vigente</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {c.contract_number && `${c.contract_number} • `}
                    Desde {format(new Date(c.start_date), 'dd MMM yyyy', { locale: es })}
                    {c.end_date && ` hasta ${format(new Date(c.end_date), 'dd MMM yyyy', { locale: es })}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">
                    ${Number(c.salary).toLocaleString('es-CO')}
                  </span>
                  {daysToEnd !== null && daysToEnd <= 30 && daysToEnd >= 0 && (
                    <Badge variant="destructive" className="text-[10px] h-5 ml-2">
                      {daysToEnd}d
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">Sin contratos activos</p>
        )}
        {terminatedCount > 0 && (
          <p className="text-xs text-muted-foreground pt-1">
            + {terminatedCount} contrato{terminatedCount > 1 ? 's' : ''} finalizado{terminatedCount > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </SectionCard>
  );
}

// ── Work Info History ──
function WorkInfoHistoryCard({ employeeId }: { employeeId: string }) {
  const { data: history, isLoading } = useWorkInfoHistory(employeeId);

  if (isLoading || !history?.length || history.length <= 1) return null;

  // Show historical records (not the current one)
  const pastRecords = history.filter((r: any) => !r.is_current).slice(0, 5);

  if (pastRecords.length === 0) return null;

  return (
    <SectionCard title="Historial de Cambios" icon={History}>
      <div className="space-y-2">
        {pastRecords.map((record: any, i: number) => (
          <div key={record.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50 relative">
            {i < pastRecords.length - 1 && (
              <div className="absolute left-[21px] top-[36px] bottom-[-8px] w-px bg-border" />
            )}
            <div className="p-1.5 rounded-full bg-muted shrink-0 z-10">
              <Briefcase className="w-3 h-3 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{record.position_name}</p>
              <p className="text-xs text-muted-foreground">
                {record.areas?.name && `${record.areas.name} • `}
                {record.operation_centers?.name && `${record.operation_centers.name}`}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {format(new Date(record.valid_from), 'dd MMM yyyy', { locale: es })}
                {record.valid_to && ` → ${format(new Date(record.valid_to), 'dd MMM yyyy', { locale: es })}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function EmployeeDetailDialog({ open, onOpenChange, employeeId }: EmployeeDetailDialogProps) {
  const { data: employee, isLoading, refetch } = useEmployee(employeeId || undefined);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCertFormOpen, setIsCertFormOpen] = useState(false);
  const [isVacFormOpen, setIsVacFormOpen] = useState(false);
  const [isDocFormOpen, setIsDocFormOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const deleteCertification = useDeleteCertification();
  const deleteVaccination = useDeleteVaccination();
  const deleteDocument = useDeleteDocument();

  if (!employeeId) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employeeId) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'Solo imágenes JPG, PNG o WebP', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Máximo 5MB', variant: 'destructive' });
      return;
    }

    try {
      setUploadingAvatar(true);
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${employeeId}/avatar_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

      await supabase.from('employees_v2').update({ avatar_url: urlData.publicUrl }).eq('id', employeeId);
      refetch();
      toast({ title: 'Foto actualizada' });
    } catch (err: any) {
      toast({ title: 'Error al subir foto', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteCertification = async (certId: string) => {
    try {
      await deleteCertification.mutateAsync({ id: certId, employeeId });
      toast({ title: 'Certificación eliminada' });
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const handleDeleteVaccination = async (vacId: string) => {
    try {
      await deleteVaccination.mutateAsync({ id: vacId, employeeId });
      toast({ title: 'Vacuna eliminada' });
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocument.mutateAsync({ id: docId, employeeId });
      toast({ title: 'Documento eliminado' });
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const employeeFullName = employee ? getEmployeeFullName(employee) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0 [&>button]:text-white [&>button]:hover:text-white/80">
        <div className="max-h-[90vh] overflow-y-auto scrollbar-themed">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !employee ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No se encontró el empleado</p>
          </div>
        ) : (
          <>
            {/* ── HEADER ── */}
            <div className="gradient-primary px-6 pt-6 pb-5 rounded-t-xl relative">
              <div className="flex items-start gap-4">
                {/* Avatar with upload overlay */}
                <div className="relative group shrink-0">
                  <Avatar className="w-16 h-16 border-2 border-primary-foreground/30">
                    <AvatarImage src={employee.avatar_url || undefined} alt={employeeFullName} />
                    <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xl font-bold">
                      {employee.first_name[0]}{employee.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className={cn(
                      "text-[11px] border-primary-foreground/30",
                      employee.is_active 
                        ? 'bg-success/80 text-primary-foreground border-success/50'
                        : 'bg-destructive/80 text-primary-foreground border-destructive/50'
                    )}>
                      {employee.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {employee.work_info?.link_type && (
                      <Badge variant="outline" className="text-[11px] text-primary-foreground/90 border-primary-foreground/30 bg-primary-foreground/10">
                        {linkTypeLabels[employee.work_info.link_type]}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl font-display font-bold text-primary-foreground leading-tight">
                    {employeeFullName}
                  </h2>
                  <p className="text-primary-foreground/80 text-sm mt-0.5">
                    {employee.work_info?.position_name || 'Sin cargo asignado'}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-primary-foreground/70 text-xs flex-wrap">
                    {employee.operation_centers?.name && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {employee.operation_centers.name}
                      </span>
                    )}
                    {employee.areas?.name && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {employee.areas.name}
                      </span>
                    )}
                    {employee.work_info?.hire_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Desde {format(new Date(employee.work_info.hire_date), "MMM yyyy", { locale: es })}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsEditOpen(true)}
                  className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* ── QUICK METRICS ── */}
            <div className="px-6 -mt-3 relative z-10">
              <div className="flex gap-2 pb-1">
                {employee.work_info?.hire_date && (
                  <MetricChip icon={Clock} label="Antigüedad" value={computeSeniority(employee.work_info.hire_date)} color="primary" />
                )}
                {employee.birth_date && (
                  <MetricChip icon={Cake} label="Edad" value={computeAge(employee.birth_date)} color="secondary" />
                )}
                {employee.document_number && (
                  <MetricChip icon={Hash} label={documentTypeLabels[employee.document_type]} value={employee.document_number} color="info" />
                )}
                {employee.blood_type && (
                  <MetricChip icon={Droplets} label="Tipo Sangre" value={employee.blood_type} color="destructive" />
                )}
                {employee.social_security?.risk_level && (
                  <MetricChip icon={Shield} label="Nivel Riesgo" value={riskLevelLabels[employee.social_security.risk_level].replace('Nivel ', '')} color="warning" />
                )}
              </div>
            </div>

            {/* ── EXPIRING ALERTS ── */}
            <div className="px-6 pt-3">
              <ExpiringItemsAlert employee={employee} />
            </div>

            {/* ── TABS ── */}
            <div className="px-6 pb-6 pt-4">
              <Tabs defaultValue="identity" className="w-full">
                <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-lg h-auto flex-wrap gap-0.5">
                  <TabsTrigger value="identity" className="text-xs rounded-md px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Identidad
                  </TabsTrigger>
                  <TabsTrigger value="labor" className="text-xs rounded-md px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Laboral
                  </TabsTrigger>
                  <TabsTrigger value="security" className="text-xs rounded-md px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    SS & Banco
                  </TabsTrigger>
                  <TabsTrigger value="timemode" className="text-xs rounded-md px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Modalidad
                  </TabsTrigger>
                  <TabsTrigger value="health" className="text-xs rounded-md px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Salud
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs rounded-md px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Docs
                  </TabsTrigger>
                  <TabsTrigger value="family" className="text-xs rounded-md px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Familia
                  </TabsTrigger>
                </TabsList>

                {/* ── IDENTITY TAB ── */}
                <TabsContent value="identity" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SectionCard title="Documento de Identidad" icon={FileText}>
                      <div className="divide-y divide-border">
                        <InfoItem label="Tipo de Documento" value={documentTypeLabels[employee.document_type] || employee.document_type} />
                        <InfoItem label="Número" value={employee.document_number} />
                        <InfoItem label="Expedido en" value={employee.document_issue_city} />
                        {employee.document_issue_date && (
                          <InfoItem label="Fecha de Expedición" value={format(new Date(employee.document_issue_date), 'PPP', { locale: es })} />
                        )}
                      </div>
                    </SectionCard>

                    <SectionCard title="Información Personal" icon={User}>
                      <div className="divide-y divide-border">
                        {employee.birth_date && (
                          <InfoItem label="Fecha de Nacimiento" value={`${format(new Date(employee.birth_date), 'PPP', { locale: es })} (${computeAge(employee.birth_date)})`} />
                        )}
                        <InfoItem label="Lugar de Nacimiento" value={
                          [employee.birth_city, employee.birth_department, employee.birth_country !== 'Colombia' ? employee.birth_country : null].filter(Boolean).join(', ') || null
                        } />
                        {employee.gender && <InfoItem label="Género" value={genderLabels[employee.gender]} />}
                        {employee.blood_type && <InfoItem label="Tipo de Sangre" value={employee.blood_type} />}
                        {employee.marital_status && <InfoItem label="Estado Civil" value={maritalStatusLabels[employee.marital_status]} />}
                      </div>
                    </SectionCard>
                  </div>

                  {/* Contact Info */}
                  {employee.contact && (
                    <SectionCard title="Contacto" icon={Phone}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                        <div className="divide-y divide-border">
                          <InfoItem icon={Mail} label="Correo Corporativo" value={employee.contact.email} />
                          <InfoItem icon={Mail} label="Correo Personal" value={employee.contact.personal_email} />
                          <InfoItem icon={Phone} label="Teléfono Fijo" value={employee.contact.phone} />
                          <InfoItem icon={Phone} label="Celular" value={employee.contact.mobile} />
                        </div>
                        <div className="divide-y divide-border">
                          <InfoItem icon={MapPin} label="Dirección" value={employee.contact.residence_address} />
                          <InfoItem icon={Globe} label="Ciudad / Departamento" value={
                            [employee.contact.residence_city, employee.contact.residence_department].filter(Boolean).join(', ') || null
                          } />
                          <InfoItem icon={MapPin} label="Barrio" value={employee.contact.residence_neighborhood} />
                        </div>
                      </div>
                    </SectionCard>
                  )}

                  {/* Emergency Contact */}
                  {employee.contact?.emergency_contact_name && (
                    <Card className="border-warning/30 bg-warning-light/30 shadow-none">
                      <CardContent className="p-4">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                          <div className="p-1.5 rounded-md bg-warning/15">
                            <AlertCircle className="w-3.5 h-3.5 text-warning" />
                          </div>
                          Contacto de Emergencia
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <InfoItem label="Nombre" value={employee.contact.emergency_contact_name} />
                          <InfoItem label="Relación" value={employee.contact.emergency_contact_relationship} />
                          <InfoItem label="Teléfono" value={employee.contact.emergency_contact_phone} />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ── LABOR TAB ── */}
                <TabsContent value="labor" className="space-y-4 mt-4">
                  {employee.work_info && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SectionCard title="Datos Laborales" icon={Briefcase}>
                          <div className="divide-y divide-border">
                            <InfoItem label="Cargo" value={employee.work_info.position_name} />
                            <InfoItem label="Área" value={employee.areas?.name} />
                            <InfoItem label="Tipo de Vinculación" value={linkTypeLabels[employee.work_info.link_type]} />
                            <InfoItem label="Fecha de Ingreso" value={format(new Date(employee.work_info.hire_date), 'PPP', { locale: es })} />
                            <InfoItem label="Antigüedad" value={computeSeniority(employee.work_info.hire_date)} />
                            <InfoItem label="Ciudad de Trabajo" value={employee.work_info.work_city} />
                            <InfoItem label="Centro de Costos" value={employee.work_info.cost_center} />
                          </div>
                        </SectionCard>

                        <div className="space-y-4">
                          <SectionCard title="Centro de Operación" icon={Building}>
                            <div className="divide-y divide-border">
                              <InfoItem label="Nombre" value={employee.operation_centers?.name} />
                              <InfoItem label="Ciudad" value={employee.operation_centers?.city} />
                            </div>
                          </SectionCard>

                          {employee.schedule && (
                            <SectionCard title="Jornada y Nómina" icon={Clock}>
                              <div className="divide-y divide-border">
                                <InfoItem label="Tipo de Nómina" value={payrollTypeLabels[employee.schedule.payroll_type]} />
                                <InfoItem label="Horario" value={employee.schedule.is_office_schedule ? 'Oficina' : 'Turnos'} />
                                <InfoItem label="Día de Descanso" value={employee.schedule.rest_day} />
                              </div>
                            </SectionCard>
                          )}
                        </div>
                      </div>

                      {/* Contracts Summary */}
                      <ContractSummaryCard employeeId={employee.id} />

                      {/* Work Info History */}
                      <WorkInfoHistoryCard employeeId={employee.id} />

                      {employee.work_info.observations && (
                        <SectionCard title="Observaciones" icon={FileText}>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{employee.work_info.observations}</p>
                        </SectionCard>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* ── SECURITY & BANK TAB ── */}
                <TabsContent value="security" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {employee.social_security && (
                      <SectionCard title="Seguridad Social" icon={Shield}>
                        <div className="divide-y divide-border">
                          {employee.social_security.risk_level && (
                            <InfoItem label="Nivel de Riesgo" value={riskLevelLabels[employee.social_security.risk_level]} />
                          )}
                          <InfoItem label="EPS" value={employee.social_security.eps} />
                          <InfoItem label="AFP" value={employee.social_security.afp} />
                          <InfoItem label="ARL" value={employee.social_security.arl} />
                          <InfoItem label="Caja de Compensación" value={employee.social_security.ccf} />
                          <InfoItem label="AFC" value={employee.social_security.afc} />
                          <InfoItem label="IPS" value={employee.social_security.ips} />
                        </div>
                      </SectionCard>
                    )}

                    {employee.bank_info && (
                      <SectionCard title="Información Bancaria" icon={CreditCard}>
                        <div className="divide-y divide-border">
                          <InfoItem label="Banco" value={employee.bank_info.bank_name} />
                          {employee.bank_info.account_type && (
                            <InfoItem label="Tipo de Cuenta" value={accountTypeLabels[employee.bank_info.account_type]} />
                          )}
                          <InfoItem label="Número de Cuenta" value={employee.bank_info.account_number} />
                          <div className="flex items-center gap-2 py-2.5">
                            {employee.bank_info.account_registered ? (
                              <Badge className="bg-success/10 text-success border-success/20 gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Cuenta Verificada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-warning-light text-warning-foreground border-warning/20 gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Pendiente Verificación
                              </Badge>
                            )}
                          </div>
                        </div>
                      </SectionCard>
                    )}
                  </div>
                </TabsContent>

                {/* ── MODALIDAD TAB ── */}
                <TabsContent value="timemode" className="space-y-4 mt-4">
                  {employee.time_config ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">Modalidad:</span>
                        <Badge 
                          variant={employee.time_config.mode === 'administrative' ? 'default' : 'secondary'}
                          className="flex items-center gap-1"
                        >
                          {employee.time_config.mode === 'administrative' ? (
                            <><Briefcase className="w-3 h-3" /> Horario Administrativo</>
                          ) : (
                            <><RotateCcw className="w-3 h-3" /> Turnos Operativos</>
                          )}
                        </Badge>
                      </div>

                      {employee.time_config.mode === 'administrative' && employee.time_config.work_schedules && (
                        <SectionCard title={employee.time_config.work_schedules.name} icon={CalendarClock}>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground block text-xs">Días</span>
                              <span className="font-medium">
                                {employee.time_config.work_schedules.days_of_week
                                  ?.map((d: number) => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d])
                                  .join(', ') || '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-xs">Entrada</span>
                              <span className="font-medium">{employee.time_config.work_schedules.start_time?.slice(0, 5)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-xs">Salida</span>
                              <span className="font-medium">{employee.time_config.work_schedules.end_time?.slice(0, 5)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-xs">Descanso</span>
                              <span className="font-medium">{employee.time_config.work_schedules.break_minutes} min</span>
                            </div>
                          </div>
                        </SectionCard>
                      )}

                      {employee.time_config.mode === 'shift' && employee.time_config.shift_cycles && (
                        <SectionCard title={employee.time_config.shift_cycles.name} icon={RotateCcw}>
                          <div className="flex items-center gap-3">
                            {employee.time_config.shift_cycles.code && (
                              <Badge variant="outline">{employee.time_config.shift_cycles.code}</Badge>
                            )}
                            <span className="text-sm">
                              <span className="text-muted-foreground">Duración:</span>
                              <span className="font-medium ml-1">{employee.time_config.shift_cycles.total_days} días</span>
                            </span>
                          </div>
                        </SectionCard>
                      )}

                      <SectionCard title="Vigencia" icon={Calendar}>
                        <InfoItem label="Vigente desde" value={format(new Date(employee.time_config.start_date), 'PPP', { locale: es })} />
                        {employee.time_config.notes && (
                          <InfoItem label="Notas" value={employee.time_config.notes} />
                        )}
                      </SectionCard>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No hay configuración de modalidad registrada</p>
                    </div>
                  )}
                </TabsContent>

                {/* ── HEALTH TAB ── */}
                <TabsContent value="health" className="space-y-4 mt-4">
                  <SectionCard 
                    title="Certificaciones y Licencias" 
                    icon={Award}
                    action={
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsCertFormOpen(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                      </Button>
                    }
                  >
                    {employee.certifications && employee.certifications.length > 0 ? (
                      <div className="space-y-2">
                        {employee.certifications.map((cert) => (
                          <div key={cert.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 group hover:bg-muted/80 transition-colors">
                            <div>
                              <span className="font-medium text-sm">
                                {certificationTypeLabels[cert.certification_type]}
                                {cert.license_category && ` (${cert.license_category})`}
                              </span>
                              {cert.issue_date && (
                                <span className="text-xs text-muted-foreground block">
                                  Emitido: {format(new Date(cert.issue_date), 'PP', { locale: es })}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {cert.expiry_date && (
                                <Badge variant={new Date(cert.expiry_date) < new Date() ? 'destructive' : 'outline'} className="text-[11px]">
                                  Vence: {format(new Date(cert.expiry_date), 'PP', { locale: es })}
                                </Badge>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteCertification(cert.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">Sin certificaciones registradas</p>
                    )}
                  </SectionCard>

                  <SectionCard 
                    title="Historial de Vacunación" 
                    icon={Syringe}
                    action={
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsVacFormOpen(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                      </Button>
                    }
                  >
                    {employee.vaccinations && employee.vaccinations.length > 0 ? (
                      <div className="space-y-2">
                        {employee.vaccinations.map((vac) => (
                          <div key={vac.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 group hover:bg-muted/80 transition-colors">
                            <div>
                              <span className="font-medium text-sm">
                                {vaccineTypeLabels[vac.vaccine_type]} - Dosis {vac.dose_number}
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                Aplicada: {format(new Date(vac.application_date), 'PP', { locale: es })}
                                {vac.provider && ` • ${vac.provider}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {vac.next_dose_date && (
                                <Badge variant="outline" className="text-[11px]">
                                  Próxima: {format(new Date(vac.next_dose_date), 'PP', { locale: es })}
                                </Badge>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteVaccination(vac.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">Sin vacunas registradas</p>
                    )}
                  </SectionCard>
                </TabsContent>

                {/* ── DOCUMENTS TAB ── */}
                <TabsContent value="documents" className="space-y-4 mt-4">
                  <SectionCard 
                    title="Documentos del Empleado" 
                    icon={FileText}
                    action={
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsDocFormOpen(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Cargar
                      </Button>
                    }
                  >
                    {employee.documents && employee.documents.length > 0 ? (
                      <div className="space-y-2">
                        {employee.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 group hover:bg-muted/80 transition-colors">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-sm">
                                {doc.document_name || employeeDocumentTypeLabels[doc.document_type]}
                              </span>
                              <span className="text-xs text-muted-foreground block truncate">
                                {doc.file_name} • {format(new Date(doc.upload_date), 'PP', { locale: es })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc.expiry_date && (
                                <Badge variant={new Date(doc.expiry_date) < new Date() ? 'destructive' : 'outline'} className="text-[11px]">
                                  Vence: {format(new Date(doc.expiry_date), 'PP', { locale: es })}
                                </Badge>
                              )}
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteDocument(doc.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No hay documentos cargados</p>
                        <p className="text-xs mt-1">Haz clic en "Cargar" para agregar documentos</p>
                      </div>
                    )}
                  </SectionCard>
                </TabsContent>

                {/* ── FAMILY TAB ── */}
                <TabsContent value="family" className="space-y-4 mt-4">
                  {employee.family ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {employee.family.spouse_name && (
                        <SectionCard title="Cónyuge / Pareja" icon={Heart}>
                          <div className="divide-y divide-border">
                            <InfoItem label="Nombre" value={employee.family.spouse_name} />
                            {employee.family.spouse_gender && <InfoItem label="Género" value={genderLabels[employee.family.spouse_gender]} />}
                            {employee.family.spouse_birth_date && (
                              <InfoItem label="Fecha de Nacimiento" value={format(new Date(employee.family.spouse_birth_date), 'PPP', { locale: es })} />
                            )}
                            <InfoItem label="Trabaja" value={employee.family.spouse_works ? 'Sí' : 'No'} />
                          </div>
                        </SectionCard>
                      )}

                      <SectionCard title="Hijos" icon={UsersIcon}>
                        <div className="flex items-center gap-3 py-2">
                          <span className="text-3xl font-bold text-primary">{employee.family.children_count || 0}</span>
                          <span className="text-sm text-muted-foreground">hijos registrados</span>
                        </div>
                      </SectionCard>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Heart className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No hay información familiar registrada</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
        </div>
      </DialogContent>

      {/* Sub-dialogs */}
      {employee && (
        <>
          <EmployeeFormDialog open={isEditOpen} onOpenChange={setIsEditOpen} employee={employee} onSuccess={() => setIsEditOpen(false)} />
          <CertificationFormDialog open={isCertFormOpen} onOpenChange={setIsCertFormOpen} employeeId={employee.id} employeeName={employeeFullName} />
          <VaccinationFormDialog open={isVacFormOpen} onOpenChange={setIsVacFormOpen} employeeId={employee.id} employeeName={employeeFullName} />
          <DocumentFormDialog open={isDocFormOpen} onOpenChange={setIsDocFormOpen} employeeId={employee.id} companyId={employee.company_id} employeeName={employeeFullName} />
        </>
      )}
    </Dialog>
  );
}
