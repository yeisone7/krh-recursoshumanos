// Only reviewed, static module copy may appear in public previews.
// Never derive text from a token, an employee, a document or a query parameter.
export const previewModules = [
  { id: 'registro', paths: ['/registro'], title: 'Registro', description: 'Completa el formulario de registro y vinculación de forma segura.' },
  { id: 'capacitaciones', paths: ['/capacitacion', '/capacitaciones'], title: 'Capacitaciones', description: 'Accede a los contenidos de formación y a las actividades de aprendizaje.' },
  { id: 'permisos', paths: ['/solicitud-permiso', '/permisos'], title: 'Permisos', description: 'Presenta y consulta solicitudes de permiso laboral.' },
  { id: 'dotacion', paths: ['/dotacion'], title: 'Dotación', description: 'Gestiona las entregas de dotación y su firma de recibido.' },
  { id: 'asistencia', paths: ['/asistencia', '/marcar', '/reloj-checador'], title: 'Asistencia', description: 'Registra la asistencia y consulta las opciones de marcación.' },
  { id: 'disciplinarios', paths: ['/descargos', '/disciplinarios'], title: 'Procesos disciplinarios', description: 'Accede al proceso de descargos y a las gestiones correspondientes.' },
  { id: 'copasst', paths: ['/copasst'], title: 'COPASST', description: 'Participa en las elecciones y actividades de seguridad y salud en el trabajo.' },
  { id: 'certificados', paths: ['/verificar-certificado'], title: 'Certificados laborales', description: 'Verifica la autenticidad de un certificado laboral.' },
  { id: 'reporte-diario', paths: ['/reporte-diario', '/nomina/reporte-diario'], title: 'Reporte diario', description: 'Revisa y firma los reportes diarios de jornada y servicios.' },
  { id: 'empleados', paths: ['/empleados'], title: 'Empleados', description: 'Accede a las herramientas de gestión del talento humano.' },
  { id: 'contratos', paths: ['/contratos'], title: 'Contratos', description: 'Gestiona los procesos de contratación laboral.' },
  { id: 'incapacidades', paths: ['/incapacidades'], title: 'Incapacidades', description: 'Accede a la gestión y seguimiento de incapacidades.' },
  { id: 'notificaciones', paths: ['/alertas', '/notificaciones'], title: 'Notificaciones', description: 'Consulta los avisos y las tareas de la plataforma.' },
  { id: 'chat', paths: ['/chat'], title: 'Chat', description: 'Accede al espacio de comunicación del equipo.' },
  { id: 'examenes', paths: ['/examenes'], title: 'Exámenes médicos', description: 'Gestiona las órdenes y el seguimiento de exámenes ocupacionales.' },
  { id: 'seleccion', paths: ['/seleccion'], title: 'Selección', description: 'Gestiona las vacantes y los procesos de selección de talento.' },
  { id: 'requisiciones', paths: ['/requisiciones'], title: 'Requisiciones', description: 'Consulta y gestiona las solicitudes de personal y sus aprobaciones.' },
  { id: 'centros', paths: ['/centros'], title: 'Centros de operación', description: 'Accede a la gestión de los centros de operación.' },
  { id: 'jornadas', paths: ['/jornadas'], title: 'Jornadas', description: 'Organiza las jornadas y los turnos de trabajo.' },
  { id: 'nomina', paths: ['/nomina', '/pre-liquidacion'], title: 'Nómina', description: 'Accede a las herramientas de preliquidación y análisis de nómina.' },
  { id: 'cortes-control', paths: ['/cortes-control'], title: 'Cortes de control', description: 'Gestiona los cortes y las solicitudes de corrección de nómina.' },
  { id: 'prestamos', paths: ['/prestamos'], title: 'Préstamos', description: 'Accede a la gestión de solicitudes de préstamos.' },
  { id: 'descuentos', paths: ['/descuentos'], title: 'Descuentos', description: 'Accede a la gestión de descuentos de nómina.' },
  { id: 'vacaciones', paths: ['/vacaciones'], title: 'Vacaciones', description: 'Gestiona las solicitudes y la programación de vacaciones.' },
  { id: 'novedades', paths: ['/novedades'], title: 'Novedades', description: 'Accede a la gestión de novedades laborales.' },
  { id: 'evaluaciones', paths: ['/evaluaciones'], title: 'Evaluaciones', description: 'Accede a las evaluaciones y al seguimiento del desempeño.' },
  { id: 'organigrama', paths: ['/organigrama'], title: 'Organigrama', description: 'Consulta la estructura organizacional de la empresa.' },
  { id: 'cesantias', paths: ['/cesantias'], title: 'Cesantías', description: 'Accede a la gestión de solicitudes de cesantías.' },
  { id: 'calendario', paths: ['/calendario', '/cumpleanos'], title: 'Calendario', description: 'Consulta la agenda y las actividades de la organización.' },
  { id: 'reportes', paths: ['/reportes'], title: 'Reportes', description: 'Accede a los reportes de gestión de talento humano.' },
  { id: 'analitica', paths: ['/analitica'], title: 'Analítica', description: 'Consulta los indicadores de gestión de la organización.' },
  { id: 'asistente-ia', paths: ['/asistente-ia'], title: 'Asistente IA', description: 'Accede al asistente de la plataforma de talento humano.' },
  { id: 'automatizaciones', paths: ['/automatizaciones'], title: 'Automatizaciones', description: 'Gestiona los procesos automáticos de la plataforma.' },
  { id: 'cumplimiento', paths: ['/cumplimiento-laboral', '/pila-ugpp'], title: 'Cumplimiento laboral', description: 'Accede a las herramientas de seguimiento del cumplimiento laboral.' },
  { id: 'catalogos', paths: ['/catalogos'], title: 'Catálogos', description: 'Consulta y administra los catálogos de la organización.' },
  { id: 'configuracion', paths: ['/configuracion', '/configuracion-laboral'], title: 'Configuración', description: 'Accede a la configuración de la plataforma.' },
  { id: 'seguridad', paths: ['/seguridad', '/auditoria', '/super-admin'], title: 'Seguridad', description: 'Accede a las herramientas de administración y seguridad.' },
  { id: 'acceso', paths: ['/auth', '/reset-password', '/change-password-required', '/onboarding', '/select-company', '/perfil', '/portal', '/install'], title: 'Portal de talento humano', description: 'Accede de forma segura a los servicios de la organización.' },
  { id: 'general', paths: ['/'], title: 'Gestión de talento humano', description: 'Una plataforma para conectar a las personas con los procesos de su organización.' },
] as const;

export type PreviewModule = typeof previewModules[number];

export function moduleForPath(value: string): PreviewModule {
  // Ignore all variable path segments, searches and fragments when choosing copy.
  const path = value.split(/[?#]/, 1)[0].toLowerCase().replace(/\/+$/, '') || '/';
  const matches = previewModules.flatMap(module => module.paths
    .filter(prefix => path === prefix || (prefix !== '/' && path.startsWith(`${prefix}/`)))
    .map(prefix => ({ module, length: prefix.length })));
  return matches.sort((a, b) => b.length - a.length)[0]?.module ?? previewModules[previewModules.length - 1];
}

export function moduleById(id: string): PreviewModule {
  return previewModules.find(module => module.id === id) ?? moduleForPath('/');
}
