import { useMemo, useRef, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInYears, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Award,
  Briefcase,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployee } from '@/hooks/useEmployees';
import { useWorkInfoHistory } from '@/hooks/useWorkInfoHistory';
import { supabase } from '@/integrations/supabase/client';
import { formatDateOnly, parseDateOnly } from '@/lib/dateOnly';
import {
  certificationTypeLabels,
  accountTypeLabels,
  bloodTypeLabels,
  documentTypeLabels,
  employeeDocumentTypeLabels,
  familyRelationshipLabels,
  genderLabels,
  getEmployeeFullName,
  linkTypeLabels,
  maritalStatusLabels,
  normalizeEmployeeDocumentFolder,
  payrollTypeLabels,
  riskLevelLabels,
  type EmployeeDocument,
} from '@/types/employee';

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

function joinText(values: unknown[], separator = ', ') {
  const parts = values.filter(hasText).map((value) => String(value).trim());
  return parts.length > 0 ? parts.join(separator) : null;
}

function maskAccountNumber(value: string | null | undefined) {
  if (!hasText(value)) return null;
  return `Cuenta terminada en ${value.slice(-4)}`;
}

function getEmployeeStatusLabel(employee: any) {
  if (!employee) return null;
  if (employee.status === 'en_retiro') return 'En retiro';
  if (employee.status === 'retired' || (!employee.is_active && employee.status === 'active')) return 'Retirado';
  if (employee.status === 'suspended' || !employee.is_active) return 'Inactivo';
  return 'Activo';
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
    <div className="relative flex gap-3 pb-5 last:pb-0">
      {!isLast && <div className="absolute left-[7px] top-4 h-full w-px bg-[#e6e6e6]" />}
      <div className="relative z-10 mt-1 h-3.5 w-3.5 rounded-full border-2 border-[#2f91d1] bg-white" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="text-[14px] font-bold leading-snug text-[#2f86cc]">{title}</h4>
            {subtitle && <p className="mt-1 text-[12px] font-medium leading-relaxed text-[#333333]">{subtitle}</p>}
          </div>
          {date && <span className="shrink-0 text-[11px] font-medium text-[#8a8a8a]">{date}</span>}
        </div>
        {detail && <p className="mt-1.5 text-[11px] leading-relaxed text-[#555555]">{detail}</p>}
        {meta && <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">{meta}</div>}
      </div>
    </div>
  );
}

function SideInfo({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!hasText(value)) return null;

  return (
    <div className="min-w-0">
      <p className="text-[16px] font-bold leading-tight text-[#3f3f3f]">{label}</p>
      <p className="mt-2 break-words text-[12px] leading-relaxed text-[#8a8a8a]">{value}</p>
    </div>
  );
}

function SideGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <h3 className="border-b border-[#dedede] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2f86cc]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: ElementType; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[22px] font-bold leading-tight text-[#3f3f3f]">{children}</h3>
      <div className="mt-6 flex h-10 w-10 items-center justify-center rounded-full border border-[#e9e9e9] bg-white text-[#444444] shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

