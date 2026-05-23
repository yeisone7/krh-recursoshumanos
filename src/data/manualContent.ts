// ====================================================================
// Manual de Usuario – datos estructurados
// Para agregar documentación de un módulo nuevo, agregue una entrada
// en MODULE_DOCS con el moduleCode correspondiente.
// ====================================================================

export interface ManualContentItem {
  type: 'paragraph' | 'list' | 'table' | 'formula' | 'alert' | 'heading';
  data: any;
}

export interface ManualSection {
  id: string;
  title: string;
  icon: string; // lucide icon name
  moduleCode?: string; // si está ligado a un módulo específico
  content: ManualContentItem[];
  subsections?: ManualSection[];
}

// ─────────────── 1. Introducción General ───────────────

const introSection: ManualSection = {
  id: 'introduccion',
  title: 'Introducción General',
  icon: 'BookOpen',
  content: [
    { type: 'heading', data: '¿Qué es esta plataforma?' },
    {
      type: 'paragraph',
      data: 'Esta aplicación es un sistema integral de Gestión de Recursos Humanos (HRMS) diseñado para centralizar y automatizar todos los procesos relacionados con la administración de personal, contratos, dotación, capacitaciones, evaluaciones, nómina y más.',
    },
    { type: 'heading', data: 'Alcance' },
    {
      type: 'paragraph',
      data: 'Cubre el ciclo de vida completo del empleado: desde la requisición de personal y selección, pasando por la contratación, gestión diaria (vacaciones, permisos, incapacidades, dotación, exámenes médicos), desarrollo (capacitaciones, evaluaciones de desempeño), procesos disciplinarios, hasta la terminación del contrato y liquidación.',
    },
    { type: 'heading', data: 'Público objetivo' },
    {
      type: 'list',
      data: [
        'Administradores del sistema',
        'Personal de Recursos Humanos',
        'Jefes de área y supervisores',
        'Auditores',
        'Empleados (a través del Portal del Empleado)',
      ],
    },
    { type: 'heading', data: 'Requisitos básicos de uso' },
    {
      type: 'list',
      data: [
        'Navegador web moderno (Chrome, Firefox, Edge, Safari)',
        'Conexión a Internet estable',
        'Cuenta de usuario activa con rol asignado',
        'Resolución de pantalla mínima recomendada: 1280×720',
      ],
    },
  ],
};

// ─────────────── 2. Acceso al Sistema ───────────────

const accessSection: ManualSection = {
  id: 'acceso',
  title: 'Acceso al Sistema',
  icon: 'LogIn',
  content: [
    { type: 'heading', data: 'Registro de usuario' },
    {
      type: 'paragraph',
      data: 'El registro se realiza mediante invitación por correo electrónico enviada por un Administrador. Al recibir el correo, el usuario debe hacer clic en el enlace de confirmación y establecer su contraseña.',
    },
    {
      type: 'alert',
      data: {
        variant: 'warning',
        title: 'Importante',
        message: 'Después de registrarse, el usuario NO podrá acceder a la aplicación hasta que un Administrador le asigne un rol activo. Mientras tanto verá un mensaje indicando que su cuenta está pendiente de activación.',
      },
    },
    { type: 'heading', data: '¿Qué ocurre al registrarse?' },
    {
      type: 'list',
      data: [
        'Se crea la cuenta de autenticación.',
        'El usuario aparece en el panel de "Usuarios Pendientes" del Dashboard del Administrador.',
        'El Administrador asigna un rol al usuario.',
        'El usuario ya puede iniciar sesión y acceder a los módulos permitidos por su rol.',
      ],
    },
    { type: 'heading', data: 'Proceso de activación por el Administrador' },
    {
      type: 'list',
      data: [
        'Ir a Seguridad y Roles → pestaña Usuarios.',
        'Localizar al usuario pendiente.',
        'Asignar uno o más roles activos.',
        'El usuario podrá acceder de inmediato en su próximo inicio de sesión.',
      ],
    },
    { type: 'heading', data: 'Recuperación de contraseña' },
    {
      type: 'paragraph',
      data: 'En la pantalla de inicio de sesión, haga clic en "¿Olvidaste tu contraseña?" e ingrese su correo electrónico. Recibirá un enlace para restablecer su contraseña. También puede cambiar su contraseña desde la sección Mi Perfil.',
    },
  ],
};

// ─────────────── 3. Roles y Permisos ───────────────

const rolesSection: ManualSection = {
  id: 'roles',
  title: 'Roles y Permisos',
  icon: 'Shield',
  content: [
    { type: 'heading', data: '¿Qué es un rol?' },
    {
      type: 'paragraph',
      data: 'Un rol es un perfil de acceso que agrupa un conjunto de permisos. Los roles son dinámicos y configurables por el Administrador. Cada usuario puede tener uno o varios roles asignados.',
    },
    { type: 'heading', data: '¿Qué son los permisos?' },
    {
      type: 'paragraph',
      data: 'Los permisos definen las acciones específicas que un usuario puede realizar en cada módulo. Se manejan cuatro tipos de permisos por módulo:',
    },
    {
      type: 'table',
      data: {
        headers: ['Permiso', 'Descripción'],
        rows: [
          ['Ver', 'Permite visualizar la información del módulo'],
          ['Crear', 'Permite agregar nuevos registros'],
          ['Modificar', 'Permite editar registros existentes'],
          ['Eliminar', 'Permite eliminar registros'],
        ],
      },
    },
    { type: 'heading', data: 'Comportamiento especial' },
    {
      type: 'list',
      data: [
        'El rol Administrador tiene acceso total a todos los módulos (bypass de permisos).',
        'Si un usuario no tiene ningún rol asignado, verá una pantalla de bloqueo indicando que su cuenta está pendiente de activación.',
        'Si un rol es desactivado, los usuarios que solo tenían ese rol perderán acceso a los módulos correspondientes.',
        'Los permisos se evalúan en tiempo real: cualquier cambio en roles se refleja sin necesidad de cerrar sesión.',
      ],
    },
    {
      type: 'alert',
      data: {
        variant: 'info',
        title: 'Matriz de Permisos',
        message: 'La configuración de permisos se realiza desde Seguridad y Roles → pestaña Roles, donde se muestra una matriz visual que permite activar o desactivar cada permiso por módulo.',
      },
    },
  ],
};

// ─────────────── 4. Flujos Operativos ───────────────

