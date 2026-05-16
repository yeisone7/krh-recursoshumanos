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
  FolderOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const catalogos = [
  {
    title: 'Áreas',
    description: 'Departamentos y secciones de la empresa',
    icon: <Users className="w-6 h-6" />,
    href: '/catalogos/areas',
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    title: 'Cargos',
    description: 'Perfiles y descripciones de puestos',
    icon: <Briefcase className="w-6 h-6" />,
    href: '/catalogos/cargos',
    color: 'bg-emerald-500/10 text-emerald-500',
  },
  {
    title: 'Tipos de Contrato',
    description: 'Modelos de vinculación laboral',
    icon: <FileText className="w-6 h-6" />,
    href: '/catalogos/tipos-contrato',
    color: 'bg-orange-500/10 text-orange-500',
  },
  {
    title: 'Tipos de Dotación',
    description: 'Categorías de implementos y uniformes',
    icon: <Shirt className="w-6 h-6" />,
    href: '/catalogos/tipos-dotacion',
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    title: 'Días Festivos',
    description: 'Calendario de días no laborales',
    icon: <Calendar className="w-6 h-6" />,
    href: '/catalogos/festivos',
    color: 'bg-red-500/10 text-red-500',
  },
  {
    title: 'ARL',
    description: 'Aseguradoras de Riesgos Laborales',
    icon: <ShieldCheck className="w-6 h-6" />,
    href: '/catalogos/arl',
    color: 'bg-indigo-500/10 text-indigo-500',
  },
  {
    title: 'EPS',
    description: 'Entidades Promotoras de Salud',
    icon: <HeartPulse className="w-6 h-6" />,
    href: '/catalogos/eps',
    color: 'bg-rose-500/10 text-rose-500',
  },
  {
    title: 'AFP',
    description: 'Administradoras de Fondos de Pensiones',
    icon: <Landmark className="w-6 h-6" />,
    href: '/catalogos/afp',
    color: 'bg-amber-500/10 text-amber-500',
  },
  {
    title: 'Caja Compensación',
    description: 'Cajas de Compensación Familiar',
    icon: <Users className="w-6 h-6" />,
    href: '/catalogos/ccf',
    color: 'bg-cyan-500/10 text-cyan-500',
  },
  {
    title: 'AFC',
    description: 'Ahorro para el Fomento de la Construcción',
    icon: <Landmark className="w-6 h-6" />,
    href: '/catalogos/afc',
    color: 'bg-yellow-500/10 text-yellow-500',
  },
  {
    title: 'IPS',
    description: 'Instituciones Prestadoras de Salud',
    icon: <Stethoscope className="w-6 h-6" />,
    href: '/catalogos/ips',
    color: 'bg-teal-500/10 text-teal-500',
  },
  {
    title: 'Bancos',
    description: 'Entidades financieras para nómina',
    icon: <BanknoteIcon className="w-6 h-6" />,
    href: '/catalogos/bancos',
    color: 'bg-green-500/10 text-green-500',
  },
  {
    title: 'Motivos Novedad',
    description: 'Causas para cambios en nómina',
    icon: <ClipboardList className="w-6 h-6" />,
    href: '/catalogos/motivos-novedad',
    color: 'bg-slate-50 text-slate-500',
  },
  {
    title: 'Plataformas Publicación',
    description: 'Portales de empleo y redes sociales',
    icon: <Globe className="w-6 h-6" />,
    href: '/catalogos/plataformas-publicacion',
    color: 'bg-sky-500/10 text-sky-500',
  },
  {
    title: 'Niveles Educativos',
    description: 'Grados de escolaridad y formación',
    icon: <GraduationCap className="w-6 h-6" />,
    href: '/catalogos/niveles-educativos',
    color: 'bg-violet-500/10 text-violet-500',
  },
  {
    title: 'Profesiones',
    description: 'Catálogo de títulos y ocupaciones',
    icon: <Briefcase className="w-6 h-6" />,
    href: '/catalogos/profesiones',
    color: 'bg-lime-500/10 text-lime-500',
  },
];

export default function Catalogos() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white p-6 border rounded-xl">
        <div className="p-3 bg-blue-50 rounded-lg">
          <FolderOpen className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Catálogos del Sistema</h1>
          <p className="text-muted-foreground text-sm">Configura los parámetros globales de la plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {catalogos.map((catalogo) => (
          <div
            key={catalogo.href}
            className="group"
          >
            <Card 
              className="cursor-pointer hover:bg-slate-50 transition-colors border shadow-none rounded-xl overflow-hidden"
              onClick={() => navigate(catalogo.href)}
            >
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-colors ${catalogo.color.replace('/10', '')} bg-slate-50 border border-slate-100`}>
                  {catalogo.icon}
                </div>
                <CardTitle className="text-base font-bold text-foreground group-hover:text-blue-600 transition-colors">{catalogo.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs font-medium">{catalogo.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-blue-600 opacity-70 group-hover:opacity-100 transition-opacity">
                  GESTIONAR →
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
