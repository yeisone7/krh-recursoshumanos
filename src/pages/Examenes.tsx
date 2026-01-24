import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Stethoscope,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Eye,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExamFormDialog } from '@/components/examenes/ExamFormDialog';
import { ExamDetailDialog } from '@/components/examenes/ExamDetailDialog';
import { ExamAlertsCard } from '@/components/examenes/ExamAlertsCard';
import {
  MedicalExam,
  MedicalExamAlert,
  ExamType,
  ExamStatus,
  examTypeLabels,
  examResultLabels,
  examResultConfig,
  examStatusConfig,
  getExamStatus,
  calculateDaysRemaining,
  getAlertLevel,
} from '@/types/medicalExam';

// Mock data for demo
const mockExams: MedicalExam[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'María García López',
    employeeDocument: '1234567890',
    examType: 'periodico',
    examDate: new Date('2024-02-15'),
    expirationDate: new Date('2025-02-15'),
    result: 'apto',
    concept: 'El trabajador se encuentra en óptimas condiciones de salud para desempeñar sus funciones.',
    provider: 'IPS Salud Ocupacional S.A.',
    doctorName: 'Dr. Juan Pérez',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: 'Carlos Rodríguez Pérez',
    employeeDocument: '0987654321',
    examType: 'periodico',
    examDate: new Date('2024-01-20'),
    expirationDate: new Date('2025-01-20'),
    result: 'apto_restricciones',
    concept: 'Apto para labores con restricción de carga.',
    restrictions: 'No realizar levantamiento de cargas superiores a 10 kg.',
    provider: 'Centro Médico Laboral',
    doctorName: 'Dra. Ana Martínez',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '3',
    employeeId: '3',
    employeeName: 'Ana Martínez Silva',
    employeeDocument: '1122334455',
    examType: 'ingreso',
    examDate: new Date('2024-12-01'),
    expirationDate: new Date('2025-12-01'),
    result: 'apto',
    concept: 'Apto para el cargo de Asistente Administrativo.',
    provider: 'IPS Ocupacional Plus',
    doctorName: 'Dr. Roberto Gómez',
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: 'Pedro López Hernández',
    employeeDocument: '5544332211',
    examType: 'periodico',
    examDate: new Date('2024-01-10'),
    expirationDate: new Date('2025-01-10'),
    result: 'apto',
    concept: 'Continúa apto para sus funciones habituales.',
    provider: 'Centro Médico Laboral',
    doctorName: 'Dra. Carolina Ruiz',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '5',
    employeeId: '5',
    employeeName: 'Laura Sánchez Mejía',
    employeeDocument: '6677889900',
    examType: 'egreso',
    examDate: new Date('2024-11-30'),
    expirationDate: null,
    result: 'apto',
    concept: 'Examen de retiro sin hallazgos patológicos relacionados con el trabajo.',
    provider: 'IPS Salud Ocupacional S.A.',
    doctorName: 'Dr. Juan Pérez',
    createdAt: new Date('2024-11-30'),
    updatedAt: new Date('2024-11-30'),
  },
  {
    id: '6',
    employeeId: '6',
    employeeName: 'Diego Ramírez Torres',
    employeeDocument: '1122445566',
    examType: 'reintegro',
    examDate: new Date('2024-12-15'),
    expirationDate: new Date('2025-12-15'),
    result: 'apto_restricciones',
    concept: 'Apto para reintegro laboral posterior a cirugía de rodilla.',
    restrictions: 'Evitar bipedestación prolongada y escaleras durante 3 meses.',
    provider: 'IPS Ocupacional Plus',
    doctorName: 'Dr. Miguel Vargas',
    createdAt: new Date('2024-12-15'),
    updatedAt: new Date('2024-12-15'),
  },
];

const resultIcons = {
  apto: CheckCircle,
  apto_restricciones: AlertTriangle,
  no_apto: XCircle,
  pendiente: Clock,
};

