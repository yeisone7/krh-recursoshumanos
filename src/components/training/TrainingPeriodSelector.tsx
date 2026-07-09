import { useState } from 'react';
import { CalendarDays, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TRAINING_MONTHS,
  TRAINING_PERIOD_YEARS,
  getTrainingPeriodKey,
  getTrainingPeriodLabel,
  sortTrainingPeriods,
  type TrainingPeriodInput,
} from '@/lib/trainingPeriods';

type TrainingPeriodSelectorProps = {
  value: TrainingPeriodInput[];
  onChange: (periods: TrainingPeriodInput[]) => void;
};

export function TrainingPeriodSelector({ value, onChange }: TrainingPeriodSelectorProps) {
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(TRAINING_PERIOD_YEARS.includes(currentYear) ? currentYear : 2026));

  const handleAdd = () => {
    const nextPeriod = { month: Number(month), year: Number(year) };
    const exists = value.some((period) => getTrainingPeriodKey(period) === getTrainingPeriodKey(nextPeriod));
    if (exists) return;
    onChange(sortTrainingPeriods([...value, nextPeriod]));
  };

  const handleRemove = (periodToRemove: TrainingPeriodInput) => {
    const keyToRemove = getTrainingPeriodKey(periodToRemove);
    onChange(value.filter((period) => getTrainingPeriodKey(period) !== keyToRemove));
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/50 bg-background p-4">
      <Label className="flex items-center gap-1.5">
        <CalendarDays className="h-4 w-4" />
        Periodos de control
      </Label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_auto]">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            {TRAINING_MONTHS.map((item) => (
              <SelectItem key={item.value} value={String(item.value)}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {TRAINING_PERIOD_YEARS.map((item) => (
              <SelectItem key={item} value={String(item)}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" className="rounded-xl font-bold" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar
        </Button>
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {sortTrainingPeriods(value).map((period) => (
            <Badge key={getTrainingPeriodKey(period)} variant="outline" className="gap-1 rounded-full px-3 py-1">
              {getTrainingPeriodLabel(period)}
              <button
                type="button"
                className="ml-1 rounded-full text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(period)}
                aria-label={`Quitar ${getTrainingPeriodLabel(period)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs font-medium text-muted-foreground">
          Sin periodos asignados. La capacitación solo aparecerá cuando el filtro esté en todos los periodos.
        </p>
      )}
    </div>
  );
}
