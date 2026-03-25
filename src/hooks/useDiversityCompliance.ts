import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import type { DiversityGoals } from '@/components/config/DiversityGoalsConfig';

interface ComplianceResult {
  met: boolean;
  failures: { label: string; current: number; goal: number }[];
}

export function useDiversityComplianceCheck() {
  const { user, currentCompanyId } = useAuth();
  const { data: systemConfig } = useSystemConfig();

  const checkAndNotify = useCallback(async (vacancyId: string, vacancyTitle: string) => {
    const goals: DiversityGoals | undefined = systemConfig?.diversity_goals;
    if (!goals?.enabled || !goals.notify_on_close || !currentCompanyId || !user?.id) return;

    // Fetch candidates for this vacancy
    const { data: candidates } = await supabase
      .from('candidates')
      .select('gender, disability_type, ethnic_group, is_first_job, is_head_of_household')
      .eq('vacancy_id', vacancyId);

    if (!candidates || candidates.length < 3) return; // Too few to evaluate

    const total = candidates.length;
    const checks: { label: string; current: number; goal: number }[] = [];

    const femalePct = (candidates.filter(c => c.gender === 'F').length / total) * 100;
    if (femalePct < goals.min_female_pct * (goals.notify_threshold_pct / 100))
      checks.push({ label: 'Mujeres', current: Math.round(femalePct), goal: goals.min_female_pct });

    const disPct = (candidates.filter(c => c.disability_type && c.disability_type !== 'Ninguna').length / total) * 100;
    if (disPct < goals.min_disability_pct * (goals.notify_threshold_pct / 100))
      checks.push({ label: 'Discapacidad', current: Math.round(disPct), goal: goals.min_disability_pct });

    const ethPct = (candidates.filter(c => c.ethnic_group && c.ethnic_group !== 'No registrado' && c.ethnic_group !== 'Ninguno').length / total) * 100;
    if (ethPct < goals.min_ethnic_pct * (goals.notify_threshold_pct / 100))
      checks.push({ label: 'Grupo Étnico', current: Math.round(ethPct), goal: goals.min_ethnic_pct });

    const fjPct = (candidates.filter(c => c.is_first_job).length / total) * 100;
    if (fjPct < goals.min_first_job_pct * (goals.notify_threshold_pct / 100))
      checks.push({ label: 'Primer Empleo', current: Math.round(fjPct), goal: goals.min_first_job_pct });

    const hhPct = (candidates.filter(c => c.is_head_of_household).length / total) * 100;
    if (hhPct < goals.min_head_household_pct * (goals.notify_threshold_pct / 100))
      checks.push({ label: 'Cabeza Familia', current: Math.round(hhPct), goal: goals.min_head_household_pct });

    if (checks.length === 0) return; // All met

    // Get admin/system users to notify
    const { data: adminRoles } = await supabase
      .from('custom_roles')
      .select('id')
      .eq('company_id', currentCompanyId)
      .eq('is_system', true);

    if (!adminRoles?.length) return;

    const { data: adminUsers } = await supabase
      .from('user_custom_roles')
      .select('user_id')
      .in('role_id', adminRoles.map(r => r.id));

    if (!adminUsers?.length) return;

    const failList = checks.map(c => `${c.label}: ${c.current}% (meta: ${c.goal}%)`).join(', ');

    const notifs = adminUsers.map(u => ({
      user_id: u.user_id,
      company_id: currentCompanyId,
      title: '⚠️ Alerta de diversidad en selección',
      message: `La vacante "${vacancyTitle}" no cumple con las metas de diversidad: ${failList}`,
      type: 'warning' as const,
      category: 'selection',
      entity_type: 'vacancy',
      entity_id: vacancyId,
      action_url: `/seleccion?vacancy=${vacancyId}`,
    }));

    await supabase.from('notifications').insert(notifs);

    return { met: false, failures: checks } as ComplianceResult;
  }, [systemConfig, currentCompanyId, user?.id]);

  return { checkAndNotify };
}
