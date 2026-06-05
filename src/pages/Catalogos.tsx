import { motion } from 'framer-motion';
import {
  Users,
  Briefcase,
  FileText,
  Shirt,
  Calendar,
  ShieldCheck,
  HeartPulse,
  Landmark,
  Stethoscope,
  BanknoteIcon,
  ClipboardList,
  Globe,
  GraduationCap,
  FolderOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { CATALOG_PERMISSION_CODES } from '@/lib/catalogPermissions';
import { cn } from '@/lib/utils';

const catalogos = [
  {
    title: 'Áreas',
    description: 'Departamentos y secciones de la empresa',
    icon: <Users className="w-6 h-6" />,
    href: '/catalogos/areas',
    moduleCode: CATALOG_PERMISSION_CODES.areas,
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    title: 'Cargos',
    description: 'Perfiles y descripciones de puestos',
    icon: <Briefcase className="w-6 h-6" />,
    href: '/catalogos/cargos',
    moduleCode: CATALOG_PERMISSION_CODES.cargos,
    color: 'bg-emerald-500/10 text-emerald-500',
  },
  {
    title: 'Tipos de Contrato',
    description: 'Modelos de vinculación laboral',
    icon: <FileText className="w-6 h-6" />,
    href: '/catalogos/tipos-contrato',
    moduleCode: CATALOG_PERMISSION_CODES.tiposContrato,
    color: 'bg-orange-500/10 text-orange-500',
  },
  {
    title: 'Tipos de Dotación',
    description: 'Categorías de implementos y uniformes',
    icon: <Shirt className="w-6 h-6" />,
    href: '/catalogos/tipos-dotacion',
    moduleCode: CATALOG_PERMISSION_CODES.tiposDotacion,
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    title: 'Días Festivos',
    description: 'Calendario de días no laborales',
    icon: <Calendar className="w-6 h-6" />,
    href: '/catalogos/festivos',
    moduleCode: CATALOG_PERMISSION_CODES.festivos,
    color: 'bg-red-500/10 text-red-500',
  },
  {
    title: 'ARL',
    description: 'Aseguradoras de Riesgos Laborales',
    icon: <ShieldCheck className="w-6 h-6" />,
    href: '/catalogos/arl',
    moduleCode: CATALOG_PERMISSION_CODES.arl,
    color: 'bg-indigo-500/10 text-indigo-500',
  },
  {
    title: 'EPS',
    description: 'Entidades Promotoras de Salud',
    icon: <HeartPulse className="w-6 h-6" />,
    href: '/catalogos/eps',
    moduleCode: CATALOG_PERMISSION_CODES.eps,
    color: 'bg-rose-500/10 text-rose-500',
  },
  {
    title: 'AFP',
    description: 'Administradoras de Fondos de Pensiones',
    icon: <Landmark className="w-6 h-6" />,
    href: '/catalogos/afp',
    moduleCode: CATALOG_PERMISSION_CODES.afp,
    color: 'bg-amber-500/10 text-amber-500',
  },
  {
    title: 'Caja Compensación',
    description: 'Cajas de Compensación Familiar',
    icon: <Users className="w-6 h-6" />,
    href: '/catalogos/ccf',
    moduleCode: CATALOG_PERMISSION_CODES.ccf,
    color: 'bg-cyan-500/10 text-cyan-500',
  },
  {
    title: 'AFC',
    description: 'Ahorro para el Fomento de la Construcción',
    icon: <Landmark className="w-6 h-6" />,
    href: '/catalogos/afc',
    moduleCode: CATALOG_PERMISSION_CODES.afc,
    color: 'bg-yellow-500/10 text-yellow-500',
  },
  {
    title: 'IPS',
    description: 'Instituciones Prestadoras de Salud',
    icon: <Stethoscope className="w-6 h-6" />,
    href: '/catalogos/ips',
    moduleCode: CATALOG_PERMISSION_CODES.ips,
    color: 'bg-teal-500/10 text-teal-500',
  },
  {
    title: 'Bancos',
    description: 'Entidades financieras para nómina',
    icon: <BanknoteIcon className="w-6 h-6" />,
    href: '/catalogos/bancos',
    moduleCode: CATALOG_PERMISSION_CODES.bancos,
    color: 'bg-green-500/10 text-green-500',
  },
  {
    title: 'Motivos Novedad',
    description: 'Causas para cambios en nómina',
    icon: <ClipboardList className="w-6 h-6" />,
    href: '/catalogos/motivos-novedad',
    moduleCode: CATALOG_PERMISSION_CODES.motivosNovedad,
    color: 'bg-slate-50 text-slate-500',
  },
  {
    title: 'Plataformas Publicación',
    description: 'Portales de empleo y redes sociales',
    icon: <Globe className="w-6 h-6" />,
    href: '/catalogos/plataformas-publicacion',
    moduleCode: CATALOG_PERMISSION_CODES.plataformasPublicacion,
    color: 'bg-sky-500/10 text-sky-500',
  },
  {
    title: 'Tipos Identificación',
    description: 'Documentos válidos para empleados y candidatos',
    icon: <FileText className="w-6 h-6" />,
    href: '/catalogos/tipos-identificacion',
    moduleCode: CATALOG_PERMISSION_CODES.tiposIdentificacion,
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    title: 'Niveles Educativos',
    description: 'Grados de escolaridad y formación',
    icon: <GraduationCap className="w-6 h-6" />,
    href: '/catalogos/niveles-educativos',
    moduleCode: CATALOG_PERMISSION_CODES.nivelesEducativos,
    color: 'bg-violet-500/10 text-violet-500',
  },
  {
    title: 'Profesiones',
    description: 'Catálogo de títulos y ocupaciones',
    icon: <Briefcase className="w-6 h-6" />,
    href: '/catalogos/profesiones',
    moduleCode: CATALOG_PERMISSION_CODES.profesiones,
    color: 'bg-lime-500/10 text-lime-500',
  },
];

export default function Catalogos() {
  const navigate = useNavigate();
  const { isAdmin, permissionsLoaded, canView } = useAuth();
  const visibleCatalogos = catalogos.filter((catalogo) => {
    if (isAdmin || !permissionsLoaded) return true;
    return canView(catalogo.moduleCode);
  });

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] bg-white border border-slate-100"
      >
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6">
            <div className="relative shrink-0 group">
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center rounded-[1.25rem] sm:rounded-[1.75rem] bg-primary transition-all duration-300">
                <FolderOpen className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Gestión Maestros
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase lg:text-4xl">
                Catálogos
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest sm:tracking-[0.2em] mt-1">
                Parámetros globales del sistema
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className="h-10 px-4 rounded-xl border border-border flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Sincronizado</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
        {visibleCatalogos.map((catalogo, idx) => (
          <motion.div
            key={catalogo.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group"
          >
            <Card
              className="cursor-pointer hover:bg-slate-50 transition-all border border-slate-100 shadow-none rounded-[1.5rem] overflow-hidden hover:scale-[1.02] active:scale-95"
              onClick={() => navigate(catalogo.href)}
            >
              <CardHeader className="pb-4">
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-3',
                  catalogo.color
                )}>
                  {catalogo.icon}
                </div>
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-primary transition-colors">{catalogo.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-[11px] font-bold text-slate-400 uppercase tracking-tight leading-tight mt-1">{catalogo.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex items-center justify-between">
                <div className="flex items-center text-[9px] font-black uppercase tracking-widest text-primary opacity-70 group-hover:opacity-100 transition-opacity">
                  GESTIONAR <span className="ml-2">→</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
