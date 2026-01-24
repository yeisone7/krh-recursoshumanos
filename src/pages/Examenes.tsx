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
  Loader2,
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
import { useMedicalExams, getExamStatus, getDaysRemaining, getAlertLevel } from '@/hooks/useMedicalExams';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type ExamType = Database['public']['Enums']['exam_type'];
type ExamResult = Database['public']['Enums']['exam_result'];

type ExamStatus = 'vigente' | 'por_vencer' | 'vencido' | 'no_aplica';

const examTypeLabels: Record<ExamType, string> = {
  ingreso: 'Ingreso',
  periodico: 'Periódico',
  egreso: 'Egreso',
  reintegro: 'Reintegro',
};

const examResultLabels: Record<ExamResult, string> = {
  apto: 'Apto',
  apto_restricciones: 'Apto con Restricciones',
  no_apto: 'No Apto',
  pendiente: 'Pendiente',
};

const examResultConfig: Record<ExamResult, { bg: string; text: string; border: string }> = {
  apto: {
    bg: 'bg-success-light',
    text: 'text-success',
    border: 'border-success/20',
  },
  apto_restricciones: {
    bg: 'bg-warning-light',
    text: 'text-warning-foreground',
    border: 'border-warning/20',
  },
  no_apto: {
    bg: 'bg-destructive-light',
    text: 'text-destructive',
    border: 'border-destructive/20',
  },
  pendiente: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
  },
};

const examStatusConfig: Record<ExamStatus, { label: string; bg: string; text: string }> = {
  vigente: {
    label: 'Vigente',
    bg: 'bg-success-light',
    text: 'text-success',
  },
  por_vencer: {
    label: 'Por Vencer',
    bg: 'bg-warning-light',
    text: 'text-warning-foreground',
  },
  vencido: {
    label: 'Vencido',
    bg: 'bg-destructive-light',
    text: 'text-destructive',
  },
  no_aplica: {
    label: 'N/A',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
  },
};

const resultIcons = {
  apto: CheckCircle,
  apto_restricciones: AlertTriangle,
  no_apto: XCircle,
  pendiente: Clock,
};

export default function Examenes() {
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ExamType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ExamStatus | 'all'>('all');

  const { currentCompanyId } = useAuth();
  const { data: exams, isLoading } = useMedicalExams();

  // Calculate stats
  const stats = useMemo(() => {
    if (!exams) return { total: 0, vigentes: 0, porVencer: 0, vencidos: 0, conRestricciones: 0 };
    
    const total = exams.length;
    const vigentes = exams.filter(e => getExamStatus(e) === 'vigente').length;
    const porVencer = exams.filter(e => getExamStatus(e) === 'por_vencer').length;
    const vencidos = exams.filter(e => getExamStatus(e) === 'vencido').length;
    const conRestricciones = exams.filter(e => e.result === 'apto_restricciones').length;
    return { total, vigentes, porVencer, vencidos, conRestricciones };
  }, [exams]);

  // Generate alerts
  const alerts = useMemo(() => {
    if (!exams) return [];
    
    return exams
      .filter(exam => {
        const status = getExamStatus(exam);
        return status === 'por_vencer' || status === 'vencido';
      })
      .map(exam => {
        const daysRemaining = getDaysRemaining(exam.expiration_date) ?? 0;
        return {
          id: `alert-${exam.id}`,
          examId: exam.id,
          employeeId: exam.employee_id,
          employeeName: `${exam.employees?.first_name} ${exam.employees?.last_name}`,
          examType: exam.exam_type,
          expirationDate: exam.expiration_date!,
          daysRemaining: Math.max(0, daysRemaining),
          level: getAlertLevel(daysRemaining),
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [exams]);

  // Filter exams
  const filteredExams = useMemo(() => {
    if (!exams) return [];
    
    return exams.filter(exam => {
      const employeeName = `${exam.employees?.first_name} ${exam.employees?.last_name}`.toLowerCase();
      const documentNumber = exam.employees?.document_number || '';
      
      const matchesSearch = 
        employeeName.includes(searchTerm.toLowerCase()) ||
        documentNumber.includes(searchTerm);
      const matchesType = filterType === 'all' || exam.exam_type === filterType;
      const matchesStatus = filterStatus === 'all' || getExamStatus(exam) === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [exams, searchTerm, filterType, filterStatus]);

  const handleViewExam = (examId: string) => {
    setSelectedExamId(examId);
    setShowDetailDialog(true);
  };

  const selectedExam = exams?.find(e => e.id === selectedExamId);

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Stethoscope className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-muted-foreground">
          Contacta al administrador para que te asigne a una empresa.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            onAlertClick={(alert) => handleViewExam(alert.examId)}
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
              const status = getExamStatus(exam) as ExamStatus;
              const statusStyle = examStatusConfig[status];
              const resultStyle = examResultConfig[exam.result];
              const ResultIcon = resultIcons[exam.result];
              const daysRemaining = getDaysRemaining(exam.expiration_date);

              return (
                <TableRow key={exam.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">
                        {exam.employees?.first_name} {exam.employees?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{exam.employees?.document_number}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{examTypeLabels[exam.exam_type]}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(exam.exam_date), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    {exam.expiration_date ? (
                      <div>
                        <p>{format(new Date(exam.expiration_date), 'dd/MM/yyyy', { locale: es })}</p>
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
                      onClick={() => handleViewExam(exam.id)}
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

      {selectedExam && (
        <ExamDetailDialog
          exam={{
            id: selectedExam.id,
            employeeId: selectedExam.employee_id,
            employeeName: `${selectedExam.employees?.first_name} ${selectedExam.employees?.last_name}`,
            employeeDocument: selectedExam.employees?.document_number || '',
            examType: selectedExam.exam_type,
            examDate: new Date(selectedExam.exam_date),
            expirationDate: selectedExam.expiration_date ? new Date(selectedExam.expiration_date) : null,
            result: selectedExam.result,
            concept: selectedExam.concept,
            restrictions: selectedExam.restrictions || undefined,
            provider: selectedExam.provider,
            doctorName: selectedExam.doctor_name,
            documentUrl: selectedExam.document_url || undefined,
            observations: selectedExam.observations || undefined,
            createdAt: new Date(selectedExam.created_at),
            updatedAt: new Date(selectedExam.updated_at),
          }}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
        />
      )}
    </div>
  );
}
