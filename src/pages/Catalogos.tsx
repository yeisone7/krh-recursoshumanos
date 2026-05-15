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
    color: 'bg-background/10 text-slate-500',
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
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="p-3 bg-primary/10 rounded-2xl">
          <FolderOpen className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogos del Sistema</h1>
          <p className="text-muted-foreground">Configura los parámetros globales de la plataforma</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {catalogos.map((catalogo, index) => (
          <motion.div
            key={catalogo.href}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-sidebar-border/50 hover:border-primary/20 overflow-hidden relative"
              onClick={() => navigate(catalogo.href)}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                {catalogo.icon}
              </div>
              <CardHeader className="pb-2">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 duration-300 ${catalogo.color}`}>
                  {catalogo.icon}
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">{catalogo.title}</CardTitle>
                <CardDescription className="line-clamp-2">{catalogo.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
                  Gestionar catálogo →
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