const operationalFlowsSection: ManualSection = {
  id: 'flujos-operativos',
  title: 'Flujos Operativos',
  icon: 'ClipboardList',
  content: [
    { type: 'heading', data: 'Registro y auto-registro mediante enlaces' },
    {
      type: 'paragraph',
      data: 'La app permite generar enlaces de registro para empleados y candidatos. Estos enlaces se administran desde Empleados o desde los flujos de selección, según corresponda.',
    },
    {
      type: 'list',
      data: [
        'Use "Generar Enlace" para crear un token de auto-registro con fecha de expiración y campos habilitados.',
        'Use "Enlaces de Registro" para consultar enlaces vigentes, copiar el enlace, revocarlo o eliminarlo.',
        'Cada token puede tener un nombre descriptivo para identificar su campaña, vacante, centro o finalidad.',
        'El formulario público carga catálogos y validaciones según la empresa asociada al token.',
        'Si el token expira, fue revocado o ya fue usado cuando no era reutilizable, el formulario público bloquea el registro.',
      ],
    },
    { type: 'heading', data: 'Estados del empleado y filtros' },
    {
      type: 'table',
      data: {
        headers: ['Estado', 'Uso dentro de la app'],
        rows: [
          ['Activo', 'Empleado habilitado para la operación diaria y con vinculación vigente o disponible para procesos activos.'],
          ['Inactivo', 'Empleado suspendido o deshabilitado administrativamente sin que necesariamente exista un retiro contractual.'],
          ['En Retiro', 'Empleado con un proceso de desvinculación iniciado y pendiente de completar.'],
          ['Retirado', 'Empleado cuyo proceso de retiro fue completado y cuyo contrato quedó terminado.'],
          ['Nuevo', 'Empleado creado recientemente o pendiente de completar información operativa.'],
        ],
      },
    },
    {
      type: 'alert',
      data: {
        variant: 'info',
        title: 'Diferencia importante',
        message: 'Inactivo no es lo mismo que Retirado. Inactivo es una deshabilitación administrativa; Retirado proviene del proceso formal de desvinculación de un contrato.',
      },
    },
    { type: 'heading', data: 'Consulta 360 del empleado' },
    {
      type: 'paragraph',
      data: 'La Consulta 360 consolida la información más relevante de un empleado en una sola vista para facilitar auditoría, seguimiento y toma de decisiones.',
    },
    {
      type: 'list',
      data: [
        'Muestra resumen ejecutivo, KPIs, alertas y calidad de datos.',
        'Incluye datos personales, información laboral, contratos, procesos de retiro, vacaciones, permisos, incapacidades, capacitaciones, evaluaciones, salud ocupacional, dotación, novedades, turnos, documentos, auditoría y línea de tiempo.',
        'Los procesos de retiro muestran tipo de terminación, motivo, fecha de retiro, fecha efectiva, estado y contrato asociado.',
        'La línea de tiempo facilita revisar eventos relevantes en orden cronológico.',
      ],
    },
    { type: 'heading', data: 'Proceso de retiro contractual' },
    {
      type: 'list',
      data: [
        'Se inicia desde el detalle de un contrato activo con la opción "Iniciar Retiro".',
        'El usuario selecciona tipo de terminación, fecha de retiro, fecha efectiva y motivo.',
        'El sistema presenta un checklist de documentos requeridos según el tipo de terminación.',
        'Desde el checklist se pueden generar documentos de retiro, expedir certificación laboral y completar el proceso.',
        'Las plantillas descargables incluyen folio, número de archivo, datos del empleado y firma legal configurada cuando corresponde.',
        'La autorización de retiro de cesantías se genera sin encabezado ni pie de página porque es un documento expedido por el empleado.',
        'Al completar el retiro, el contrato queda terminado y se bloquean operaciones posteriores como editar, prorrogar o generar nuevos documentos del contrato.',
      ],
    },
    { type: 'heading', data: 'Certificaciones laborales' },
    {
      type: 'list',
      data: [
        'Desde Empleados o desde el proceso de retiro se puede abrir el modal de certificación laboral.',
        'La certificación automática toma los datos vigentes del sistema.',
        'La certificación manual permite personalizar información antes de generar el PDF.',
        'Puede incluir u ocultar salario según la necesidad del documento.',
        'Cada certificación genera folio y token de verificación pública para validar autenticidad.',
      ],
    },
    { type: 'heading', data: 'Permisos por rol en procesos operativos' },
    {
      type: 'paragraph',
      data: 'Los usuarios con roles diferentes a SuperAdmin o Administrador pueden ejecutar acciones de creación, modificación, retiro o gestión siempre que su rol tenga el permiso correspondiente en el módulo. Esto aplica a contratos, retiros, requisiciones, dotación, procesos disciplinarios y exámenes médicos.',
    },
  ],
};

// ─────────────── 5. Descripción de Módulos ───────────────

export interface ModuleDoc {
  moduleCode: string;
  title: string;
  icon: string;
  description: string;
  actions: string[];
  validations: string[];
  restrictions: string[];
  alerts: string[];
  dependencies: string[];
}

