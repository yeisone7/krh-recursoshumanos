import { useMemo, useRef, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInYears, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Award,
  Briefcase,
  Building2,
  Calendar,
  Download,
  FileText,
  GraduationCap,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useEmployee } from '@/hooks/useEmployees';
import { useWorkInfoHistory } from '@/hooks/useWorkInfoHistory';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDateOnly, parseDateOnly } from '@/lib/dateOnly';
import {
  certificationTypeLabels,
  documentTypeLabels,
  employeeDocumentTypeLabels,
  genderLabels,
  getEmployeeFullName,
  linkTypeLabels,
  maritalStatusLabels,
  normalizeEmployeeDocumentFolder,
  riskLevelLabels,
  type EmployeeDocument,
} from '@/types/employee';
import krhLogo from '@/assets/krh-logo.png';

interface EmployeeCvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function safeLabel<T extends string>(labels: Record<T, string>, value: T | null | undefined) {
  return value ? labels[value] || value : null;
}

function formatDate(value: string | null | undefined, pattern = 'dd MMM yyyy') {
  return value ? formatDateOnly(value, pattern, { locale: es }) : '';
}

function getInitials(employee: any) {
  return `${employee?.first_name?.[0] || ''}${employee?.last_name?.[0] || ''}`.toUpperCase() || 'CV';
}

