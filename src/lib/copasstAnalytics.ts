import type { CopasstSegment } from '@/types/copasst';

const GENDER_COLORS = ['#0f766e', '#7c3aed', '#ea580c', '#64748b'];

const genderLabel = (value: string) => ({ M: 'Masculino', F: 'Femenino', O: 'Otro' }[value] ?? value);

export function buildGenderVoteDistribution(data: CopasstSegment[]) {
  const totalVoted = data.reduce((total, segment) => total + segment.voted, 0);
  return data.filter((segment) => segment.voted > 0).map((segment, index) => ({
    label: genderLabel(segment.label),
    voted: segment.voted,
    percentage: totalVoted > 0 ? Math.round(segment.voted * 1000 / totalVoted) / 10 : 0,
    color: GENDER_COLORS[index % GENDER_COLORS.length],
  }));
}

export function buildCenterParticipationExportRows(data: CopasstSegment[]) {
  return data.map((segment) => ({
    'Centro de operación': segment.label,
    Participación: segment.eligible > 0 ? segment.voted / segment.eligible : 0,
    Habilitados: segment.eligible,
    Votaron: segment.voted,
    Pendientes: Math.max(0, segment.eligible - segment.voted),
  }));
}
