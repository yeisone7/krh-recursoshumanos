import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, XCircle, Loader2, ArrowLeft, Building2, User, Calendar, Briefcase, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function VerificarCertificado() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [certificateData, setCertificateData] = useState<any>(null);

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
              logo_url
            )
          `)
          .eq('verification_token', token)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setIsValid(true);
          setCertificateData(data);
        } else {
          setIsValid(false);
        }
      } catch (err) {
        console.error('Error verifying certificate:', err);
        setIsValid(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyCertificate();
  }, [token]);

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

  if (!isValid || !certificateData) {
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

          </div>
        </motion.div>

        {/* Footer info */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-xs text-slate-500 mt-8 max-w-sm mx-auto"
        >
          Este sistema garantiza la inalterabilidad de los datos al momento de su generación.
        </motion.p>
      </div>
    </div>
  );
}