function buildFileName(employeeName: string) {
  return `CV_${employeeName || 'empleado'}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function TimelineItem({
  title,
  subtitle,
  date,
  detail,
  meta,
  isLast,
}: {
  title: string;
  subtitle?: string | null;
  date?: string | null;
  detail?: string | null;
  meta?: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="relative flex gap-4 pb-7 last:pb-0">
      {!isLast && <div className="absolute left-[7px] top-4 h-full w-px bg-slate-200" />}
      <div className="relative z-10 mt-1 h-4 w-4 rounded-full border-2 border-sky-500 bg-white shadow-sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-sky-700">{title}</h4>
            {subtitle && <p className="mt-1 text-sm font-medium text-slate-700">{subtitle}</p>}
          </div>
          {date && <span className="shrink-0 text-xs font-medium text-slate-500">{date}</span>}
        </div>
        {detail && <p className="mt-2 text-sm leading-relaxed text-slate-600">{detail}</p>}
        {meta && <div className="mt-2 flex flex-wrap gap-2">{meta}</div>}
      </div>
    </div>
  );
}

function SideInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value?: string | null;
}) {
  if (!hasText(value)) return null;

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm leading-relaxed text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: ElementType; children: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-xl font-bold text-slate-800">{children}</h3>
    </div>
  );
}

export function EmployeeCvDialog({ open, onOpenChange, employeeId }: EmployeeCvDialogProps) {
  const cvRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { data: employee, isLoading } = useEmployee(open && employeeId ? employeeId : undefined);
  const { data: workHistory = [] } = useWorkInfoHistory(open && employeeId ? employeeId : undefined);

  const { data: trainingCompletions = [] } = useQuery({
    queryKey: ['employee_cv_training_completions', employeeId, employee?.document_number],
    queryFn: async () => {
      if (!employeeId) return [];

      let query = supabase
        .from('training_completions')
        .select('id, completed_at, quiz_score, course:training_courses(id, name, category, provider, legal_framework)')
        .order('completed_at', { ascending: false });

      if (employee?.document_number) {
        query = query.or(`employee_id.eq.${employeeId},operator_cedula.eq.${employee.document_number}`);
      } else {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!employeeId && !!employee,
  });

  const employeeName = employee ? getEmployeeFullName(employee) : '';
  const birthDate = parseDateOnly(employee?.birth_date);
  const age = birthDate ? `${formatDate(employee?.birth_date)} (${differenceInYears(new Date(), birthDate)} años)` : null;
  const currentPosition = employee?.work_info?.position_name || employee?.positions?.name || 'Sin cargo registrado';
  const educationName = employee?.education_levels?.map((level) => level.name).filter(Boolean).join(', ') || null;
  const professionName = (employee as any)?.professions?.name || null;
  const profileSummary = employee?.work_info?.observations
    || [
      currentPosition !== 'Sin cargo registrado' ? `Cargo actual: ${currentPosition}` : null,
      employee?.areas?.name ? `Área: ${employee.areas.name}` : null,
      employee?.operation_centers?.name ? `Centro: ${employee.operation_centers.name}` : null,
    ].filter(Boolean).join('. ');

  const documentSummary = useMemo(() => {
    const docs = employee?.documents || [];
    return docs.slice(0, 6).map((doc: EmployeeDocument) => {
      const folder = normalizeEmployeeDocumentFolder(doc.document_type);
      return doc.document_name || doc.file_name || employeeDocumentTypeLabels[folder] || doc.document_type;
    });
  }, [employee?.documents]);

  const downloadCv = async () => {
    if (!cvRef.current || !employee) return;

    try {
      setIsDownloading(true);
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(cvRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imageHeight;
      let y = 0;

      pdf.addImage(imageData, 'PNG', 0, y, pageWidth, imageHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        y = heightLeft - imageHeight;
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', 0, y, pageWidth, imageHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${buildFileName(employeeName)}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto bg-slate-100 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Curriculum de {employeeName || 'empleado'}</DialogTitle>
          <DialogDescription>Vista profesional del curriculum del empleado.</DialogDescription>
        </DialogHeader>

        <div className="sticky top-0 z-20 flex justify-end gap-2 border-b border-slate-200 bg-slate-100/95 px-5 py-4 backdrop-blur">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={downloadCv} disabled={!employee || isDownloading} className="gap-2 bg-sky-600 text-white hover:bg-sky-700">
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar CV
          </Button>
        </div>

        {isLoading ? (
          <div className="flex min-h-[520px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : employee ? (
          <div className="px-4 pb-8 pt-5 sm:px-8">
            <div ref={cvRef} className="mx-auto max-w-5xl overflow-hidden bg-white shadow-sm ring-1 ring-slate-200">
              <div className="grid min-h-[220px] grid-cols-1 md:grid-cols-[330px_1fr]">
                <aside className="border-r border-slate-200 bg-slate-50 px-8 py-8">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-32 w-32 border-4 border-white shadow-sm">
                      <AvatarImage src={employee.avatar_url || undefined} alt={employeeName} />
                      <AvatarFallback className="bg-slate-200 text-2xl font-bold text-slate-600">
                        {getInitials(employee)}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="mt-5 text-xl font-bold text-slate-900">{employeeName}</h2>
                    <p className="mt-1 text-sm font-medium text-sky-700">{currentPosition}</p>
                  </div>
                </aside>

                <header className="relative bg-slate-900 px-8 py-10 text-white md:px-12">
                  <div className="absolute right-8 top-8 hidden rounded-lg bg-white px-4 py-2 shadow-sm md:block">
                    <img src={krhLogo} alt="KRH" className="h-10 w-auto object-contain" />
                  </div>
                  <div className="max-w-xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Curriculum vitae</p>
                    <h1 className="mt-5 text-3xl font-bold leading-tight">{employeeName}</h1>
                    <p className="mt-2 text-lg text-sky-100">{currentPosition}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
                        {employee.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                      {employee.proceso_exclusivo_pcd && (
                        <Badge className="border-amber-200/40 bg-amber-200/20 text-amber-50 hover:bg-amber-200/20">
                          Proceso PcD
                        </Badge>
                      )}
                    </div>
                  </div>
                </header>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[330px_1fr]">
                <aside className="border-r border-slate-200 bg-slate-50 px-8 py-9">
                  <div className="space-y-6">
                    <SideInfo icon={Mail} label="Correo" value={employee.contact?.email || employee.contact?.personal_email} />
                    <SideInfo icon={Phone} label="Teléfono" value={employee.contact?.mobile || employee.contact?.phone} />
                    <SideInfo icon={MapPin} label="Domicilio" value={[employee.contact?.residence_address, employee.contact?.residence_city, employee.contact?.residence_department].filter(Boolean).join(', ')} />
                    <SideInfo icon={Calendar} label="Fecha de nacimiento" value={age} />
                    <SideInfo icon={User} label="Género" value={safeLabel(genderLabels, employee.gender)} />
                    <SideInfo icon={IdCard} label="Identificación" value={`${safeLabel(documentTypeLabels, employee.document_type) || 'Documento'} ${employee.document_number}`} />
                    <SideInfo icon={Shield} label="Seguridad social" value={[employee.social_security?.eps, employee.social_security?.arl, safeLabel(riskLevelLabels, employee.social_security?.risk_level)].filter(Boolean).join(' | ')} />
                  </div>

                  <Separator className="my-8" />

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Perfil profesional</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {profileSummary || 'Sin resumen profesional registrado.'}
                    </p>
                  </div>

                  <Separator className="my-8" />

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Datos adicionales</h3>
                    <SideInfo icon={User} label="Estado civil" value={safeLabel(maritalStatusLabels, employee.marital_status)} />
                    <SideInfo icon={Building2} label="Centro" value={employee.operation_centers?.name} />
                    <SideInfo icon={Briefcase} label="Área" value={employee.areas?.name} />
                  </div>
                </aside>

                <main className="px-8 py-9 md:px-12">
                  <section>
                    <SectionTitle icon={GraduationCap}>Educación</SectionTitle>
                    <TimelineItem
                      title={educationName || 'Nivel educativo no registrado'}
                      subtitle={professionName || undefined}
                      detail={employee.is_first_job ? 'Marcado como primer empleo.' : undefined}
                      meta={employee.is_head_of_household ? <Badge variant="outline">Jefe(a) de hogar</Badge> : undefined}
                      isLast
                    />
                  </section>

                  <section className="mt-9">
                    <SectionTitle icon={Briefcase}>Experiencia laboral</SectionTitle>
                    <div>
                      {(workHistory.length > 0 ? workHistory : [employee.work_info]).filter(Boolean).map((item: any, index: number, items: any[]) => (
                        <TimelineItem
                          key={item.id || index}
                          title={item.position_name || currentPosition}
                          subtitle={[item.operation_centers?.name || employee.operation_centers?.name, item.areas?.name || employee.areas?.name].filter(Boolean).join(' - ')}
                          date={[
                            formatDate(item.valid_from || employee.work_info?.hire_date, 'MMM yyyy'),
                            item.valid_to ? formatDate(item.valid_to, 'MMM yyyy') : item.is_current === false ? null : 'Actual',
                          ].filter(Boolean).join(' - ')}
                          detail={index === 0 && employee.work_info?.observations ? employee.work_info.observations : null}
                          meta={employee.work_info?.link_type ? <Badge variant="outline">{safeLabel(linkTypeLabels, employee.work_info.link_type)}</Badge> : undefined}
                          isLast={index === items.length - 1}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="mt-9">
                    <SectionTitle icon={Award}>Cursos, certificaciones y documentos</SectionTitle>
                    <div className="space-y-2">
                      {trainingCompletions.slice(0, 5).map((completion: any, index: number, items: any[]) => (
                        <TimelineItem
                          key={completion.id}
                          title={completion.course?.name || 'Capacitación completada'}
                          subtitle={completion.course?.category || completion.course?.provider}
                          date={completion.completed_at ? format(new Date(completion.completed_at), 'dd MMM yyyy', { locale: es }) : null}
                          meta={completion.quiz_score != null ? (
                            <Badge variant="outline">Puntaje {completion.quiz_score}%</Badge>
                          ) : undefined}
                          isLast={index === items.length - 1 && employee.certifications?.length === 0}
                        />
                      ))}

                      {employee.certifications?.slice(0, 5).map((cert, index, items) => (
                        <TimelineItem
                          key={cert.id}
                          title={cert.certification_name || certificationTypeLabels[cert.certification_type] || 'Certificación'}
                          subtitle={cert.license_category ? `Categoria ${cert.license_category}` : null}
                          date={[
                            cert.issue_date ? formatDate(cert.issue_date, 'MMM yyyy') : null,
                            cert.expiry_date ? `Vence ${formatDate(cert.expiry_date, 'MMM yyyy')}` : null,
                          ].filter(Boolean).join(' - ')}
                          isLast={trainingCompletions.length === 0 && index === items.length - 1}
                        />
                      ))}

                      {trainingCompletions.length === 0 && (!employee.certifications || employee.certifications.length === 0) && (
                        <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                          Sin cursos o certificaciones registradas.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="mt-9">
                    <SectionTitle icon={FileText}>Documentos de soporte</SectionTitle>
                    {documentSummary.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {documentSummary.map((documentName) => (
                          <Badge key={documentName} variant="secondary" className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                            {documentName}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                        Sin documentos de soporte cargados.
                      </p>
                    )}
                  </section>

                  <section className="mt-9">
                    <SectionTitle icon={User}>Idiomas</SectionTitle>
                    <div className={cn('inline-flex rounded-full border border-slate-200 bg-white px-5 py-2 text-sm text-slate-500')}>
                      Sin idiomas registrados
                    </div>
                  </section>
                </main>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
            No se pudo cargar el empleado seleccionado.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
