import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, ExternalLink, History, UserSearch } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CandidateDetailDialog } from '@/components/selection/CandidateDetailDialog';
import { candidateStatusLabels } from '@/types/vacancy';
import { formatDateOnly } from '@/lib/dateOnly';

interface CandidateHistoryLinkProps {
  employeeId: string;
}

const legacyTables = [
  'contracts', 'employee_work_info', 'employee_terminations', 'employee_contact',
  'employee_family', 'employee_family_members', 'employee_bank_info',
  'employee_social_security', 'employee_schedule', 'employee_time_config',
  'employee_operation_center_assignments', 'employee_documents', 'medical_exams',
  'employee_onboarding_tasks', 'vacation_balances', 'leave_balances',
] as const;

export function CandidateHistoryLink({ employeeId }: CandidateHistoryLinkProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employee-employment-cycles', employeeId],
    queryFn: async () => {
      const [cyclesResponse, candidatesResponse, ...legacyResponses] = await Promise.all([
        supabase
          .from('employee_employment_cycles')
          .select(`
            *,
            candidates(id, status, application_date, vacancies(position_title)),
            employee_work_info(id, position_name, hire_date, link_type, operation_centers(name)),
            contracts(id, contract_number, contract_type, start_date, end_date, salary),
            employee_terminations(id, effective_date, is_completed, termination_types(name)),
            employee_documents(id),
            medical_exams(id, exam_type, exam_date, result),
            employee_onboarding_tasks(id, is_completed),
            vacation_balances(id, days_accrued, days_taken, days_pending),
            leave_balances(id)
          `)
          .eq('employee_id', employeeId)
          .order('cycle_number', { ascending: false }),
        supabase
          .from('candidates')
          .select('id, status, application_date, employee_id, rehire_employee_id, vacancies(position_title)')
          .or(`employee_id.eq.${employeeId},rehire_employee_id.eq.${employeeId}`)
          .order('application_date', { ascending: false }),
        ...legacyTables.map((table) => (supabase.from(table as any) as any)
          .select('id', { count: 'exact', head: true })
          .eq('employee_id', employeeId)
          .is('employment_cycle_id', null)),
      ]);

      if (cyclesResponse.error) throw cyclesResponse.error;
      if (candidatesResponse.error) throw candidatesResponse.error;
      const legacyCount = legacyResponses.reduce((total, response: any) => {
        if (response.error) throw response.error;
        return total + (response.count || 0);
      }, 0);
      const linkedCandidateIds = new Set((cyclesResponse.data || []).map((cycle: any) => cycle.candidate_id).filter(Boolean));

      return {
        cycles: cyclesResponse.data || [],
        unlinkedCandidates: (candidatesResponse.data || []).filter((candidate: any) => !linkedCandidateIds.has(candidate.id)),
        legacyCount,
      };
    },
    enabled: !!employeeId,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando ciclos laborales…</p>;
  if (!data?.cycles.length && !data?.unlinkedCandidates.length && !data?.legacyCount) {
    return <p className="text-sm text-muted-foreground">No hay ciclos laborales registrados.</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {data.cycles.map((cycle: any) => {
          const workInfo = cycle.employee_work_info?.[0];
          const contract = cycle.contracts?.[0];
          const termination = cycle.employee_terminations?.[0];
          const candidate = cycle.candidates;
          const onboarding = cycle.employee_onboarding_tasks || [];
          const completedTasks = onboarding.filter((task: any) => task.is_completed).length;

          return (
            <Card key={cycle.id} className="shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="rounded-md bg-primary/10 p-2"><BriefcaseBusiness className="h-4 w-4 text-primary" /></div>
                    <div>
                      <p className="font-semibold">Ciclo {cycle.cycle_number} · {workInfo?.position_name || 'Cargo sin registrar'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateOnly(cycle.start_date, 'PP')}
                        {cycle.end_date ? ` — ${formatDateOnly(cycle.end_date, 'PP')}` : ' — vigente'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={cycle.status === 'active' ? 'default' : 'secondary'}>
                    {cycle.status === 'active' ? 'Activo' : 'Finalizado'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-md bg-muted/50 p-2"><span className="text-muted-foreground">Contrato</span><p className="font-medium">{contract?.contract_number || 'Sin asociación'}</p></div>
                  <div className="rounded-md bg-muted/50 p-2"><span className="text-muted-foreground">Documentos</span><p className="font-medium">{cycle.employee_documents?.length || 0}</p></div>
                  <div className="rounded-md bg-muted/50 p-2"><span className="text-muted-foreground">Exámenes</span><p className="font-medium">{cycle.medical_exams?.length || 0}</p></div>
                  <div className="rounded-md bg-muted/50 p-2"><span className="text-muted-foreground">Onboarding</span><p className="font-medium">{completedTasks}/{onboarding.length}</p></div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Centro: {workInfo?.operation_centers?.name || 'Sin asociación'}</span>
                  <span>·</span>
                  <span>Retiro: {termination?.effective_date ? formatDateOnly(termination.effective_date, 'PP') : 'No aplica'}</span>
                  <span>·</span>
                  <span>Saldos: {cycle.vacation_balances?.length || 0} vacaciones / {cycle.leave_balances?.length || 0} permisos</span>
                </div>

                {candidate && (
                  <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => setSelectedCandidateId(candidate.id)}>
                    <UserSearch className="h-3.5 w-3.5" />
                    Ver postulación · {candidateStatusLabels[candidate.status as keyof typeof candidateStatusLabels] || candidate.status}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {(data.legacyCount > 0 || data.unlinkedCandidates.length > 0) && (
          <Card className="border-warning/30 bg-warning/5 shadow-none">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2 font-semibold"><History className="h-4 w-4 text-warning" />Historial previo sin ciclo</div>
              <p className="text-xs text-muted-foreground">
                {data.legacyCount} registro(s) históricos no se asociaron automáticamente porque la relación no era inequívoca.
              </p>
              {data.unlinkedCandidates.map((candidate: any) => (
                <Button key={candidate.id} variant="ghost" size="sm" className="mr-2 h-8" onClick={() => setSelectedCandidateId(candidate.id)}>
                  {(candidate.vacancies as any)?.position_title || 'Postulación'} · {candidateStatusLabels[candidate.status as keyof typeof candidateStatusLabels] || candidate.status}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {selectedCandidateId && (
        <CandidateDetailDialog
          open
          onOpenChange={(nextOpen) => { if (!nextOpen) setSelectedCandidateId(null); }}
          candidateId={selectedCandidateId}
        />
      )}
    </>
  );
}