export const MODULE_DOCS: ModuleDoc[] = [
  {
    moduleCode: 'dashboard',
    title: 'Dashboard',
    icon: 'LayoutDashboard',
    description: 'Panel principal que muestra un resumen ejecutivo del estado de RRHH: KPIs clave, alertas pendientes, actividad reciente, distribución de empleados y contratos próximos a vencer.',
    actions: ['Ver indicadores clave (total empleados, contratos activos, vacaciones pendientes)', 'Revisar alertas del sistema', 'Acceder a acciones rápidas', 'Ver actividad reciente'],
    validations: ['Los datos se calculan en tiempo real a partir de los registros del sistema'],
    restrictions: ['Solo lectura; las acciones se redirigen a los módulos correspondientes'],
    alerts: ['Contratos próximos a vencer', 'Exámenes médicos por vencer', 'Dotación pendiente', 'Usuarios pendientes de activación'],
    dependencies: ['Empleados', 'Contratos', 'Vacaciones', 'Incapacidades'],
  },
  {
    moduleCode: 'empleados',
    title: 'Empleados',
    icon: 'Users',
    description: 'Gestión centralizada de empleados: datos personales, información laboral, documentos, certificaciones, tokens de auto-registro, estados operativos y Consulta 360°.',
    actions: ['Crear nuevo empleado', 'Editar información personal, contacto, familia, laboral, modalidad, seguridad social, banco y nómina', 'Subir uno o varios documentos', 'Registrar vacunaciones y certificaciones', 'Expedir certificación laboral automática o manual', 'Generar y nombrar enlaces de auto-registro', 'Filtrar por estado: todos, activos, inactivos, retirados, en retiro y nuevos', 'Inactivar o reactivar empleados administrativamente', 'Acceder a Consulta 360°'],
    validations: ['Documento de identidad único por empresa', 'Tipo y número de documento obligatorios', 'Campos obligatorios: nombre, apellido, tipo y número de documento', 'Formato de email válido', 'Centro de operación y cargo obligatorios cuando aplique', 'Las fechas se muestran y guardan sin desplazamiento de zona horaria'],
    restrictions: ['No se puede eliminar un empleado con contratos activos', 'El número de documento no se puede duplicar', 'Un empleado retirado conserva su historial para consulta y reportes'],
    alerts: ['Certificaciones próximas a vencer', 'Documentos obligatorios faltantes', 'Empleados en proceso de retiro', 'Calidad de datos incompleta en Consulta 360°'],
    dependencies: ['Contratos', 'Procesos de retiro', 'Centros de operación', 'Cargos', 'Áreas', 'Catálogos de identificación y seguridad social'],
  },
  {
    moduleCode: 'contratos',
    title: 'Contratos',
    icon: 'FileText',
    description: 'Administración completa del ciclo de vida contractual: creación, prórrogas, generación documental, vigencia, aprobación y proceso formal de retiro.',
    actions: ['Crear contrato', 'Seleccionar colaborador destino', 'Registrar prórrogas', 'Iniciar o continuar proceso de retiro', 'Generar documento de contrato en Word o PDF', 'Ver detalle, vigencia, aprobación e historial de prórrogas', 'Generar documentos de retiro con folio y número de archivo', 'Expedir certificación laboral desde el retiro'],
    validations: ['Un empleado no puede tener dos contratos activos simultáneamente', 'El salario debe ser mayor a cero', 'La fecha de inicio no puede ser posterior a la fecha de fin', 'El período de prueba no puede exceder los límites legales'],
    restrictions: ['Contratos a término fijo: máximo 3 años de duración, con prórrogas que no excedan 4 años acumulados', 'Solo se puede iniciar retiro sobre contratos vigentes o con retiro pendiente', 'Cuando el retiro queda completado, se bloquean editar contrato, nueva prórroga y generación de nuevos documentos contractuales'],
    alerts: ['Contratos que vencen en 30, 60 y 90 días', 'Preaviso de no renovación requerido', 'Límite de 4 años próximo a alcanzarse', 'Procesos de retiro pendientes'],
    dependencies: ['Empleados', 'Tipos de contrato', 'Firma legal', 'Centros de operación', 'Certificaciones laborales'],
  },
  {
    moduleCode: 'vacaciones',
    title: 'Vacaciones',
    icon: 'Palmtree',
    description: 'Control de vacaciones: saldos acumulados, solicitudes, aprobaciones y calendario visual. Calcula automáticamente los días disponibles según la antigüedad del empleado.',
    actions: ['Solicitar vacaciones', 'Aprobar/rechazar solicitudes', 'Consultar saldo de vacaciones', 'Ajustar saldos manualmente', 'Ver calendario de vacaciones'],
    validations: ['No se pueden solicitar más días de los disponibles', 'Las fechas no pueden solaparse con otras vacaciones aprobadas', 'No se permite solicitar vacaciones en fechas pasadas'],
    restrictions: ['Solo empleados con contrato activo pueden solicitar vacaciones', 'El saldo se calcula a partir de la fecha de ingreso'],
    alerts: ['Empleados con más de 2 períodos acumulados sin disfrutar', 'Solicitudes pendientes de aprobación'],
    dependencies: ['Empleados', 'Contratos', 'Días Festivos'],
  },
  {
    moduleCode: 'permisos',
    title: 'Permisos y Licencias',
    icon: 'ClipboardList',
    description: 'Gestión de permisos laborales (licencias remuneradas, no remuneradas, calamidad doméstica, licencia de maternidad/paternidad, etc.).',
    actions: ['Crear solicitud de permiso', 'Aprobar/rechazar permisos', 'Configurar tipos de permiso', 'Ver calendario de permisos'],
    validations: ['Los días solicitados no pueden exceder el máximo del tipo de permiso', 'Se valida solapamiento con vacaciones e incapacidades'],
    restrictions: ['Solo empleados con contrato activo', 'Algunos tipos de permiso requieren soporte documental'],
    alerts: ['Permisos pendientes de aprobación', 'Permisos que exceden el cupo anual'],
    dependencies: ['Empleados', 'Contratos', 'Vacaciones'],
  },
  {
    moduleCode: 'incapacidades',
    title: 'Incapacidades',
    icon: 'HeartPulse',
    description: 'Registro y seguimiento de incapacidades médicas: origen (común, laboral, maternidad), días, transcripción a EPS/ARL, recuperación de dinero.',
    actions: ['Registrar incapacidad', 'Registrar prórroga', 'Marcar como transcrita', 'Registrar recuperación de dinero', 'Exportar reporte'],
    validations: ['Fechas coherentes (inicio ≤ fin)', 'Diagnóstico y tipo de origen obligatorios', 'Número de días se calcula automáticamente'],
    restrictions: ['Solo empleados activos', 'Las prórrogas deben ser consecutivas'],
    alerts: ['Incapacidades no transcritas', 'Dinero pendiente de recuperar', 'Incapacidades de larga duración (>180 días)'],
    dependencies: ['Empleados', 'EPS', 'ARL'],
  },
  {
    moduleCode: 'dotacion',
    title: 'Dotación',
    icon: 'Package',
    description: 'Administración de entregas de dotación a empleados: catálogo de artículos, profesiograma por centro y cargo, inventario, movimientos, firma digital y cumplimiento.',
    actions: ['Registrar entrega de dotación', 'Gestionar catálogo de artículos', 'Configurar profesiograma', 'Consultar cumplimiento', 'Gestionar inventario y movimientos', 'Exportar acta de entrega en PDF'],
    validations: ['El profesiograma define qué artículos corresponden a cada centro+cargo', 'La firma digital es obligatoria para confirmar la entrega', 'Las tallas deben seleccionarse de opciones válidas', 'La creación y actualización respeta los permisos del rol asignado'],
    restrictions: ['Solo empleados activos pueden recibir dotación', 'El inventario no puede quedar en negativo'],
    alerts: ['Artículos con stock bajo', 'Empleados sin dotación completa según profesiograma', 'Dotación próxima a vencer'],
    dependencies: ['Empleados', 'Centros de operación', 'Cargos', 'Tipos de dotación'],
  },
  {
    moduleCode: 'examenes',
    title: 'Exámenes Médicos',
    icon: 'Stethoscope',
    description: 'Control de exámenes médicos ocupacionales: catálogo de exámenes, profesiograma por centro y cargo, órdenes, resultados, firma y documentos adjuntos.',
    actions: ['Registrar aplicación de exámenes', 'Gestionar catálogo de exámenes', 'Configurar profesiograma', 'Ver detalle con resultados', 'Generar orden o acta en PDF'],
    validations: ['El profesiograma define qué exámenes corresponden por centro+cargo', 'El resultado de cada examen es obligatorio cuando se registra el cierre', 'La fecha de examen no puede ser futura', 'La creación y actualización respeta los permisos del rol asignado'],
    restrictions: ['Solo empleados activos', 'Los exámenes con concepto "No Apto" generan alertas'],
    alerts: ['Exámenes próximos a vencer', 'Empleados sin exámenes completos según profesiograma', 'Exámenes con concepto No Apto'],
    dependencies: ['Empleados', 'Centros de operación', 'Cargos'],
  },
  {
    moduleCode: 'capacitaciones',
    title: 'Capacitaciones',
    icon: 'GraduationCap',
    description: 'Plataforma completa de capacitación: creación de cursos (manual o asistida por IA), biblioteca de contenidos, sesiones, evaluaciones, evidencias con firma, cumplimiento y analíticas.',
    actions: ['Crear capacitación (manual o con IA)', 'Gestionar biblioteca de cursos', 'Crear y gestionar sesiones', 'Registrar asistencia con firma y evidencias', 'Configurar evaluaciones', 'Generar enlaces de acceso público', 'Consultar cumplimiento', 'Ver analíticas'],
    validations: ['Nombre del curso obligatorio', 'Al menos un módulo por curso', 'Firma obligatoria para registro de asistencia'],
    restrictions: ['El acceso público requiere un enlace generado', 'Las evaluaciones solo se pueden responder una vez por sesión'],
    alerts: ['Certificaciones próximas a vencer', 'Sesiones sin evidencia cargada', 'Empleados con capacitaciones obligatorias pendientes'],
    dependencies: ['Empleados', 'Centros de operación'],
  },
  {
    moduleCode: 'evaluaciones',
    title: 'Evaluaciones de Desempeño',
    icon: 'Target',
    description: 'Sistema de evaluación por competencias: plantillas configurables, ciclos de evaluación, aplicación con rúbricas, metas, seguimiento y analíticas.',
    actions: ['Crear plantillas de evaluación', 'Crear ciclos de evaluación', 'Aplicar evaluaciones', 'Registrar metas', 'Ver resultados y analíticas', 'Exportar evaluación en PDF'],
    validations: ['La plantilla debe tener al menos un criterio', 'Los pesos de los criterios deben sumar 100%', 'La calificación debe estar en el rango definido por la rúbrica'],
    restrictions: ['Solo se puede evaluar empleados activos', 'Un empleado solo puede ser evaluado una vez por ciclo'],
    alerts: ['Evaluaciones pendientes de completar', 'Ciclos próximos a cerrar'],
    dependencies: ['Empleados', 'Contratos'],
  },
  {
    moduleCode: 'disciplinarios',
    title: 'Procesos Disciplinarios',
    icon: 'Gavel',
    description: 'Gestión completa de procesos disciplinarios según la legislación colombiana: apertura, notificación, descargos, evidencias, decisión, apelación y cierre.',
    actions: ['Abrir proceso disciplinario', 'Registrar evidencias', 'Generar enlace público de descargos', 'Consultar árbol o detalle del proceso', 'Registrar decisión', 'Registrar apelación', 'Exportar documentos en PDF'],
    validations: ['El empleado debe tener contrato activo', 'La fecha de la falta es obligatoria', 'La descripción de los hechos es obligatoria', 'La creación y actualización respeta los permisos del rol asignado'],
    restrictions: ['El flujo sigue un orden estricto: apertura → notificación → descargos → decisión → apelación', 'Los descargos pueden ser presentados por el empleado vía enlace público'],
    alerts: ['Procesos sin descargos registrados', 'Procesos pendientes de decisión', 'Plazos legales próximos a vencer'],
    dependencies: ['Empleados', 'Contratos'],
  },
  {
    moduleCode: 'cesantias',
    title: 'Cesantías',
    icon: 'Landmark',
    description: 'Control de consignaciones de cesantías, pago de intereses y retiros parciales conforme a la legislación colombiana.',
    actions: ['Registrar consignación de cesantías', 'Registrar pago de intereses', 'Registrar retiro parcial', 'Importar masivamente', 'Consultar histórico por empleado'],
    validations: ['El monto de cesantías se calcula sobre salario base y días trabajados', 'Los intereses se calculan al 12% anual proporcional', 'La fecha límite de consignación es el 14 de febrero del año siguiente'],
    restrictions: ['Solo empleados con contrato activo', 'Los retiros parciales requieren justificación y documentación'],
    alerts: ['Consignaciones con mora', 'Intereses no pagados antes del 31 de enero', 'Retiros parciales pendientes de aprobación'],
    dependencies: ['Empleados', 'Contratos'],
  },
  {
    moduleCode: 'requisiciones',
    title: 'Requisiciones de Personal',
    icon: 'ClipboardList',
    description: 'Flujo de solicitud de personal nuevo o reemplazo: creación de requisición, aprobación por niveles, publicación de vacante y seguimiento detallado.',
    actions: ['Crear requisición desde modal por pestañas', 'Registrar solicitud, posición, reemplazo, condiciones, beneficios y solicitante', 'Aprobar/rechazar requisición', 'Ver detalle y línea de tiempo del proceso', 'Exportar requisición en PDF'],
    validations: ['El cargo y centro de operación son obligatorios', 'La justificación es obligatoria', 'La fecha de ingreso estimada debe cumplir el mínimo configurado', 'El salario propuesto debe estar dentro del rango del cargo', 'El día de descanso y turno deben estar dentro de las opciones válidas'],
    restrictions: ['Requiere aprobación según el flujo configurado', 'No se puede modificar una requisición ya aprobada'],
    alerts: ['Requisiciones pendientes de aprobación', 'Requisiciones vencidas sin cubrir'],
    dependencies: ['Cargos', 'Centros de operación', 'Áreas'],
  },
  {
    moduleCode: 'seleccion',
    title: 'Selección y Vacantes',
    icon: 'UserSearch',
    description: 'Gestión del proceso de selección: publicación de vacantes, registro de candidatos, evaluación por etapas, analítica y vinculación del candidato seleccionado como empleado.',
    actions: ['Crear vacante desde modal responsivo', 'Registrar candidatos manualmente o mediante enlace público', 'Avanzar candidatos por etapas', 'Registrar resultados de cada etapa', 'Vincular candidato seleccionado como empleado', 'Consultar analítica de selección'],
    validations: ['El candidato debe tener documento de identidad único por vacante', 'Cada etapa requiere evaluación antes de avanzar'],
    restrictions: ['Solo vacantes activas permiten agregar candidatos', 'Un candidato solo puede ser seleccionado una vez por vacante'],
    alerts: ['Vacantes abiertas sin candidatos', 'Candidatos estancados en una etapa por más de 15 días'],
    dependencies: ['Requisiciones', 'Cargos', 'Centros de operación'],
  },
  {
    moduleCode: 'jornadas',
    title: 'Jornadas y Turnos',
    icon: 'Briefcase',
    description: 'Configuración de jornadas laborales, turnos rotativos, ciclos de trabajo y asignación de horarios a empleados.',
    actions: ['Crear turnos de trabajo', 'Crear jornadas laborales', 'Configurar ciclos rotativos', 'Asignar turnos a empleados', 'Generar calendario de turnos', 'Exportar reporte de turnos'],
    validations: ['Los turnos no pueden solaparse para un mismo empleado', 'Las horas del turno deben ser coherentes', 'El ciclo debe cubrir al menos una semana'],
    restrictions: ['Los turnos asignados afectan el cálculo de horas extras y recargos'],
    alerts: ['Empleados sin turno asignado', 'Conflictos de horario'],
    dependencies: ['Empleados', 'Centros de operación'],
  },
  {
    moduleCode: 'novedades',
    title: 'Novedades de Nómina',
    icon: 'Clock',
    description: 'Registro de novedades que afectan la nómina: horas extras, recargos, bonificaciones, deducciones y demás conceptos variables en una vista responsiva.',
    actions: ['Registrar novedad', 'Editar novedad pendiente', 'Eliminar novedad', 'Filtrar por período, empleado y tipo', 'Aprobar novedades pendientes cuando el rol lo permite', 'Duplicar novedades recurrentes', 'Imprimir comprobante o exportar a Excel'],
    validations: ['El concepto y valor son obligatorios', 'El período de la novedad no puede estar cerrado', 'Las horas extras se validan contra el turno asignado'],
    restrictions: ['No se pueden modificar novedades de períodos cerrados', 'Las novedades aprobadas no se pueden eliminar'],
    alerts: ['Novedades pendientes de aprobación', 'Novedades duplicadas para el mismo concepto y período'],
    dependencies: ['Empleados', 'Jornadas', 'Pre-Liquidación'],
  },
  {
    moduleCode: 'pre_liquidacion',
    title: 'Pre-Liquidación',
    icon: 'Calculator',
    description: 'Generación de la pre-liquidación de nómina: consolida todas las novedades, devengos y deducciones del período para su revisión antes del cierre.',
    actions: ['Generar pre-liquidación del período', 'Revisar detalle por empleado', 'Exportar a Excel', 'Configurar parámetros de liquidación'],
    validations: ['Todas las novedades del período deben estar registradas', 'Los porcentajes de seguridad social se aplican según la normativa vigente'],
    restrictions: ['No se puede generar si el período anterior no está cerrado', 'Los cambios en novedades requieren regenerar la pre-liquidación'],
    alerts: ['Empleados sin novedades en el período', 'Diferencias significativas respecto al período anterior'],
    dependencies: ['Novedades', 'Empleados', 'Contratos', 'Configuración Laboral'],
  },
  {
    moduleCode: 'config_laboral',
    title: 'Configuración Laboral',
    icon: 'Settings',
    description: 'Parámetros generales para el cálculo de nómina: salario mínimo, auxilio de transporte, porcentajes de seguridad social, horas extras y recargos.',
    actions: ['Configurar salario mínimo vigente', 'Configurar auxilio de transporte', 'Configurar porcentajes de aportes', 'Configurar valores de horas extras y recargos'],
    validations: ['Los porcentajes deben estar en rangos válidos', 'El salario mínimo debe ser mayor a cero'],
    restrictions: ['Solo el Administrador puede modificar estos parámetros', 'Los cambios aplican para liquidaciones futuras'],
    alerts: ['Parámetros desactualizados para el año en curso'],
    dependencies: ['Pre-Liquidación', 'Novedades'],
  },
  {
    moduleCode: 'prestamos',
    title: 'Préstamos',
    icon: 'Landmark',
    description: 'Gestión de préstamos otorgados a empleados, cuotas, saldos, refinanciaciones y descuentos asociados a nómina.',
    actions: ['Crear préstamo', 'Definir cuotas y periodicidad', 'Registrar pagos o abonos', 'Refinanciar préstamo', 'Consultar saldo y estado', 'Exportar reporte'],
    validations: ['El empleado debe existir y estar asociado a la empresa', 'El monto y número de cuotas deben ser mayores a cero', 'La cuota no puede quedar sin fecha o período de aplicación'],
    restrictions: ['Los préstamos cerrados no deben modificarse salvo ajustes autorizados', 'Los descuentos se reflejan en nómina según configuración'],
    alerts: ['Cuotas vencidas', 'Préstamos con saldo pendiente', 'Diferencias entre saldo y pagos registrados'],
    dependencies: ['Empleados', 'Contratos', 'Pre-Liquidación', 'Descuentos'],
  },
  {
    moduleCode: 'descuentos',
    title: 'Descuentos',
    icon: 'ClipboardList',
    description: 'Registro y control de descuentos de nómina diferentes a préstamos, tales como libranzas, embargos, anticipos u otros conceptos autorizados.',
    actions: ['Crear descuento', 'Editar descuento activo', 'Suspender o finalizar descuento', 'Consultar histórico', 'Exportar reporte'],
    validations: ['El empleado y concepto son obligatorios', 'El valor debe ser mayor a cero', 'Las fechas deben ser coherentes con el período de aplicación'],
    restrictions: ['No se deben modificar descuentos de períodos cerrados', 'Los descuentos finalizados se conservan para histórico'],
    alerts: ['Descuentos próximos a finalizar', 'Descuentos pendientes de aplicar', 'Valores atípicos frente al salario'],
    dependencies: ['Empleados', 'Contratos', 'Pre-Liquidación', 'Configuración Laboral'],
  },
  {
    moduleCode: 'calendario',
    title: 'Calendario Unificado',
    icon: 'Calendar',
    description: 'Vista consolidada de todos los eventos del sistema: vacaciones aprobadas, permisos, incapacidades, sesiones de capacitación, vencimientos de contratos y días festivos.',
    actions: ['Ver calendario mensual/semanal', 'Filtrar por tipo de evento', 'Filtrar por empleado o centro'],
    validations: [],
    restrictions: ['Solo lectura; los eventos se gestionan desde sus módulos correspondientes'],
    alerts: [],
    dependencies: ['Vacaciones', 'Permisos', 'Incapacidades', 'Capacitaciones', 'Días Festivos'],
  },
  {
    moduleCode: 'reportes',
    title: 'Reportes',
    icon: 'FileBarChart',
    description: 'Centro de reportes con informes predefinidos para cada módulo: empleados, contratos, vacaciones, incapacidades, dotación, capacitaciones, horas extras, y más. Exportables a Excel.',
    actions: ['Generar reportes por módulo', 'Filtrar por rango de fechas, centro, área', 'Exportar a Excel'],
    validations: ['El rango de fechas es obligatorio para reportes temporales'],
    restrictions: ['Los reportes muestran solo datos de la empresa del usuario'],
    alerts: [],
    dependencies: ['Todos los módulos'],
  },
  {
    moduleCode: 'organigrama',
    title: 'Organigrama',
    icon: 'Network',
    description: 'Visualización jerárquica de la estructura organizacional: áreas, sub-áreas, cargos y empleados en formato de árbol interactivo.',
    actions: ['Visualizar organigrama completo', 'Expandir/colapsar áreas', 'Filtrar por centro de operación'],
    validations: [],
    restrictions: ['Solo lectura; la estructura se gestiona desde Áreas y Cargos'],
    alerts: ['Áreas sin responsable asignado'],
    dependencies: ['Áreas', 'Cargos', 'Empleados'],
  },
  {
    moduleCode: 'analitica',
    title: 'Analítica RRHH',
    icon: 'BarChart3',
    description: 'Panel analítico con indicadores clave de gestión humana: rotación, ausentismo, distribución demográfica, cumplimiento de dotación y capacitaciones.',
    actions: ['Ver KPIs de rotación y ausentismo', 'Ver distribución por sexo biológico, área, centro', 'Ver gráficos de cumplimiento', 'Filtrar por período y centro'],
    validations: [],
    restrictions: ['Solo lectura; los datos provienen de los módulos operativos'],
    alerts: [],
    dependencies: ['Empleados', 'Contratos', 'Vacaciones', 'Incapacidades', 'Permisos'],
  },
  {
    moduleCode: 'analitica_seleccion',
    title: 'Analítica de Selección',
    icon: 'BarChart3',
    description: 'Panel de indicadores del proceso de selección: vacantes, candidatos, tiempos por etapa, efectividad de fuentes y avance del embudo.',
    actions: ['Ver KPIs de selección', 'Analizar embudo de candidatos', 'Filtrar por fecha, vacante o centro', 'Identificar etapas con mayor permanencia'],
    validations: [],
    restrictions: ['Solo lectura; los datos provienen de Selección y Vacantes'],
    alerts: [],
    dependencies: ['Selección y Vacantes', 'Requisiciones', 'Candidatos'],
  },
  {
    moduleCode: 'analitica_nomina',
    title: 'Analítica Nómina',
    icon: 'BarChart3',
    description: 'Panel de análisis de nómina para revisar tendencias de novedades, recargos, devengos, deducciones y variaciones por período.',
    actions: ['Ver indicadores de nómina', 'Filtrar por período, centro o tipo de novedad', 'Comparar variaciones', 'Identificar conceptos atípicos'],
    validations: [],
    restrictions: ['Solo lectura; los datos dependen de la información registrada en novedades y pre-liquidación'],
    alerts: [],
    dependencies: ['Novedades', 'Pre-Liquidación', 'Configuración Laboral'],
  },
  {
    moduleCode: 'analitica_incapacidades',
    title: 'Analitica de Incapacidades',
    icon: 'BarChart3',
    description: 'Panel especializado para analizar incapacidades medicas, dias acumulados, recobros, responsables legales, recurrencia, diagnosticos y tendencias de ausentismo.',
    actions: ['Ver KPIs de incapacidades', 'Filtrar por periodo, origen y estado de recobro', 'Analizar recobros estimados vs recuperados', 'Identificar casos con seguimiento legal o reintegro', 'Consultar diagnosticos, entidades y empleados recurrentes'],
    validations: [],
    restrictions: ['Solo lectura; depende de la informacion registrada en Incapacidades y Empleados'],
    alerts: ['Casos prolongados mayores a 30 dias', 'Umbrales legales de 120, 180 y 540 dias', 'Recobros pendientes o sin pago'],
    dependencies: ['Incapacidades', 'Empleados', 'Examenes Medicos'],
  },
  {
    moduleCode: 'analitica_capacitaciones',
    title: 'Analítica de Capacitaciones',
    icon: 'BarChart3',
    description: 'Panel de seguimiento de formación: cumplimiento, asistencia, evaluaciones, certificaciones y cursos obligatorios.',
    actions: ['Ver cumplimiento por curso o centro', 'Analizar asistencia', 'Consultar resultados de evaluaciones', 'Identificar certificaciones próximas a vencer'],
    validations: [],
    restrictions: ['Solo lectura; depende de sesiones, evidencias y evaluaciones registradas'],
    alerts: ['Capacitaciones obligatorias pendientes', 'Certificaciones próximas a vencer'],
    dependencies: ['Capacitaciones', 'Empleados', 'Centros de operación'],
  },
  {
    moduleCode: 'analitica_evaluaciones',
    title: 'Analítica de Evaluaciones',
    icon: 'BarChart3',
    description: 'Panel de resultados de desempeño para analizar puntajes, competencias, metas y evolución por ciclos.',
    actions: ['Ver resultados por ciclo', 'Comparar puntajes por área o cargo', 'Identificar brechas de competencias', 'Exportar información de análisis'],
    validations: [],
    restrictions: ['Solo lectura; depende de evaluaciones completadas'],
    alerts: ['Ciclos pendientes de cierre', 'Evaluaciones incompletas'],
    dependencies: ['Evaluaciones de Desempeño', 'Empleados', 'Cargos'],
  },
  {
    moduleCode: 'centros',
    title: 'Centros de Operación',
    icon: 'Network',
    description: 'Administración de centros de operación y fichas de centro usadas para clasificar empleados, requisiciones, contratos, dotación, exámenes y reportes.',
    actions: ['Crear y editar centros', 'Consultar fichas de centro', 'Asignar datos operativos', 'Usar centros como filtro transversal'],
    validations: ['El nombre del centro debe ser único por empresa', 'Los datos obligatorios de la ficha deben completarse cuando el proceso lo requiera'],
    restrictions: ['No se deben eliminar centros usados por empleados o procesos históricos'],
    alerts: ['Centros incompletos', 'Centros sin responsables o configuración requerida'],
    dependencies: ['Empleados', 'Contratos', 'Requisiciones', 'Dotación', 'Exámenes Médicos', 'Reportes'],
  },
  {
    moduleCode: 'catalogos',
    title: 'Catálogos',
    icon: 'FolderOpen',
    description: 'Configuración de datos maestros del sistema: áreas, cargos, tipos de contrato, tipos de dotación, entidades de seguridad social, bancos, días festivos, motivos de novedad, plataformas de publicación, tipos de identificación, niveles educativos y profesiones. Incluye perfiles de cargo con anexos por centro de operación.',
    actions: [
      'Crear, editar y desactivar registros de cada catálogo',
      'Importar datos',
      'Gestionar perfiles de cargo (profesiograma)',
      'Crear anexos por centro de operación para personalizar campos específicos del perfil de un cargo sin duplicar el perfil completo',
      'Activar solo los campos que necesitan cambiar en cada anexo (los demás se heredan del perfil base)',
      'Editar o eliminar anexos existentes',
    ],
    validations: ['Nombres únicos por empresa', 'Códigos únicos cuando aplica', 'Un centro de operación solo puede tener un anexo por perfil de cargo'],
    restrictions: ['No se pueden eliminar registros en uso por otros módulos', 'La desactivación no elimina los registros existentes', 'Al eliminar un anexo, el perfil base sigue aplicando para ese centro'],
    alerts: ['Catálogos vacíos que bloquean funcionalidad de otros módulos'],
    dependencies: ['Todos los módulos que referencian datos maestros'],
  },
  {
    moduleCode: 'alertas',
    title: 'Centro de Alertas',
    icon: 'Bell',
    description: 'Consolidación de todas las alertas y notificaciones del sistema: vencimientos, pendientes, advertencias y recordatorios.',
    actions: ['Ver todas las alertas activas', 'Filtrar por tipo y prioridad', 'Marcar como leída', 'Navegar al módulo relacionado'],
    validations: [],
    restrictions: ['Las alertas se generan automáticamente; no se pueden crear manualmente'],
    alerts: [],
    dependencies: ['Todos los módulos'],
  },
  {
    moduleCode: 'asistente_ia',
    title: 'Asistente IA',
    icon: 'User',
    description: 'Asistente conversacional para guiar al usuario en el uso de la app, orientar procesos y explicar módulos según el contexto de la pantalla actual.',
    actions: ['Abrir chat de ayuda', 'Consultar cómo realizar procesos', 'Recibir guía paso a paso', 'Usar sugerencias relacionadas con el módulo actual'],
    validations: ['La disponibilidad puede depender de la configuración de acceso a IA por usuario'],
    restrictions: ['El asistente orienta sobre el uso de la app; no reemplaza validaciones legales ni consultas oficiales de datos si no tiene acceso al módulo correspondiente'],
    alerts: [],
    dependencies: ['Configuración', 'Seguridad y Roles'],
  },
  {
    moduleCode: 'auditoria',
    title: 'Auditoría',
    icon: 'ShieldCheck',
    description: 'Consulta de trazabilidad del sistema con acciones realizadas por usuarios, entidad afectada, módulo, fecha, valores anteriores y nuevos cuando aplica.',
    actions: ['Consultar log de auditoría', 'Filtrar por usuario, acción, módulo, entidad y rango de fechas', 'Revisar cambios antes/después', 'Usar paginación para búsquedas extensas'],
    validations: ['Los eventos se registran automáticamente cuando una operación relevante se ejecuta correctamente'],
    restrictions: ['El log es de solo lectura y no debe ser alterado por usuarios operativos'],
    alerts: ['Operaciones críticas realizadas', 'Cambios masivos o inusuales'],
    dependencies: ['Todos los módulos', 'Seguridad y Roles'],
  },
  {
    moduleCode: 'configuracion',
    title: 'Configuración',
    icon: 'Settings',
    description: 'Parámetros generales de la plataforma, incluyendo datos de empresa, preferencias, firma legal, acceso a IA, alertas y configuraciones transversales.',
    actions: ['Editar parámetros generales', 'Configurar firma legal para documentos', 'Configurar días de alerta de procesos de retiro', 'Administrar acceso al asistente IA', 'Ajustar preferencias operativas'],
    validations: ['La firma legal debe tener datos suficientes para aparecer en plantillas corporativas', 'Los rangos de alerta deben ser numéricos y coherentes'],
    restrictions: ['Las configuraciones sensibles requieren permisos administrativos'],
    alerts: ['Firma legal incompleta', 'Parámetros críticos sin configurar'],
    dependencies: ['Contratos', 'Procesos de retiro', 'Asistente IA', 'Centro de Alertas'],
  },
  {
    moduleCode: 'seguridad',
    title: 'Seguridad y Roles',
    icon: 'ShieldCheck',
    description: 'Administración de usuarios, roles dinámicos, permisos granulares, vinculación de empleados, invitaciones, empresas, centros y acceso al sistema.',
    actions: ['Gestionar usuarios (invitar, asignar roles, vincular empleado)', 'Crear y configurar roles con permisos por módulo', 'Asignar empresas y centros permitidos', 'Activar o desactivar usuarios', 'Editar nombre visible del usuario', 'Vincular o desvincular empleado'],
    validations: ['El nombre del rol debe ser único', 'Al menos un permiso debe estar activo por rol', 'El email de invitación debe ser válido'],
    restrictions: ['Solo usuarios con permiso de seguridad pueden gestionar usuarios y roles', 'El rol Administrador no se puede eliminar ni desactivar', 'No se puede eliminar un rol asignado a usuarios activos'],
    alerts: ['Usuarios sin rol asignado', 'Roles sin permisos configurados'],
    dependencies: ['Todos los módulos (control de acceso)'],
  },
  {
    moduleCode: 'portal',
    title: 'Portal del Empleado',
    icon: 'User',
    description: 'Vista de autoservicio para empleados: información personal, documentos, certificados, vacaciones, permisos, incapacidades y solicitudes de cambio.',
    actions: ['Ver información personal', 'Descargar documentos propios', 'Consultar certificados', 'Consultar saldo de vacaciones', 'Solicitar cambios de datos'],
    validations: ['El empleado debe estar vinculado a un usuario del sistema'],
    restrictions: ['Solo puede ver su propia información', 'Las solicitudes de cambio requieren aprobación de RRHH'],
    alerts: ['Documentos pendientes de firma', 'Solicitudes de cambio sin respuesta'],
    dependencies: ['Empleados', 'Vinculación de usuario-empleado'],
  },
];

