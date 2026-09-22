/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { MapPin, Monitor, Plus, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOperationCenters } from "@/hooks/useCompanies";
import {
  useSaveTimeClockPoint,
  useRegisterTimeClockEvent,
} from "@/hooks/useTimeClock";
import {
  TIME_CLOCK_ACTION_LABELS,
  type TimeClockAction,
  type TimeClockPoint,
} from "@/types/timeClock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClockPointLink } from "./ClockPointLink";
const db = supabase as any;
const personName = (value: any) =>
  value ? `${value.first_name} ${value.last_name}`.trim() : "Empleado";
export function SupervisedPunch() {
  const { currentCompanyId } = useAuth();
  const register = useRegisterTimeClockEvent();
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [action, setAction] = useState<TimeClockAction>("clock_in");
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!currentCompanyId) return;
    db.from("employees_v2")
      .select("id,first_name,last_name,document_number")
      .eq("company_id", currentCompanyId)
      .eq("is_active", true)
      .order("first_name")
      .limit(1000)
      .then(({ data }: any) => setEmployees(data || []));
  }, [currentCompanyId]);
  async function submit() {
    if (!employeeId || reason.trim().length < 5)
      return toast.error("Selecciona un empleado y escribe el motivo");
    try {
      await register.mutateAsync({
        action,
        source: "supervised",
        employeeId,
        reason,
      });
      setReason("");
      toast.success("Marcación supervisada registrada");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo registrar");
    }
  }
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Registrar por un empleado</CardTitle>
        <p className="text-sm text-muted-foreground">
          La acción queda asociada a tu usuario y requiere un motivo de
          auditoría.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un empleado" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {personName(e)} · {e.document_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={action}
          onValueChange={(v) => setAction(v as TimeClockAction)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TIME_CLOCK_ACTION_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo obligatorio"
        />
        <Button onClick={submit} disabled={register.isPending}>
          <UserCheck className="mr-2 h-4 w-4" /> Registrar marcación
        </Button>
      </CardContent>
    </Card>
  );
}

export function PointsSettings({ points }: { points: TimeClockPoint[] }) {
  const { canCreate } = useAuth();
  const centers = useOperationCenters();
  const save = useSaveTimeClockPoint();
  const [open, setOpen] = useState(false);
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const initial = {
    name: "",
    operation_center_id: "",
    latitude: "",
    longitude: "",
    radius_meters: "100",
    max_accuracy_meters: "50",
    late_tolerance_minutes: "5",
    require_break_punches: false,
  };
  const [form, setForm] = useState(initial);
  function openNew() {
    setEditingPointId(null);
    setForm(initial);
    setOpen(true);
  }
  function editPoint(point: TimeClockPoint) {
    setEditingPointId(point.id);
    setForm({
      name: point.name,
      operation_center_id: point.operation_center_id,
      latitude: String(point.latitude),
      longitude: String(point.longitude),
      radius_meters: String(point.radius_meters),
      max_accuracy_meters: String(point.max_accuracy_meters),
      late_tolerance_minutes: String(point.late_tolerance_minutes),
      require_break_punches: point.require_break_punches,
    });
    setOpen(true);
  }
  async function submit() {
    if (
      !form.name.trim() ||
      !form.operation_center_id ||
      !form.latitude ||
      !form.longitude
    )
      return toast.error("Completa nombre, centro y coordenadas");
    try {
      await save.mutateAsync({
        id: editingPointId || undefined,
        name: form.name,
        operation_center_id: form.operation_center_id,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radius_meters: Number(form.radius_meters),
        max_accuracy_meters: Number(form.max_accuracy_meters),
        late_tolerance_minutes: Number(form.late_tolerance_minutes),
        require_break_punches: form.require_break_punches,
      });
      setForm(initial);
      setEditingPointId(null);
      setOpen(false);
      toast.success(editingPointId ? "Punto actualizado" : "Punto creado");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar");
    }
  }
  async function useCurrentLocation() {
    if (!navigator.geolocation) return toast.error("Ubicación no disponible");
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setForm((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        })),
      () => toast.error("No fue posible obtener la ubicación"),
      { enableHighAccuracy: true },
    );
  }
  async function togglePoint(point: TimeClockPoint) {
    try {
      await save.mutateAsync({ ...point, is_active: !point.is_active });
      toast.success(point.is_active ? "Punto desactivado" : "Punto activado");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo actualizar");
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Puntos de marcación</h2>
          <p className="text-sm text-muted-foreground">
            Define ubicación, radio y política de pausas por centro.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo punto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPointId ? "Editar punto" : "Nuevo punto"}
              </DialogTitle>
              <DialogDescription>
                Las coordenadas son el centro del perímetro permitido.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Recepción principal"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Centro</Label>
                <Select
                  value={form.operation_center_id}
                  onValueChange={(v) =>
                    setForm({ ...form, operation_center_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {(centers.data || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Latitud</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm({ ...form, latitude: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Longitud</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm({ ...form, longitude: e.target.value })
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="sm:col-span-2"
                onClick={useCurrentLocation}
              >
                <MapPin className="mr-2 h-4 w-4" /> Usar mi ubicación actual
              </Button>
              <div>
                <Label>Radio (m)</Label>
                <Input
                  type="number"
                  value={form.radius_meters}
                  onChange={(e) =>
                    setForm({ ...form, radius_meters: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Precisión máxima (m)</Label>
                <Input
                  type="number"
                  value={form.max_accuracy_meters}
                  onChange={(e) =>
                    setForm({ ...form, max_accuracy_meters: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Tolerancia tardanza (min)</Label>
                <Input
                  type="number"
                  value={form.late_tolerance_minutes}
                  onChange={(e) =>
                    setForm({ ...form, late_tolerance_minutes: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-xl border p-3">
                <div>
                  <Label>Marcar pausas</Label>
                  <p className="text-xs text-muted-foreground">
                    Solicita inicio y fin de pausa.
                  </p>
                </div>
                <Switch
                  checked={form.require_break_punches}
                  onCheckedChange={(v) =>
                    setForm({ ...form, require_break_punches: v })
                  }
                />
              </div>
            </div>
            <Button onClick={submit} disabled={save.isPending}>
              Guardar punto
            </Button>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {points.map((point) => (
          <Card key={point.id}>
            <CardContent className="p-5">
              <div className="flex justify-between">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <Badge variant={point.is_active ? "secondary" : "outline"}>
                  {point.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <h3 className="mt-4 font-bold">{point.name}</h3>
              <p className="text-sm text-muted-foreground">
                {point.operation_centers?.name}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted p-2">
                  Radio
                  <br />
                  <strong>{point.radius_meters} m</strong>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  Pausas
                  <br />
                  <strong>
                    {point.require_break_punches ? "Marcadas" : "Horario"}
                  </strong>
                </div>
              </div>
              <div className="mt-4">
                <ClockPointLink point={point} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => editPoint(point)}>
                  Editar
                </Button>
                <Button variant="outline" onClick={() => togglePoint(point)}>
                  {point.is_active ? "Desactivar" : "Activar"}
                </Button>
                <Button
                  variant="outline"
                  aria-label={`Abrir pantalla QR de ${point.name}`}
                  disabled={!point.is_active || !canCreate("reloj_checador")}
                  onClick={() =>
                    window.open(
                      `/reloj-checador/pantalla/${point.id}`,
                      "_blank",
                    )
                  }
                >
                  <Monitor className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
