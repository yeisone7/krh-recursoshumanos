import { motion } from 'framer-motion';
import { Stethoscope, Syringe, Award, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmployeeV2WithRelations, certificationTypeLabels, vaccineTypeLabels } from '@/types/employee';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Tab360HealthProps {
  employee: EmployeeV2WithRelations;
  exams: any[];
  isLoading: boolean;
}

const examTypeLabels: Record<string, string> = {
  ingreso: 'Examen de Ingreso',
  periodico: 'Examen Periódico',
  egreso: 'Examen de Egreso',
  post_incapacidad: 'Post Incapacidad',
  reintegro: 'Reintegro',
};

const examResultLabels: Record<string, { label: string; color: string }> = {
  apto: { label: 'Apto', color: 'bg-success-light text-success' },
  apto_con_restricciones: { label: 'Apto con Restricciones', color: 'bg-warning-light text-warning' },
  no_apto: { label: 'No Apto', color: 'bg-destructive/10 text-destructive' },
  pendiente: { label: 'Pendiente', color: 'bg-muted text-muted-foreground' },
};

export function Tab360Health({ employee, exams, isLoading }: Tab360HealthProps) {
  const certifications = employee.certifications || [];
  const vaccinations = employee.vaccinations || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Tabs defaultValue="exams" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="exams" className="min-h-10 gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
            <Stethoscope className="w-4 h-4" />
            Exámenes ({exams.length})
          </TabsTrigger>
          <TabsTrigger value="certifications" className="min-h-10 gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
            <Award className="w-4 h-4" />
            Certificaciones ({certifications.length})
          </TabsTrigger>
          <TabsTrigger value="vaccinations" className="min-h-10 gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
            <Syringe className="w-4 h-4" />
            Vacunas ({vaccinations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exams" className="mt-4">
          {exams.length > 0 ? (
            <div className="space-y-3">
              {exams.map((exam: any, index: number) => {
                const result = examResultLabels[exam.result] || examResultLabels.pendiente;

                return (
                  <motion.div
                    key={exam.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Stethoscope className="w-4 h-4 text-primary" />
                              <h4 className="font-medium">
                                {examTypeLabels[exam.exam_type] || exam.exam_type}
                              </h4>
                              <Badge variant="outline" className={result.color}>
                                {result.label}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{format(new Date(exam.exam_date), "d MMM yyyy", { locale: es })}</span>
                              </div>
                              {exam.provider && <span>Proveedor: {exam.provider}</span>}
                            </div>

                            {exam.restrictions && (
                              <p className="text-sm text-warning flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {exam.restrictions}
                              </p>
                            )}
                          </div>

                          {exam.next_exam_date && (
                            <div className="text-left md:text-right">
                              <p className="text-sm text-muted-foreground">Próximo examen</p>
                              <p className="font-medium">
                                {format(new Date(exam.next_exam_date), "d MMM yyyy", { locale: es })}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Stethoscope className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No hay exámenes médicos registrados</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="certifications" className="mt-4">
          {certifications.length > 0 ? (
            <div className="space-y-3">
              {certifications.map((cert: any, index: number) => {
                const daysToExpire = cert.expiry_date 
                  ? differenceInDays(new Date(cert.expiry_date), new Date())
                  : null;
                const isExpired = daysToExpire !== null && daysToExpire < 0;
                const isExpiringSoon = daysToExpire !== null && daysToExpire >= 0 && daysToExpire <= 30;

                return (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={cn(
                      isExpired && 'border-destructive/50 bg-destructive/5',
                      isExpiringSoon && 'border-warning/50 bg-warning/5'
                    )}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Award className="w-4 h-4 text-primary" />
                              <h4 className="font-medium">
                                {certificationTypeLabels[cert.certification_type] || cert.certification_type}
                              </h4>
                              {isExpired && (
                                <Badge variant="destructive">Vencido</Badge>
                              )}
                              {isExpiringSoon && (
                                <Badge variant="outline" className="bg-warning-light text-warning">
                                  Por vencer
                                </Badge>
                              )}
                              {!isExpired && !isExpiringSoon && cert.is_valid && (
                                <Badge variant="outline" className="bg-success-light text-success">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Vigente
                                </Badge>
                              )}
                            </div>

                            {cert.certification_name && (
                              <p className="text-sm text-muted-foreground">{cert.certification_name}</p>
                            )}

                            {cert.license_category && (
                              <Badge variant="secondary">Categoría: {cert.license_category}</Badge>
                            )}
                          </div>

                          <div className="space-y-1 text-left md:text-right">
                            {cert.issue_date && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Emisión: </span>
                                {format(new Date(cert.issue_date), "d MMM yyyy", { locale: es })}
                              </p>
                            )}
                            {cert.expiry_date && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Vence: </span>
                                <span className={cn(
                                  isExpired && 'text-destructive font-medium',
                                  isExpiringSoon && 'text-warning font-medium'
                                )}>
                                  {format(new Date(cert.expiry_date), "d MMM yyyy", { locale: es })}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No hay certificaciones registradas</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="vaccinations" className="mt-4">
          {vaccinations.length > 0 ? (
            <div className="space-y-3">
              {vaccinations.map((vac: any, index: number) => (
                <motion.div
                  key={vac.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Syringe className="w-4 h-4 text-primary" />
                            <h4 className="font-medium">
                              {vaccineTypeLabels[vac.vaccine_type] || vac.vaccine_type}
                            </h4>
                            <Badge variant="secondary">Dosis {vac.dose_number}</Badge>
                          </div>

                          {vac.vaccine_name && (
                            <p className="text-sm text-muted-foreground">{vac.vaccine_name}</p>
                          )}

                          {vac.provider && (
                            <p className="text-sm text-muted-foreground">Proveedor: {vac.provider}</p>
                          )}
                        </div>

                        <div className="space-y-1 text-left md:text-right">
                          <p className="text-sm">
                            <span className="text-muted-foreground">Aplicación: </span>
                            {format(new Date(vac.application_date), "d MMM yyyy", { locale: es })}
                          </p>
                          {vac.next_dose_date && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Próxima dosis: </span>
                              {format(new Date(vac.next_dose_date), "d MMM yyyy", { locale: es })}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Syringe className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No hay vacunas registradas</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
