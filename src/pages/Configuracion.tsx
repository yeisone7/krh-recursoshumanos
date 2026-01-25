import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Building2,
  FileText,
  Bell,
  Loader2,
  Save,
  Users,
  Shirt,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompanies';
import {
  useSystemConfig,
  useUpdateSystemConfig,
} from '@/hooks/useSystemConfig';

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState('company');

  // Alert config state
  const [alertContractWarning, setAlertContractWarning] = useState(30);
  const [alertContractCritical, setAlertContractCritical] = useState(7);
  const [alertExamWarning, setAlertExamWarning] = useState(30);
  const [alertExamCritical, setAlertExamCritical] = useState(7);
  const [alertDotationWarning, setAlertDotationWarning] = useState(30);
  const [alertDotationCritical, setAlertDotationCritical] = useState(7);
  const [alertTerminationPendingDays, setAlertTerminationPendingDays] = useState(7);

  const { currentCompanyId } = useAuth();
  const { data: company, isLoading: loadingCompany } = useCompany(currentCompanyId || undefined);
  const { data: systemConfig, isLoading: loadingConfig } = useSystemConfig();

  const updateConfig = useUpdateSystemConfig();

  // Load config values
  useMemo(() => {
    if (systemConfig) {
      const contractDays = systemConfig.alert_contract_days;
      const examDays = systemConfig.alert_exam_days;
      const dotationDays = systemConfig.alert_dotation_days;
      const terminationPendingDays = systemConfig.alert_termination_pending_days;
      
      if (contractDays) {
        setAlertContractWarning(contractDays.warning || 30);
        setAlertContractCritical(contractDays.critical || 7);
      }
      if (examDays) {
        setAlertExamWarning(examDays.warning || 30);
        setAlertExamCritical(examDays.critical || 7);
      }
      if (dotationDays) {
        setAlertDotationWarning(dotationDays.warning || 30);
        setAlertDotationCritical(dotationDays.critical || 7);
      }
      if (terminationPendingDays) {
        setAlertTerminationPendingDays(terminationPendingDays.min_days || 7);
      }
    }
  }, [systemConfig]);

  const handleSaveAlertConfig = async () => {
    try {
      await Promise.all([
        updateConfig.mutateAsync({
          key: 'alert_contract_days',
          value: { warning: alertContractWarning, critical: alertContractCritical },
        }),
        updateConfig.mutateAsync({
          key: 'alert_exam_days',
          value: { warning: alertExamWarning, critical: alertExamCritical },
        }),
        updateConfig.mutateAsync({
          key: 'alert_dotation_days',
          value: { warning: alertDotationWarning, critical: alertDotationCritical },
        }),
        updateConfig.mutateAsync({
          key: 'alert_termination_pending_days',
          value: { min_days: alertTerminationPendingDays },
          description: 'Días mínimos de espera antes de notificar retiros pendientes',
        }),
      ]);
      toast.success('Configuración de alertas guardada');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    }
  };

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Settings className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-muted-foreground">Contacta al administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-1">Administra la configuración del sistema</p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="w-4 h-4" />Empresa
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="w-4 h-4" />Alertas
          </TabsTrigger>
        </TabsList>

        {/* Company Tab */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
              <CardDescription>Datos generales de la empresa</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCompany ? (
                <Skeleton className="h-32 w-full" />
              ) : company && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Nombre</Label>
                    <p className="font-medium mt-1">{company.name}</p>
                  </div>
                  <div>
                    <Label>NIT</Label>
                    <p className="font-medium mt-1">{company.nit}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="font-medium mt-1">{company.email || '-'}</p>
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <p className="font-medium mt-1">{company.phone || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Dirección</Label>
                    <p className="font-medium mt-1">{company.address || '-'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Alertas</CardTitle>
              <CardDescription>Define los días de anticipación para las alertas de vencimiento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />Contratos
                  </h4>
                  <div>
                    <Label>Advertencia (días)</Label>
                    <Input 
                      type="number" 
                      value={alertContractWarning} 
                      onChange={(e) => setAlertContractWarning(parseInt(e.target.value) || 30)} 
                    />
                  </div>
                  <div>
                    <Label>Crítico (días)</Label>
                    <Input 
                      type="number" 
                      value={alertContractCritical} 
                      onChange={(e) => setAlertContractCritical(parseInt(e.target.value) || 7)} 
                    />
                  </div>
                </div>
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />Exámenes Médicos
                  </h4>
                  <div>
                    <Label>Advertencia (días)</Label>
                    <Input 
                      type="number" 
                      value={alertExamWarning} 
                      onChange={(e) => setAlertExamWarning(parseInt(e.target.value) || 30)} 
                    />
                  </div>
                  <div>
                    <Label>Crítico (días)</Label>
                    <Input 
                      type="number" 
                      value={alertExamCritical} 
                      onChange={(e) => setAlertExamCritical(parseInt(e.target.value) || 7)} 
                    />
                  </div>
                </div>
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shirt className="w-4 h-4" />Dotación
                  </h4>
                  <div>
                    <Label>Advertencia (días)</Label>
                    <Input 
                      type="number" 
                      value={alertDotationWarning} 
                      onChange={(e) => setAlertDotationWarning(parseInt(e.target.value) || 30)} 
                    />
                  </div>
                  <div>
                    <Label>Crítico (días)</Label>
                    <Input 
                      type="number" 
                      value={alertDotationCritical} 
                      onChange={(e) => setAlertDotationCritical(parseInt(e.target.value) || 7)} 
                    />
                  </div>
                </div>
                <div className="space-y-3 p-4 border rounded-lg bg-warning/5 border-warning/20">
                  <h4 className="font-medium flex items-center gap-2">
                    <Bell className="w-4 h-4 text-warning" />Notificación Retiros
                  </h4>
                  <div>
                    <Label>Días pendientes mínimos</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertTerminationPendingDays} 
                      onChange={(e) => setAlertTerminationPendingDays(parseInt(e.target.value) || 7)} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envía email si el proceso de retiro lleva más de estos días sin completar
                  </p>
                </div>
              </div>
              <Button onClick={handleSaveAlertConfig} disabled={updateConfig.isPending}>
                {updateConfig.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
