import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TRAINING_MONTHS,
  TRAINING_PERIOD_YEARS,
  type TrainingPeriodInput,
} from '@/lib/trainingPeriods';

type TrainingPeriodFilterProps = {
  value: TrainingPeriodInput | null;
  onChange: (period: TrainingPeriodInput | null) => void;
  className?: string;
};

export function TrainingPeriodFilter({ value, onChange, className }: TrainingPeriodFilterProps) {
  const currentYear = new Date().getFullYear();
  const [draftYear, setDraftYear] = useState(value?.year || (TRAINING_PERIOD_YEARS.includes(currentYear) ? currentYear : 2026));

  const handleMonthChange = (nextMonth: string) => {
    if (nextMonth === 'all') {
      onChange(null);
      return;
    }
    onChange({ year: value?.year || draftYear, month: Number(nextMonth) });
  };

  const handleYearChange = (nextYear: string) => {
    const numericYear = Number(nextYear);
    setDraftYear(numericYear);
    if (value) {
      onChange({ ...value, year: numericYear });
    }
  };

  return (
    <div className={`grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px] ${className || ''}`}>
      <Select value={value ? String(value.month) : 'all'} onValueChange={handleMonthChange}>
        <SelectTrigger className="h-12 rounded-xl border-border/50 bg-background shadow-inner text-sm">
          <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Periodo" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="all">Todos los periodos</SelectItem>
          {TRAINING_MONTHS.map((item) => (
            <SelectItem key={item.value} value={String(item.value)}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(value?.year || draftYear)} onValueChange={handleYearChange}>
        <SelectTrigger className="h-12 rounded-xl border-border/50 bg-background shadow-inner text-sm">
          <SelectValue placeholder="Año" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {TRAINING_PERIOD_YEARS.map((item) => (
            <SelectItem key={item} value={String(item)}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
