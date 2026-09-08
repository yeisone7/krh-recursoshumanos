import { useSearchParams } from 'react-router-dom';
import { Clock3, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyTimeClockEmployee } from '@/hooks/useTimeClock';
import { PortalAttendance } from '@/components/time-clock';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function TimeClockPunch() {
  const [params] = useSearchParams();
  const { signOut } = useAuth();
  const { data: employee, isLoading } = useMyTimeClockEmployee();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Clock3 className="h-10 w-10 animate-pulse text-primary" /></div>;
  if (!employee) return <div className="flex min-h-screen items-center justify-center p-4"><Card className="max-w-md"><CardContent className="p-7 text-center"><h1 className="text-xl font-bold">Cuenta sin empleado vinculado</h1><p className="mt-2 text-sm text-muted-foreground">Solicita a Recursos Humanos que vincule tu cuenta antes de marcar.</p><Button className="mt-5" variant="outline" onClick={signOut}>Cerrar sesión</Button></CardContent></Card></div>;
  return <div className="min-h-screen bg-muted/30">
    <header className="border-b bg-background"><div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4"><div className="flex items-center gap-2 font-bold text-primary"><Clock3 className="h-5 w-5" /> Reloj Checador</div><Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Salir</Button></div></header>
    <main className="mx-auto max-w-5xl p-4 py-6"><PortalAttendance employeeId={employee.id} pointId={params.get('point')} qrToken={params.get('token')} /></main>
  </div>;
}
