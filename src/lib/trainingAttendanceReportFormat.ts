const DEFAULT_ATTENDANCE_REPORT_CODE = 'Codigo GH FO 36';
const COSECHARTE_ATTENDANCE_REPORT_CODE = 'Codigo GH-FO-04-DR';
const DEFAULT_ATTENDANCE_REPORT_OBJECTIVE = 'Registrar la participacion y finalizacion de la capacitacion.';

export const TRAINING_ATTENDANCE_REPORT_COURSE_FIELDS = [
  'id',
  'name',
  'category',
  'legal_framework',
  'target_audience',
  'duration_hours',
  'modality',
  'objective',
  'objectives',
  'description',
  'provider',
  'content',
].join(', ');

interface AttendanceReportCourseObjective {
  objective?: string | null;
  objectives?: string | string[] | null;
  description?: string | null;
  content?: { objetivos?: string[] } | null;
}

interface AttendanceReportWorkInfo {
  is_current?: boolean | null;
  position_name?: string | null;
  positions?: { name?: string | null } | null;
}

export const getTrainingAttendanceReportCode = (companyName?: string | null) => (
  companyName?.trim().toLocaleLowerCase('es').startsWith('cosecharte')
    ? COSECHARTE_ATTENDANCE_REPORT_CODE
    : DEFAULT_ATTENDANCE_REPORT_CODE
);

export const getTrainingAttendanceReportObjective = (
  course?: AttendanceReportCourseObjective | null
) => {
  const learningObjectives = course?.content?.objetivos
    ?.map((objective) => objective.trim())
    .filter(Boolean);

  if (learningObjectives?.length) return learningObjectives.join(' ');

  const legacyObjectives = Array.isArray(course?.objectives)
    ? course.objectives.map((objective) => objective.trim()).filter(Boolean).join(' ')
    : course?.objectives?.trim();

  return legacyObjectives
    || course?.objective?.trim()
    || course?.description?.trim()
    || DEFAULT_ATTENDANCE_REPORT_OBJECTIVE;
};

export const getTrainingAttendanceReportPosition = (
  workInfoRows?: AttendanceReportWorkInfo[] | null
) => {
  const workInfo = workInfoRows?.find((row) => row.is_current) || workInfoRows?.[0];

  return workInfo?.positions?.name?.trim()
    || workInfo?.position_name?.trim()
    || '-';
};