export default function Examenes() {
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [selectedExam, setSelectedExam] = useState<MedicalExam | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ExamType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ExamStatus | 'all'>('all');

  // Calculate stats
  const stats = useMemo(() => {
    const total = mockExams.length;
    const vigentes = mockExams.filter(e => getExamStatus(e) === 'vigente').length;
    const porVencer = mockExams.filter(e => getExamStatus(e) === 'por_vencer').length;
    const vencidos = mockExams.filter(e => getExamStatus(e) === 'vencido').length;
    const conRestricciones = mockExams.filter(e => e.result === 'apto_restricciones').length;
    return { total, vigentes, porVencer, vencidos, conRestricciones };
  }, []);

  // Generate alerts
  const alerts: MedicalExamAlert[] = useMemo(() => {
    return mockExams
      .filter(exam => {
        const status = getExamStatus(exam);
        return status === 'por_vencer' || status === 'vencido';
      })
      .map(exam => {
        const daysRemaining = calculateDaysRemaining(exam.expirationDate) ?? 0;
        return {
          id: `alert-${exam.id}`,
          examId: exam.id,
          employeeId: exam.employeeId,
          employeeName: exam.employeeName,
          examType: exam.examType,
          expirationDate: exam.expirationDate!,
          daysRemaining: Math.max(0, daysRemaining),
          level: getAlertLevel(daysRemaining),
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, []);

  // Filter exams
  const filteredExams = useMemo(() => {
    return mockExams.filter(exam => {
      const matchesSearch = 
        exam.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.employeeDocument.includes(searchTerm);
      const matchesType = filterType === 'all' || exam.examType === filterType;
      const matchesStatus = filterStatus === 'all' || getExamStatus(exam) === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchTerm, filterType, filterStatus]);

  const handleViewExam = (exam: MedicalExam) => {
    setSelectedExam(exam);
    setShowDetailDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Exámenes Médicos
          </h1>
          <p className="text-muted-foreground">
            Gestión de exámenes médicos ocupacionales
          </p>
        </div>
        <Button onClick={() => setShowFormDialog(true)} className="bg-primary hover:bg-primary-hover">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Examen
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Exámenes</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{stats.vigentes}</p>
              <p className="text-xs text-muted-foreground">Vigentes</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{stats.porVencer}</p>
              <p className="text-xs text-muted-foreground">Por Vencer</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive-light flex items-center justify-center">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{stats.vencidos}</p>
              <p className="text-xs text-muted-foreground">Vencidos</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info-light flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-info">{stats.conRestricciones}</p>
              <p className="text-xs text-muted-foreground">Con Restricciones</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Alerts Card */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ExamAlertsCard
            alerts={alerts}
            onAlertClick={(alert) => {
              const exam = mockExams.find(e => e.id === alert.examId);
              if (exam) handleViewExam(exam);
            }}
          />
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-elevated p-4"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as ExamType | 'all')}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {(Object.keys(examTypeLabels) as ExamType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {examTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ExamStatus | 'all')}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {(Object.keys(examStatusConfig) as ExamStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {examStatusConfig[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card-elevated"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExams.map((exam) => {
              const status = getExamStatus(exam);
              const statusStyle = examStatusConfig[status];
              const resultStyle = examResultConfig[exam.result];
              const ResultIcon = resultIcons[exam.result];
              const daysRemaining = calculateDaysRemaining(exam.expirationDate);

              return (
                <TableRow key={exam.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{exam.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{exam.employeeDocument}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{examTypeLabels[exam.examType]}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(exam.examDate), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    {exam.expirationDate ? (
                      <div>
                        <p>{format(new Date(exam.expirationDate), 'dd/MM/yyyy', { locale: es })}</p>
                        {daysRemaining !== null && daysRemaining <= 30 && daysRemaining >= 0 && (
                          <p className="text-xs text-warning">{daysRemaining} días restantes</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('flex items-center gap-1 w-fit', resultStyle.bg, resultStyle.text)}>
                      <ResultIcon className="w-3 h-3" />
                      {examResultLabels[exam.result]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(statusStyle.bg, statusStyle.text)}>
                      {statusStyle.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewExam(exam)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredExams.length === 0 && (
          <div className="p-8 text-center">
            <Stethoscope className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No se encontraron exámenes médicos</p>
          </div>
        )}
      </motion.div>

      {/* Dialogs */}
      <ExamFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
      />

      <ExamDetailDialog
        exam={selectedExam}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
      />
    </div>
  );
}
