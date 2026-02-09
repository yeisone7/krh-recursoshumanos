import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  colombianDepartments,
  getMunicipalitiesByDepartment,
  formatCityName,
  searchMunicipalities,
} from '@/data/colombianLocations';

interface CityDepartmentSelectProps {
  cityValue?: string;
  departmentValue?: string;
  onCityChange: (city: string) => void;
  onDepartmentChange: (department: string) => void;
  cityLabel?: string;
  departmentLabel?: string;
  cityPlaceholder?: string;
  departmentPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CityDepartmentSelect({
  cityValue,
  departmentValue,
  onCityChange,
  onDepartmentChange,
  cityLabel = 'Ciudad',
  departmentLabel = 'Departamento',
  cityPlaceholder = 'Buscar ciudad...',
  departmentPlaceholder = 'Seleccionar departamento',
  disabled = false,
  className,
}: CityDepartmentSelectProps) {
  const [cityOpen, setCityOpen] = React.useState(false);
  const [deptOpen, setDeptOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const municipalities = React.useMemo(() => {
    if (searchQuery.length >= 2) {
      return searchMunicipalities(searchQuery);
    }
    if (departmentValue) {
      return getMunicipalitiesByDepartment(departmentValue);
    }
    return [];
  }, [departmentValue, searchQuery]);

  const handleCitySelect = (city: string, department: string) => {
    onCityChange(formatCityName(city));
    onDepartmentChange(department);
    setCityOpen(false);
    setSearchQuery('');
  };

  const handleDepartmentSelect = (dept: string) => {
    onDepartmentChange(dept);
    onCityChange(''); // Reset city when department changes
    setDeptOpen(false);
  };

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {/* Department Select - First */}
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {departmentLabel}
        </label>
        <Popover open={deptOpen} onOpenChange={setDeptOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={deptOpen}
              className="w-full justify-between font-normal"
              disabled={disabled}
            >
              <span className="truncate">{departmentValue || departmentPlaceholder}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0 bg-background z-50" align="start">
            <Command>
              <CommandInput placeholder="Buscar departamento..." />
              <CommandList>
                <CommandEmpty>No se encontraron departamentos.</CommandEmpty>
                <CommandGroup>
                  {colombianDepartments.map((dept) => (
                    <CommandItem
                      key={dept}
                      value={dept}
                      onSelect={() => handleDepartmentSelect(dept)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          departmentValue === dept ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {dept}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* City Select - Second */}
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {cityLabel}
        </label>
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={cityOpen}
              className="w-full justify-between font-normal"
              disabled={disabled || !departmentValue}
            >
              <span className="truncate">{cityValue || (departmentValue ? cityPlaceholder : 'Seleccione departamento primero')}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0 bg-background z-50" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar municipio..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No se encontraron municipios.</CommandEmpty>
                <CommandGroup>
                  {municipalities.map((m) => (
                    <CommandItem
                      key={`${m.name}-${m.department}`}
                      value={`${m.name} ${m.department}`}
                      onSelect={() => handleCitySelect(m.name, m.department)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          cityValue?.toUpperCase() === m.name ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{formatCityName(m.name)}</span>
                        <span className="text-xs text-muted-foreground">{m.department}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// Simple single city select for forms that only need city
interface CitySelectProps {
  value?: string;
  onValueChange: (city: string, department?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CitySelect({
  value,
  onValueChange,
  placeholder = 'Buscar ciudad...',
  disabled = false,
  className,
}: CitySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const municipalities = React.useMemo(() => {
    if (searchQuery.length >= 2) {
      return searchMunicipalities(searchQuery);
    }
    return [];
  }, [searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
          disabled={disabled}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-background z-50" align="start">
        <Command>
          <CommandInput
            placeholder="Escriba para buscar..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {searchQuery.length < 2 
                ? 'Escriba al menos 2 caracteres...' 
                : 'No se encontraron municipios.'}
            </CommandEmpty>
            <CommandGroup>
              {municipalities.map((m) => (
                <CommandItem
                  key={`${m.name}-${m.department}`}
                  value={`${m.name} ${m.department}`}
                  onSelect={() => {
                    onValueChange(formatCityName(m.name), m.department);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value?.toUpperCase() === m.name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{formatCityName(m.name)}</span>
                    <span className="text-xs text-muted-foreground">{m.department}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
