import type { CopasstElection } from '@/types/copasst';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CopasstElectionSelect({ elections, value, onChange }: {
  elections: CopasstElection[]; value?: string; onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[360px]" aria-label="Seleccionar elección">
        <SelectValue placeholder="Selecciona una elección" />
      </SelectTrigger>
      <SelectContent>
        {elections.map((election) => (
          <SelectItem key={election.id} value={election.id}>{election.title} · {election.term_label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
