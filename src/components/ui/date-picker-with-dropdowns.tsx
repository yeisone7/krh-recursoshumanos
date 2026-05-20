import * as React from "react";
import { DayPicker, SelectSingleEventHandler } from "react-day-picker";
import { es } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DatePickerWithDropdownsProps {
  selected?: Date;
  onSelect?: SelectSingleEventHandler;
  disabled?: (date: Date) => boolean;
  fromYear?: number;
  toYear?: number;
  className?: string;
  initialFocus?: boolean;
}

const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function DatePickerWithDropdowns({
  className,
  selected,
  onSelect,
  disabled,
  fromYear = 1940,
  toYear = new Date().getFullYear(),
  initialFocus,
}: DatePickerWithDropdownsProps) {
  const [month, setMonth] = React.useState<Date>(
    selected instanceof Date ? selected : new Date()
  );

  // Generate years array
  const years = React.useMemo(() => {
    const yearList = [];
    for (let year = toYear; year >= fromYear; year--) {
      yearList.push(year);
    }
    return yearList;
  }, [fromYear, toYear]);

  const handleYearChange = (year: string) => {
    const newDate = new Date(month);
    newDate.setFullYear(parseInt(year));
    setMonth(newDate);
  };

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(month);
    newDate.setMonth(parseInt(monthIndex));
    setMonth(newDate);
  };

  return (
    <div className={cn("w-[min(18rem,calc(100vw-2rem))] p-3 pointer-events-auto", className)}>
      {/* Year and Month Dropdowns */}
      <div className="mb-3 grid grid-cols-[1fr_5.5rem] gap-2">
        <Select
          value={month.getMonth().toString()}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="h-9 min-w-0 text-sm">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent className="bg-background max-h-[200px]">
            {months.map((monthName, index) => (
              <SelectItem key={index} value={index.toString()}>
                {monthName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={month.getFullYear().toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="h-9 min-w-0 text-sm">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent className="bg-background max-h-[200px]">
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DayPicker
        mode="single"
        showOutsideDays
        month={month}
        onMonthChange={setMonth}
        selected={selected}
        onSelect={onSelect}
        disabled={disabled}
        locale={es}
        initialFocus={initialFocus}
        classNames={{
          months: "w-full",
          month: "w-full space-y-2",
          caption: "hidden",
          caption_label: "hidden",
          nav: "hidden",
          nav_button: "hidden",
          nav_button_previous: "hidden",
          nav_button_next: "hidden",
          table: "w-full border-collapse",
          head_row: "grid grid-cols-7",
          head_cell: "flex h-8 items-center justify-center rounded-md text-muted-foreground font-medium text-[0.78rem]",
          row: "grid grid-cols-7 mt-1",
          cell: "relative flex h-9 items-center justify-center p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
          day: cn(buttonVariants({ variant: "ghost" }), "h-8 w-8 p-0 font-normal aria-selected:opacity-100"),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
      />
    </div>
  );
}

DatePickerWithDropdowns.displayName = "DatePickerWithDropdowns";

export { DatePickerWithDropdowns };