// ─────────────── 5. Alertas y Mensajes del Sistema ───────────────

const alertsSection: ManualSection = {
  id: 'alertas-sistema',
  title: 'Alertas y Mensajes del Sistema',
  icon: 'Bell',
  content: [
    { type: 'heading', data: 'Tipos de alertas' },
    {
      type: 'table',
      data: {
        headers: ['Tipo', 'Color', 'Descripción', 'Ejemplo'],
        rows: [
          ['Informativa', '🔵 Azul', 'Notifica una acción exitosa o información relevante', 'Registro guardado correctamente'],
          ['Advertencia', '🟡 Amarillo', 'Indica una situación que requiere atención', 'El contrato vence en 30 días'],
          ['Error', '🔴 Rojo', 'Indica un problema que impide completar la acción', 'No se pudo guardar: campos obligatorios vacíos'],
          ['Confirmación', '⚪ Neutral', 'Solicita confirmación antes de una acción destructiva', '¿Está seguro de eliminar este registro?'],
        ],
      },
    },
    { type: 'heading', data: 'Bloqueos por permisos' },
    {
      type: 'paragraph',
      data: 'Cuando un usuario intenta acceder a un módulo o realizar una acción para la cual no tiene permisos, el sistema mostrará un mensaje indicando "No tiene permisos para realizar esta acción" o el botón/opción simplemente no estará visible.',
    },
    { type: 'heading', data: 'Mensaje de cuenta sin rol' },
    {
      type: 'alert',
      data: {
        variant: 'warning',
        title: 'Cuenta pendiente de activación',
        message: 'Si ve este mensaje al iniciar sesión, significa que su cuenta aún no tiene un rol asignado. Contacte al Administrador del sistema para que le asigne los permisos correspondientes.',
      },
    },
  ],
};

