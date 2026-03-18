import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCie10Lookup } from '@/hooks/useCie10Lookup';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Cie10SearchInputProps {
  value: string;
  onChange: (code: string) => void;
  onDiagnosisFound: (diagnosis: string) => void;
  placeholder?: string;
  className?: string;
}

export function Cie10SearchInput({
  value,
  onChange,
  onDiagnosisFound,
  placeholder = 'Ej: A010 o buscar...',
  className,
}: Cie10SearchInputProps) {
  const { lookup, search, isLoaded } = useCie10Lookup();
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState<{ code: string; description: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Search on query change
  useEffect(() => {
    if (!isLoaded || query.length < 2) {
      setResults([]);
      return;
    }
    const r = search(query, 30);
    setResults(r);
    setSelectedIndex(-1);
  }, [query, search, isLoaded]);

  // Auto-lookup exact match
  useEffect(() => {
    if (!isLoaded || !query) return;
    const diagnosis = lookup(query);
    if (diagnosis) {
      onDiagnosisFound(diagnosis);
    }
  }, [query, lookup, isLoaded, onDiagnosisFound]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (code: string, description: string) => {
    setQuery(code);
    onChange(code);
    onDiagnosisFound(description);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const item = results[selectedIndex];
      handleSelect(item.code, item.description);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            onChange(val);
            setShowDropdown(true);
          }}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className}
        />
        {!isLoaded && (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ScrollArea className="max-h-[200px]">
            {results.map((item, idx) => (
              <button
                key={item.code}
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors',
                  idx === selectedIndex && 'bg-accent text-accent-foreground'
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item.code, item.description);
                }}
              >
                <span className="font-medium text-primary">{item.code}</span>
                <span className="ml-2 text-muted-foreground">{item.description}</span>
              </button>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
