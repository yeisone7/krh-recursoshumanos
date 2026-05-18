import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, XCircle, Loader2, Building2, User, Calendar, Briefcase, FileText, Download, Lock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateLaborCertificatePdf } from '@/lib/laborCertificatePdfGenerator';

export default function VerificarCertificado() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [errorType, setErrorType] = useState<'not_found' | 'expired' | 'limit_reached' | null>(null);
  const [certificateData, setCertificateData] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const verifyCertificate = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('work_certificates')
          .select(`
            id,
            folio,
            created_at,
            content_data,
            company_id,
            employee_id,
            employees_v2!work_certificates_employee_id_fkey(
              first_name,
              last_name,
              document_type,
              document_number
            ),
            companies!work_certificates_company_id_fkey(
              name,
              nit,
              logo_url,
              horizontal_logo_url,
              address,
              phone,
              email
            )
          `)
          .eq('verification_token', token)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const content = data.content_data || {};
          const linkConfig = content.linkConfig;

          // Check if link is programmable and handle validation
          if (linkConfig?.isProgrammable) {
            // 1. Expiration check
            if (linkConfig.expiresAt && new Date(linkConfig.expiresAt) < new Date()) {
              setIsValid(false);
              setErrorType('expired');
              setCertificateData(data);
              setIsLoading(false);
              return;
            }
            // 2. Maximum uses limit check
            if (linkConfig.maxUses !== null && (linkConfig.usesCount || 0) >= linkConfig.maxUses) {
              setIsValid(false);
              setErrorType('limit_reached');
              setCertificateData(data);
              setIsLoading(false);
              return;
            }
          }

          setIsValid(true);
          setCertificateData(data);
        } else {
          setIsValid(false);
          setErrorType('not_found');
        }
      } catch (err) {
        console.error('Error verifying certificate:', err);
        setIsValid(false);
        setErrorType('not_found');
      } finally {
        setIsLoading(false);
      }
    };

    verifyCertificate();
  }, [token]);

  const handleDownload = async () => {
    if (!certificateData || isDownloading) return;

    try {
      setIsDownloading(true);
      
      const { employees_v2: emp, companies: comp, content_data: content, folio } = certificateData;
      const linkConfig = content.linkConfig;

      // Increment usage count atomically if programmable
      if (linkConfig?.isProgrammable) {
        const nextUsesCount = (linkConfig.usesCount || 0) + 1;
        const updatedContentData = {
          ...content,
          linkConfig: {
            ...linkConfig,
            usesCount: nextUsesCount
          }
        };

        const { error: updateError } = await supabase
          .from('work_certificates')
          .update({ content_data: updatedContentData })
          .eq('id', certificateData.id);

        if (updateError) throw updateError;

        // Update local state
        setCertificateData((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            content_data: updatedContentData
          };
        });

        // If this download reached the maximum allowed limit, update local validation state
        if (linkConfig.maxUses !== null && nextUsesCount >= linkConfig.maxUses) {
          setTimeout(() => {
            setIsValid(false);
            setErrorType('limit_reached');
          }, 1500);
        }
      }

      // Generate the official PDF using client-side jsPDF script
      const doc = await generateLaborCertificatePdf({
        employee: {
          first_name: emp.first_name,
          last_name: emp.last_name,
          document_type: emp.document_type,
          document_number: emp.document_number,
        },
        company: {
          name: comp.name,
          nit: comp.nit,
          logo_url: comp.logo_url,
          horizontal_logo_url: comp.horizontal_logo_url,
          address: comp.address,
          phone: comp.phone,
          email: comp.email,
        },
        data: content,
        folio: folio,
        verificationUrl: window.location.href,
        signatureConfig: content.signatureConfig,
        watermarkConfig: content.watermarkConfig
      });

      const empName = `${emp.first_name}_${emp.last_name}`.replace(/\s+/g, '_');
      doc.save(`Certificacion_Laboral_${empName}.pdf`);

      toast({
        title: 'Descarga completa',
        description: 'La certificación laboral se ha generado y descargado correctamente.',
      });
    } catch (err) {
      console.error('Error generating/downloading PDF:', err);
      toast({
        title: 'Error de descarga',
        description: 'Ocurrió un error al procesar el archivo PDF. Por favor intente de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Verificando autenticidad del documento...</p>
        </div>
      </div>
    );
  }

  // Not Found State (Standard Invalid Token)
  if (errorType === 'not_found' || !certificateData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] p-8 shadow-xl text-center border-t-8 border-rose-500"
        >
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Certificado Inválido</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            El código de verificación proporcionado no corresponde a ningún certificado válido emitido por nuestra plataforma o ha sido revocado.
          </p>
          <Button 
            onClick={() => window.location.href = '/'}
            className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs"
          >
            Ir a la página principal
          </Button>
        </motion.div>
      </div>
    );
  }

  const { employees_v2: emp, companies: comp, content_data: content, created_at, folio } = certificateData;
  const fullName = `${emp.first_name} ${emp.last_name}`;

  // Expired / Limit Reached Programmable Link States
  if (!isValid && (errorType === 'expired' || errorType === 'limit_reached')) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
        <div className="w-full max-w-lg">
          {/* Header/Logo */}
          <div className="flex justify-center mb-8">
            {comp?.logo_url ? (
              <img src={comp.logo_url} alt={comp.name} className="h-16 object-contain" />
            ) : (
              <div className="h-16 flex items-center justify-center px-6 rounded-2xl bg-white shadow-sm border border-slate-100">
                <h2 className="text-xl font-black text-slate-800">{comp.name}</h2>
              </div>
            )}
          </div>

          {/* Expiration Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl border border-amber-200 overflow-hidden"
          >
            {/* Status Header */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <ShieldAlert className="w-16 h-16 mx-auto mb-4 relative z-10 text-white" />
              <h1 className="text-3xl font-black tracking-tight relative z-10">
                {errorType === 'expired' ? 'Enlace Caducado' : 'Límite de Descargas'}
              </h1>
              <p className="font-medium text-amber-100 relative z-10 mt-1">
                {errorType === 'expired' 
                  ? 'Este enlace temporal de descarga ha superado su fecha de vigencia.' 
                  : 'Este enlace temporal ha superado el número máximo de descargas permitidas.'}
              </p>
            </div>

            {/* Details Summary */}
            <div className="p-8 space-y-6">
              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">Información del Documento</p>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">Folio: <span className="font-black text-slate-900">{folio}</span></p>
                  <p className="text-sm text-slate-600">Expedido a: <span className="font-semibold text-slate-800">{fullName}</span></p>
                  <p className="text-xs text-slate-500">Fecha de emisión: {format(new Date(created_at), 'dd/MM/yyyy')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <Lock className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Por motivos de seguridad y protección de datos personales, las certificaciones compartidas a través de enlaces programables están limitadas en su vigencia y usos.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
                  <p className="text-xs font-semibold text-slate-700">¿Necesitas descargar este documento?</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Por favor ponte en contacto con el departamento de Gestión Humana de <span className="font-bold">{comp.name}</span> para que te expidan un nuevo enlace de descarga.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <p className="text-center text-xs text-slate-500 mt-8 max-w-sm mx-auto">
            KRH Recursos Humanos - Plataforma Segura de Gestión Humana.
          </p>
        </div>
      </div>
    );
  }

  // Active / Valid Verification & Download State
  const linkConfig = content.linkConfig || {};
  const isProgrammable = linkConfig.isProgrammable;
  const usesLeft = isProgrammable && linkConfig.maxUses !== null 
    ? Math.max(0, linkConfig.maxUses - (linkConfig.usesCount || 0)) 
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-slate-50 to-primary/5 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        
        {/* Header/Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          {comp?.logo_url ? (
            <img src={comp.logo_url} alt={comp.name} className="h-16 object-contain" />
          ) : (
            <div className="h-16 flex items-center justify-center px-6 rounded-2xl bg-white shadow-sm border border-slate-100">
              <h2 className="text-xl font-black text-slate-800">{comp.name}</h2>
            </div>
          )}
        </motion.div>

        {/* Verification Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden"
        >
          {/* Status Header */}
          <div className="bg-emerald-500 p-8 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <ShieldCheck className="w-16 h-16 mx-auto mb-4 relative z-10" />
            <h1 className="text-3xl font-black tracking-tight relative z-10">Documento Válido</h1>
            <p className="font-medium text-emerald-100 relative z-10 mt-1">Este certificado es auténtico y fue expedido a través de nuestro sistema.</p>
          </div>

          {/* Details */}
          <div className="p-8 space-y-6">
            
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Empleado</p>
                <p className="font-bold text-slate-900 leading-tight">{fullName}</p>
                <p className="text-sm text-slate-500">{emp.document_type} {emp.document_number}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cargo y Contrato</p>
                <p className="font-bold text-slate-900 leading-tight">{content.positionName}</p>
                <p className="text-sm text-slate-500">{content.contractType}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Expedición</p>
                  <p className="font-bold text-slate-900 text-sm leading-tight">
                    {format(new Date(created_at), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Folio</p>
                  <p className="font-bold text-slate-900 text-sm leading-tight">
                    {folio}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Empresa Emisora</p>
                  <p className="font-bold text-slate-700 text-sm">{comp.name}</p>
                  <p className="text-xs text-slate-500">NIT: {comp.nit}</p>
                </div>
              </div>
            </div>

            {/* Premium Download Area */}
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full h-14 rounded-2xl font-bold text-sm tracking-wide bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-3 shadow-lg shadow-primary/20 transition-all duration-300 active:scale-[0.98]"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Descargar Certificado Oficial (PDF)
                  </>
                )}
              </Button>

              {isProgrammable && (
                <div className="flex flex-col items-center justify-center text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-500">
                    Enlace de descarga programable
                  </p>
                  <div className="flex items-center gap-2">
                    {usesLeft !== null && (
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                        Descargas restantes: {usesLeft}
                      </span>
                    )}
                    {linkConfig.expiresAt && (
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                        Expira el: {format(new Date(linkConfig.expiresAt), 'dd/MM/yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </motion.div>

        {/* Footer info */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-xs text-slate-500 mt-8 max-w-sm mx-auto animate-pulse"
        >
          Este sistema garantiza la inalterabilidad de los datos al momento de su generación.
        </motion.p>
      </div>
    </div>
  );
}