// ─────────────── 6. Reglas de Negocio ───────────────

const businessRulesSection: ManualSection = {
  id: 'reglas-negocio',
  title: 'Reglas de Negocio y Restricciones',
  icon: 'Scale',
  content: [
    { type: 'heading', data: 'Restricciones de acceso' },
    {
      type: 'list',
      data: [
        'Todo acceso está controlado por el sistema de roles y permisos dinámicos.',
        'Los usuarios sin rol asignado quedan bloqueados en una pantalla de espera.',
        'Los módulos no visibles en el menú lateral no son accesibles ni por URL directa.',
        'Las acciones de escritura (crear, editar, eliminar) requieren permisos explícitos.',
      ],
    },
    { type: 'heading', data: 'Validaciones de formularios' },
    {
      type: 'list',
      data: [
        'Los campos marcados con asterisco (*) son obligatorios.',
        'Las fechas se validan para coherencia (inicio ≤ fin).',
        'Los valores numéricos (salarios, montos) deben ser positivos.',
        'Los documentos de identidad deben ser únicos por empresa.',
        'Los correos electrónicos deben tener formato válido.',
      ],
    },
    { type: 'heading', data: 'Restricciones de eliminación' },
    {
      type: 'list',
      data: [
        'No se pueden eliminar registros que están referenciados por otros módulos.',
        'Antes de eliminar, el sistema solicita confirmación explícita.',
        'Los registros eliminados no son recuperables.',
        'Los catálogos en uso solo se pueden desactivar, no eliminar.',
      ],
    },
    { type: 'heading', data: 'Estados y ciclos de vida' },
    {
      type: 'list',
      data: [
        'Los registros desactivados dejan de aparecer en listas de selección pero se conservan en el histórico.',
        'Los procesos con flujo (disciplinarios, requisiciones) siguen un orden estricto de estados.',
        'Los contratos terminados no permiten operaciones adicionales.',
      ],
    },
  ],
};

