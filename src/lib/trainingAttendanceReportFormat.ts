const DEFAULT_ATTENDANCE_REPORT_CODE = 'Codigo GH FO 36';
const COSECHARTE_ATTENDANCE_REPORT_CODE = 'Codigo GH-FO-04-DR';
const DEFAULT_ATTENDANCE_REPORT_OBJECTIVE = 'Registrar la participacion y finalizacion de la capacitacion.';

interface AttendanceReportCourseObjective {
  objective?: string | null;
  objectives?: string | string[] | null;
  description?: string | null;
  content?: { objetivos?: string[] } | null;
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
