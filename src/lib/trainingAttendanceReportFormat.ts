const DEFAULT_ATTENDANCE_REPORT_CODE = 'Codigo GH FO 36';
const COSECHARTE_ATTENDANCE_REPORT_CODE = 'Codigo GH-FO-04-DR';

export const getTrainingAttendanceReportCode = (companyName?: string | null) => (
  companyName?.trim().toLocaleLowerCase('es').startsWith('cosecharte')
    ? COSECHARTE_ATTENDANCE_REPORT_CODE
    : DEFAULT_ATTENDANCE_REPORT_CODE
);
