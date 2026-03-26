import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, FileText, CalendarDays, Stethoscope, Edit3, AlertCircle, LogOut, Wallet, Award } from 'lucide-react';
import { useEmployeePortal } from '@/hooks/useEmployeePortal';
import { useAuth } from '@/contexts/AuthContext';
import {
  PortalPersonalInfo,
  PortalDocuments,
  PortalVacationsLeaves,
  PortalIncapacities,
  PortalChangeRequests,
  PortalPayslips,
  PortalCertificates,
} from '@/components/portal';

export default function Portal() {
  const { signOut } = useAuth();
  const {
    employee,
    documents,
    vacationBalances,
    vacationRequests,
    leaveRequests,
    incapacities,
    changeRequests,
    payrollReceipts,
    leaveTypeConfig,
    contractInfo,
    companyInfo,
    isLoading,
    isLoadingDocs,
    isLoadingPayroll,
    hasAccess,
    createChangeRequest,
    createVacationRequest,
    createLeaveRequest,
  } = useEmployeePortal();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Cargando tu información...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess || !employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-yellow-100">
              <AlertCircle className="h-12 w-12 text-yellow-600" />
            </div>
            <CardTitle>Acceso No Disponible</CardTitle>
            <CardDescription>
              Tu cuenta de usuario no está vinculada a un empleado en el sistema.
              Contacta al departamento de Recursos Humanos para solicitar acceso al portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-primary">Portal del Empleado</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 h-auto">
            <TabsTrigger value="personal" className="flex items-center gap-2 py-3">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Mis Datos</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 py-3">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documentos</span>
            </TabsTrigger>
            <TabsTrigger value="vacations" className="flex items-center gap-2 py-3">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Vacaciones</span>
            </TabsTrigger>
            <TabsTrigger value="incapacities" className="flex items-center gap-2 py-3">
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">Incapacidades</span>
            </TabsTrigger>
            <TabsTrigger value="payslips" className="flex items-center gap-2 py-3">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Nómina</span>
            </TabsTrigger>
            <TabsTrigger value="certificates" className="flex items-center gap-2 py-3">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Certificados</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2 py-3">
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">Solicitudes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <PortalPersonalInfo employee={employee} />
          </TabsContent>

          <TabsContent value="documents">
            <PortalDocuments
              documents={documents || []}
              isLoading={isLoadingDocs}
            />
          </TabsContent>

          <TabsContent value="vacations">
            <PortalVacationsLeaves
              vacationBalances={vacationBalances || []}
              leaveRequests={leaveRequests || []}
              vacationRequests={vacationRequests || []}
              leaveTypeConfig={leaveTypeConfig || []}
              onCreateVacation={(data) => createVacationRequest.mutate(data)}
              onCreateLeave={(data) => createLeaveRequest.mutate(data)}
              isSubmittingVacation={createVacationRequest.isPending}
              isSubmittingLeave={createLeaveRequest.isPending}
            />
          </TabsContent>

          <TabsContent value="incapacities">
            <PortalIncapacities incapacities={incapacities || []} />
          </TabsContent>

          <TabsContent value="payslips">
            <PortalPayslips
              receipts={payrollReceipts || []}
              isLoading={isLoadingPayroll}
            />
          </TabsContent>

          <TabsContent value="certificates">
            <PortalCertificates
              employee={employee}
              companyName={companyInfo?.name || ''}
              companyNit={companyInfo?.nit || ''}
              contractInfo={contractInfo}
            />
          </TabsContent>

          <TabsContent value="requests">
            <PortalChangeRequests
              changeRequests={changeRequests || []}
              onSubmit={(data) => createChangeRequest.mutate({
                request_type: data.request_type,
                field_name: data.field_name,
                current_value: data.current_value,
                requested_value: data.requested_value,
              })}
              isSubmitting={createChangeRequest.isPending}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