// ─────────────── 7. Fórmulas y Cálculos ───────────────

const formulasSection: ManualSection = {
  id: 'formulas',
  title: 'Fórmulas y Cálculos',
  icon: 'Calculator',
  content: [
    { type: 'heading', data: 'Vacaciones' },
    {
      type: 'formula',
      data: {
        name: 'Días de vacaciones acumulados',
        formula: 'Días = (Días trabajados × 15) ÷ 360',
        variables: [
          'Días trabajados: desde la fecha de ingreso hasta la fecha de corte',
          '15: días hábiles de vacaciones por año según la ley colombiana',
          '360: base anual de cálculo',
        ],
        example: 'Un empleado con 180 días trabajados: (180 × 15) ÷ 360 = 7.5 días acumulados',
      },
    },
    { type: 'heading', data: 'Cesantías' },
    {
      type: 'formula',
      data: {
        name: 'Cesantías del período',
        formula: 'Cesantías = (Salario mensual × Días trabajados) ÷ 360',
        variables: [
          'Salario mensual: salario base + auxilio de transporte (si aplica)',
          'Días trabajados: días del período de cálculo',
        ],
        example: 'Salario $1,300,000 + transporte $162,000, 360 días: ($1,462,000 × 360) ÷ 360 = $1,462,000',
      },
    },
    {
      type: 'formula',
      data: {
        name: 'Intereses sobre cesantías',
        formula: 'Intereses = Cesantías × Días × 0.12 ÷ 360',
        variables: [
          'Cesantías: monto de cesantías acumuladas',
          'Días: días del período de causación',
          '0.12: tasa del 12% anual',
        ],
        example: 'Cesantías $1,462,000, 360 días: $1,462,000 × 360 × 0.12 ÷ 360 = $175,440',
      },
    },
    { type: 'heading', data: 'Horas Extras y Recargos' },
    {
      type: 'table',
      data: {
        headers: ['Concepto', 'Recargo', 'Fórmula'],
        rows: [
          ['Hora extra diurna', '25%', 'Valor hora × 1.25'],
          ['Hora extra nocturna', '75%', 'Valor hora × 1.75'],
          ['Hora extra dominical/festiva diurna', '100%', 'Valor hora × 2.00'],
          ['Hora extra dominical/festiva nocturna', '150%', 'Valor hora × 2.50'],
          ['Recargo nocturno', '35%', 'Valor hora × 0.35'],
          ['Recargo dominical/festivo', '75%', 'Valor hora × 1.75'],
        ],
      },
    },
    {
      type: 'formula',
      data: {
        name: 'Valor hora ordinaria',
        formula: 'Valor hora = Salario mensual ÷ 240',
        variables: ['Salario mensual: salario base del contrato', '240: horas laborales mensuales (30 días × 8 horas)'],
        example: 'Salario $2,400,000: $2,400,000 ÷ 240 = $10,000 por hora',
      },
    },
    { type: 'heading', data: 'Seguridad Social (aportes del empleador)' },
    {
      type: 'table',
      data: {
        headers: ['Concepto', 'Porcentaje empleador', 'Base de cálculo'],
        rows: [
          ['Salud (EPS)', '8.5%', 'Salario base'],
          ['Pensión (AFP)', '12%', 'Salario base'],
          ['ARL', '0.522% - 6.960%', 'Salario base (varía según nivel de riesgo)'],
          ['Caja Compensación (CCF)', '4%', 'Salario base'],
          ['SENA', '2%', 'Salario base'],
          ['ICBF', '3%', 'Salario base'],
        ],
      },
    },
  ],
};

