import { Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PlaceholderInfo {
  key: string;
  description: string;
  example?: string;
}

const placeholderCategories: { title: string; items: PlaceholderInfo[] }[] = [
  {
    title: 'Datos de la Empresa',
    items: [
      { key: '{{EMPRESA_NOMBRE}}', description: 'Razón social de la empresa', example: 'Petrocasinos S.A.S.' },
      { key: '{{EMPRESA_NIT}}', description: 'NIT de la empresa', example: '900123456-1' },
      { key: '{{EMPRESA_DIRECCION}}', description: 'Dirección de la empresa', example: 'Cra 15 # 100-50' },
      { key: '{{EMPRESA_TELEFONO}}', description: 'Teléfono de la empresa', example: '(601) 555-1234' },
      { key: '{{EMPRESA_EMAIL}}', description: 'Correo electrónico de la empresa', example: 'info@empresa.com' },
    ],
  },
  {
    title: 'Datos del Empleado',
    items: [
      { key: '{{EMPLEADO_NOMBRE}}', description: 'Nombre completo del empleado', example: 'Juan Pérez García' },
      { key: '{{EMPLEADO_DOCUMENTO_TIPO}}', description: 'Tipo de documento', example: 'CC' },
      { key: '{{EMPLEADO_DOCUMENTO}}', description: 'Número de documento', example: '1234567890' },
      { key: '{{EMPLEADO_DIRECCION}}', description: 'Dirección del empleado', example: 'Calle 50 # 20-30' },
      { key: '{{EMPLEADO_TELEFONO}}', description: 'Teléfono del empleado', example: '310 555 1234' },
      { key: '{{EMPLEADO_EMAIL}}', description: 'Correo del empleado', example: 'juan@email.com' },
      { key: '{{EMPLEADO_CARGO}}', description: 'Cargo asignado', example: 'Analista de Sistemas' },
      { key: '{{EMPLEADO_AREA}}', description: 'Área o departamento', example: 'Tecnología' },
      { key: '{{EMPLEADO_CENTRO}}', description: 'Centro de operación', example: 'Sede Principal' },
      { key: '{{EMPLEADO_TIPO_NOMINA}}', description: 'Tipo de nómina', example: 'Quincenal' },
      { key: '{{DIA_DESCANSO}}', description: 'Día de descanso del empleado', example: 'Domingo' },
    ],
  },
  {
    title: 'Datos del Contrato',
    items: [
      { key: '{{CONTRATO_NUMERO}}', description: 'Número consecutivo del contrato', example: 'PC-2024-0001' },
      { key: '{{CONTRATO_TIPO}}', description: 'Tipo de contrato', example: 'Término Fijo' },
      { key: '{{CONTRATO_FECHA_INICIO}}', description: 'Fecha de inicio', example: '15 de enero de 2024' },
      { key: '{{CONTRATO_FECHA_FIN}}', description: 'Fecha de finalización', example: '14 de julio de 2024' },
      { key: '{{CONTRATO_DURACION_MESES}}', description: 'Duración en meses', example: '6 meses' },
      { key: '{{CONTRATO_OBJETO_LABOR}}', description: 'Objeto o labor (para contratos obra/labor)', example: 'Desarrollo del proyecto XYZ...' },
    ],
  },
  {
    title: 'Salario y Compensación',
    items: [
      { key: '{{SALARIO}}', description: 'Salario en números', example: '3.500.000' },
      { key: '{{SALARIO_LETRAS}}', description: 'Salario en letras', example: 'Tres millones quinientos mil pesos' },
      { key: '{{SALARIO_TIPO}}', description: 'Tipo de salario', example: 'Mensual' },
      { key: '{{AUXILIO_TRANSPORTE}}', description: 'Valor del auxilio de transporte', example: '140.606' },
    ],
  },
  {
    title: 'Lugar de Trabajo',
    items: [
      { key: '{{LUGAR_CIUDAD}}', description: 'Ciudad de trabajo', example: 'Bogotá' },
      { key: '{{LUGAR_DIRECCION}}', description: 'Dirección del lugar de trabajo', example: 'Cra 7 # 45-20' },
    ],
  },
  {
    title: 'Fechas del Documento',
    items: [
      { key: '{{FECHA_GENERACION}}', description: 'Fecha de generación del documento', example: '30 de enero de 2024' },
      { key: '{{FECHA_HOY}}', description: 'Fecha actual (alias)', example: '30 de enero de 2024' },
    ],
  },
];

export function ContractPlaceholdersInfo({ className }: { className?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("w-full gap-2 sm:w-auto", className)}>
          <Info className="w-4 h-4" />
          Placeholders
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Placeholders para Plantillas
          </DialogTitle>
          <DialogDescription>
            Utilice estos marcadores en sus plantillas de Word (.docx). Serán reemplazados automáticamente con los datos del contrato.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 sm:pr-4">
          <div className="space-y-6">
            {placeholderCategories.map((category) => (
              <div key={category.title} className="space-y-3">
                <h3 className="font-semibold text-sm text-foreground border-b pb-2">
                  {category.title}
                </h3>
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex flex-col sm:flex-row sm:items-start gap-2 p-3 rounded-lg bg-background hover:bg-background transition-colors"
                    >
                      <Badge 
                        variant="outline" 
                        className="font-mono text-xs shrink-0 bg-background"
                      >
                        {item.key}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{item.description}</p>
                        {item.example && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Ejemplo: <span className="italic">{item.example}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