export function EmployeeCvDialog({ open, onOpenChange, employeeId }: EmployeeCvDialogProps) {
  const cvRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { data: employee, isLoading } = useEmployee(open && employeeId ? employeeId : undefined);
  const { data: workHistory = [] } = useWorkInfoHistory(open && employeeId ? employeeId : undefined);
  const { companies, currentCompanyId } = useAuth();
  const currentCompany = companies.find((company) => company.id === currentCompanyId);
  const companyLogoUrl = currentCompany?.horizontal_logo_url || currentCompany?.logo_url || null;

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
  const identityInfo = joinText([safeLabel(documentTypeLabels, employee?.document_type), employee?.document_number], ' ');
  const birthPlace = joinText([employee?.birth_city, employee?.birth_department, employee?.birth_country]);
  const residence = joinText([
    employee?.contact?.residence_address,
    employee?.contact?.residence_neighborhood,
    employee?.contact?.residence_city,
    employee?.contact?.residence_department,
  ]);
  const emergencyContact = joinText([
    employee?.contact?.emergency_contact_name,
    employee?.contact?.emergency_contact_relationship,
    employee?.contact?.emergency_contact_phone,
  ], ' | ');
  const workLocation = joinText([
    employee?.operation_centers?.name,
    employee?.areas?.name,
    employee?.work_info?.work_city,
  ], ' - ');
  const employmentPeriod = joinText([
    employee?.work_info?.hire_date ? `Ingreso ${formatDate(employee.work_info.hire_date, 'dd MMM yyyy')}` : null,
    employee?.work_info?.termination_date ? `Retiro ${formatDate(employee.work_info.termination_date, 'dd MMM yyyy')}` : null,
  ], ' | ');
  const socialSecurityInfo = joinText([
    employee?.social_security?.eps ? `EPS ${employee.social_security.eps}` : null,
    employee?.social_security?.afp ? `AFP ${employee.social_security.afp}` : null,
    employee?.social_security?.arl ? `ARL ${employee.social_security.arl}` : null,
    employee?.social_security?.ccf ? `CCF ${employee.social_security.ccf}` : null,
    employee?.social_security?.risk_level ? safeLabel(riskLevelLabels, employee.social_security.risk_level) : null,
  ], ' | ');
  const scheduleInfo = joinText([
    employee?.schedule?.payroll_type ? payrollTypeLabels[employee.schedule.payroll_type] : null,
    employee?.schedule?.is_office_schedule === true ? 'Horario administrativo' : null,
    employee?.schedule?.is_office_schedule === false ? 'Turnos' : null,
    employee?.schedule?.rest_day ? `Descanso ${employee.schedule.rest_day}` : null,
  ], ' | ');
  const timeModeInfo = joinText([
    employee?.time_config?.mode === 'administrative' ? 'Modalidad administrativa' : null,
    employee?.time_config?.mode === 'shift' ? 'Modalidad por turnos' : null,
    employee?.time_config?.work_schedules?.name,
    employee?.time_config?.shift_cycles?.name,
    employee?.time_config?.start_date ? `Desde ${formatDate(employee.time_config.start_date, 'dd MMM yyyy')}` : null,
  ], ' | ');
  const bankInfo = joinText([
    employee?.bank_info?.bank_name,
    employee?.bank_info?.account_type ? accountTypeLabels[employee.bank_info.account_type] : null,
    maskAccountNumber(employee?.bank_info?.account_number),
    employee?.bank_info?.account_registered ? 'Cuenta registrada' : null,
  ], ' | ');
  const familyInfo = employee?.family_members && employee.family_members.length > 0
    ? employee.family_members
      .slice(0, 3)
      .map((member) => joinText([
        familyRelationshipLabels[member.relationship] || member.relationship,
        member.full_name,
        member.age != null ? `${member.age} años` : null,
      ], ' - '))
      .filter(Boolean)
      .join(' | ')
    : null;
  const employmentBadges = [
    employee?.work_info?.link_type ? safeLabel(linkTypeLabels, employee.work_info.link_type) : null,
    employee?.work_info?.cost_center ? `Centro de costos ${employee.work_info.cost_center}` : null,
    getEmployeeStatusLabel(employee),
  ].filter(hasText);
  const personalBadges = [
    employee?.blood_type ? `RH ${safeLabel(bloodTypeLabels, employee.blood_type)}` : null,
    (employee as any)?.is_first_job ? 'Primer empleo' : null,
    (employee as any)?.is_head_of_household ? 'Jefe(a) de hogar' : null,
    employee?.proceso_exclusivo_pcd ? 'Proceso PcD' : null,
  ].filter(hasText);

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
      <DialogContent className="flex h-[96vh] max-h-[96vh] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-0 overflow-hidden border-0 bg-[#f3f3f3] p-0 shadow-2xl sm:rounded-none [&>button:last-child]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Curriculum de {employeeName || 'empleado'}</DialogTitle>
          <DialogDescription>Vista profesional del curriculum del empleado.</DialogDescription>
        </DialogHeader>

        <div className="z-20 shrink-0 border-b border-[#dedede] bg-[#f3f3f3] px-4 py-4">
          <div className="mx-auto flex w-full max-w-[1140px] justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 rounded-sm bg-white px-5 text-[13px] font-medium text-[#111111]">
              Cerrar
            </Button>
            <Button onClick={downloadCv} disabled={!employee || isDownloading} className="h-9 rounded-sm bg-[#3f95d2] px-6 text-[13px] font-bold text-white hover:bg-[#2f86c4]">
              {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Descargar CV
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
          <div className="flex min-h-[520px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : employee ? (
          <div className="px-[18px] pb-12 pt-5 sm:px-[37px] lg:px-[9vw]">
            <div ref={cvRef} className="mx-auto w-full max-w-[1140px] overflow-hidden bg-white shadow-sm ring-1 ring-[#e8e8e8]">
              <div className="relative grid min-h-[180px] grid-cols-1 md:grid-cols-[460px_1fr]">
                <div className="absolute left-0 top-0 hidden h-[180px] w-4 bg-[#06294f] md:block" />
                <aside className="border-r border-[#e5e5e5] bg-[#f7f7f7] px-10 py-7">
                  <div className="flex justify-center">
                    <Avatar className="h-[144px] w-[144px] border-4 border-white shadow-sm">
                      <AvatarImage src={employee.avatar_url || undefined} alt={employeeName} />
                      <AvatarFallback className="bg-[#e8edf2] text-2xl font-bold text-[#3f3f3f]">
                        {getInitials(employee)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </aside>

                <header className="relative min-h-[180px] overflow-hidden px-8 py-8 text-white md:px-[50px]" style={{ backgroundColor: '#06294f' }}>
                  <div className="absolute inset-0 bg-[#06294f]" />
                  <div className="relative z-10 grid min-h-[116px] w-full items-center gap-6 md:grid-cols-[minmax(0,1fr)_230px]">
                    <div className="min-w-0">
                      <h1 className="break-words text-[22px] font-bold leading-tight text-white">{employeeName}</h1>
                      <p className="mt-2 text-[18px] font-medium leading-snug text-white">{currentPosition}</p>
                    </div>
                    <div className="hidden h-[60px] w-[220px] items-center justify-center justify-self-end rounded-md bg-white px-3 py-2 shadow-sm md:flex">
                      {companyLogoUrl ? (
                        <img src={companyLogoUrl} alt={currentCompany?.name || 'Empresa'} crossOrigin="anonymous" className="max-h-11 max-w-[190px] object-contain" />
                      ) : (
                        <span className="max-w-[190px] truncate text-[20px] font-semibold text-[#666666]">{currentCompany?.name || 'Empresa'}</span>
                      )}
                    </div>
                  </div>
                </header>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[460px_1fr]">
                <aside className="border-r border-[#e5e5e5] bg-[#f7f7f7] px-[60px] py-[72px]">
                  <div className="space-y-9">
                    <SideGroup title="Contacto">
                      <SideInfo label="Correo corporativo" value={employee.contact?.email} />
                      <SideInfo label="Correo personal" value={employee.contact?.personal_email} />
                      <SideInfo label="Teléfono / celular" value={joinText([employee.contact?.mobile, employee.contact?.phone], ' | ')} />
                      <SideInfo label="Domicilio" value={residence} />
                      <SideInfo label="Contacto de emergencia" value={emergencyContact} />
                    </SideGroup>

                    <SideGroup title="Perfil personal">
                      <SideInfo label="Identificación" value={identityInfo} />
                      <SideInfo label="Fecha de nacimiento" value={age} />
                      <SideInfo label="Lugar de nacimiento" value={birthPlace} />
                      <SideInfo label="Género" value={safeLabel(genderLabels, employee.gender)} />
                      <SideInfo label="Estado civil" value={safeLabel(maritalStatusLabels, employee.marital_status)} />
                      <SideInfo label="Grupo sanguíneo" value={employee.blood_type ? safeLabel(bloodTypeLabels, employee.blood_type) : null} />
                      <SideInfo label="Familia" value={familyInfo} />
                    </SideGroup>

                    <SideGroup title="Perfil laboral">
                      <SideInfo label="Estado" value={getEmployeeStatusLabel(employee)} />
                      <SideInfo label="Ubicación laboral" value={workLocation} />
                      <SideInfo label="Vinculación" value={joinText([employmentPeriod, employee.work_info?.link_type ? safeLabel(linkTypeLabels, employee.work_info.link_type) : null], ' | ')} />
                      <SideInfo label="Centro de costos" value={employee.work_info?.cost_center} />
                      <SideInfo label="Horario / nómina" value={joinText([scheduleInfo, timeModeInfo], ' | ')} />
                      <SideInfo label="Seguridad social" value={socialSecurityInfo} />
                      <SideInfo label="Banco" value={bankInfo} />
                    </SideGroup>

                    <div>
                      <h3 className="text-[16px] font-bold leading-tight text-[#3f3f3f]">Perfil profesional</h3>
                      <p className="mt-3 text-[12px] leading-relaxed text-[#8a8a8a]">
                        {profileSummary || 'Sin resumen profesional registrado.'}
                      </p>
                    </div>
                  </div>
                </aside>

                <main className="px-[44px] py-[38px]">
                  <section>
                    <SectionTitle icon={GraduationCap}>Educación</SectionTitle>
                    <div className="ml-[14px] border-l border-[#e9e9e9] pl-8">
                      <TimelineItem
                        title={educationName || 'Nivel educativo no registrado'}
                        subtitle={professionName || undefined}
                        detail={birthPlace ? `Origen: ${birthPlace}` : undefined}
                        meta={personalBadges.length > 0 ? personalBadges.map((badge) => (
                          <Badge key={badge} variant="outline" className="h-5 border-[#d9dfe7] px-2 text-[10px] font-medium text-[#6b778c]">
                            {badge}
                          </Badge>
                        )) : undefined}
                        isLast
                      />
                    </div>
                  </section>

                  <section className="mt-6">
                    <SectionTitle icon={Briefcase}>Experiencia laboral</SectionTitle>
                    <div className="ml-[14px] border-l border-[#e9e9e9] pl-8">
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
                          meta={index === 0 && employmentBadges.length > 0 ? employmentBadges.map((badge) => (
                            <Badge key={badge} variant="outline" className="h-5 border-[#d9dfe7] px-2 text-[10px] font-medium text-[#6b778c]">
                              {badge}
                            </Badge>
                          )) : undefined}
                          isLast={index === items.length - 1}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="mt-6">
                    <SectionTitle icon={Award}>Cursos y diplomados adicionales</SectionTitle>
                    <div className="ml-[14px] space-y-2 border-l border-[#e9e9e9] pl-8">
                      {trainingCompletions.slice(0, 5).map((completion: any, index: number, items: any[]) => (
                        <TimelineItem
                          key={completion.id}
                          title={completion.course?.name || 'Capacitación completada'}
                          subtitle={completion.course?.category || completion.course?.provider}
                          date={completion.completed_at ? format(new Date(completion.completed_at), 'dd MMM yyyy', { locale: es }) : null}
                          meta={completion.quiz_score != null ? (
                            <Badge variant="outline" className="h-5 border-[#d9dfe7] px-2 text-[10px] font-medium text-[#6b778c]">Puntaje {completion.quiz_score}%</Badge>
                          ) : undefined}
                          isLast={index === items.length - 1 && employee.certifications?.length === 0}
                        />
                      ))}

                      {employee.certifications?.slice(0, 5).map((cert, index, items) => (
                        <TimelineItem
                          key={cert.id}
                          title={cert.certification_name || certificationTypeLabels[cert.certification_type] || 'Certificación'}
                          subtitle={cert.license_category ? `Categoría ${cert.license_category}` : null}
                          date={[
                            cert.issue_date ? formatDate(cert.issue_date, 'MMM yyyy') : null,
                            cert.expiry_date ? `Vence ${formatDate(cert.expiry_date, 'MMM yyyy')}` : null,
                          ].filter(Boolean).join(' - ')}
                          isLast={trainingCompletions.length === 0 && index === items.length - 1}
                        />
                      ))}

                      {trainingCompletions.length === 0 && (!employee.certifications || employee.certifications.length === 0) && (
                        <p className="rounded-lg border border-dashed border-[#dcdcdc] p-3 text-[12px] text-[#777777]">
                          Sin cursos o certificaciones registradas.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="mt-6">
                    <SectionTitle icon={FileText}>Documentos de soporte</SectionTitle>
                    {documentSummary.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {documentSummary.map((documentName) => (
                          <Badge key={documentName} variant="secondary" className="rounded-full bg-[#f0f0f0] px-2.5 py-1 text-[10px] font-medium text-[#555555]">
                            {documentName}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-[#dcdcdc] p-3 text-[12px] text-[#777777]">
                        Sin documentos de soporte cargados.
                      </p>
                    )}
                  </section>

                  <section className="mt-6">
                    <SectionTitle icon={User}>Idiomas</SectionTitle>
                    <div className="inline-flex rounded-full border border-[#e0e0e0] bg-white px-5 py-2 text-[12px] text-[#777777]">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