// ─────────────── 8. Auditoría y Seguridad ───────────────

const auditSection: ManualSection = {
  id: 'auditoria',
  title: 'Auditoría y Seguridad',
  icon: 'ShieldCheck',
  content: [
    { type: 'heading', data: 'Registro de auditoría' },
    {
      type: 'paragraph',
      data: 'El sistema registra automáticamente todas las acciones relevantes realizadas por los usuarios: creación, modificación y eliminación de registros en todos los módulos.',
    },
    { type: 'heading', data: '¿Qué se registra?' },
    {
      type: 'list',
      data: [
        'Usuario que realizó la acción',
        'Tipo de acción (crear, actualizar, eliminar)',
        'Módulo y entidad afectada',
        'Valores anteriores y nuevos (cuando aplica)',
        'Fecha y hora exacta',
        'Dirección IP y navegador',
      ],
    },
    { type: 'heading', data: 'Protecciones del sistema' },
    {
      type: 'list',
      data: [
        'Autenticación obligatoria para todas las operaciones.',
        'Políticas de seguridad a nivel de base de datos (Row Level Security) que garantizan que cada usuario solo accede a datos de su empresa.',
        'Los tokens de sesión expiran automáticamente.',
        'Las contraseñas se almacenan con encriptación segura.',
        'Los archivos subidos se almacenan en infraestructura segura con acceso controlado.',
        'El log de auditoría es inmutable: no se puede editar ni eliminar.',
      ],
    },
    {
      type: 'alert',
      data: {
        variant: 'info',
        title: 'Acceso al log de auditoría',
        message: 'El log de auditoría está disponible en Seguridad y Roles → pestaña Auditoría. Soporta paginación, filtrado por acción, tipo de entidad, usuario y rango de fechas.',
      },
    },
  ],
};

// ─────────────── 9. FAQ ───────────────

const faqSection: ManualSection = {
  id: 'faq',
  title: 'Preguntas Frecuentes (FAQ)',
  icon: 'HelpCircle',
  content: [
    { type: 'heading', data: '¿Por qué no puedo acceder a la aplicación después de registrarme?' },
    {
      type: 'paragraph',
      data: 'Su cuenta necesita un rol asignado por el Administrador. Contacte al administrador del sistema para que active su acceso.',
    },
    { type: 'heading', data: '¿Por qué no veo ciertos módulos en el menú?' },
    {
      type: 'paragraph',
      data: 'Los módulos visibles dependen de los permisos de su rol. Solo verá los módulos para los cuales tiene al menos permiso de visualización.',
    },
    { type: 'heading', data: '¿Puedo tener más de un rol?' },
    {
      type: 'paragraph',
      data: 'Sí, un usuario puede tener múltiples roles. Los permisos se combinan: tendrá acceso a todos los módulos y acciones que cualquiera de sus roles permita.',
    },
    { type: 'heading', data: '¿Qué pasa si mi rol es desactivado?' },
    {
      type: 'paragraph',
      data: 'Si su único rol es desactivado, perderá acceso a los módulos correspondientes. Si tiene otros roles activos, conservará los permisos de esos roles.',
    },
    { type: 'heading', data: '¿Cómo cambio mi contraseña?' },
    {
      type: 'paragraph',
      data: 'Vaya a Mi Perfil → sección "Cambiar Contraseña". Ingrese la nueva contraseña y confírmela.',
    },
    { type: 'heading', data: '¿Por qué no puedo eliminar un registro?' },
    {
      type: 'paragraph',
      data: 'Puede deberse a: (1) No tiene permiso de eliminación en ese módulo, (2) El registro está siendo referenciado por otros módulos, (3) El registro tiene un estado que no permite eliminación.',
    },
    { type: 'heading', data: '¿Cómo funciona la vinculación de empleado?' },
    {
      type: 'paragraph',
      data: 'La vinculación conecta un usuario del sistema (cuenta de login) con un registro de empleado. Esto permite al empleado acceder al Portal del Empleado para ver su información personal, documentos, vacaciones y más.',
    },
    { type: 'heading', data: '¿Los datos se respaldan automáticamente?' },
    {
      type: 'paragraph',
      data: 'Sí, la infraestructura del sistema realiza respaldos automáticos de la base de datos. Los archivos subidos también se almacenan de forma segura y redundante.',
    },
    { type: 'heading', data: '¿Puedo exportar información del sistema?' },
    {
      type: 'paragraph',
      data: 'Sí, la mayoría de módulos permiten exportar información a Excel o PDF. Utilice la sección de Reportes para informes consolidados o los botones de exportación dentro de cada módulo.',
    },
    { type: 'heading', data: '¿Qué navegadores son compatibles?' },
    {
      type: 'paragraph',
      data: 'La aplicación es compatible con las últimas versiones de Google Chrome, Mozilla Firefox, Microsoft Edge y Safari. Se recomienda mantener el navegador actualizado.',
    },
  ],
};

// ─────────────── Exportar todas las secciones ───────────────

export const MANUAL_SECTIONS: ManualSection[] = [
  introSection,
  accessSection,
  rolesSection,
  // La sección de módulos se genera dinámicamente en el componente
  operationalFlowsSection,
  alertsSection,
  businessRulesSection,
  formulasSection,
  auditSection,
  faqSection,
];

// Sección especial que se inyecta como #4 con contenido dinámico
export const MODULES_SECTION_ID = 'modulos';
