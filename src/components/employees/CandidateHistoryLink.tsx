import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, UserSearch } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CandidateDetailDialog } from '@/components/selection/CandidateDetailDialog';
import { candidateStatusLabels, candidateStatusConfig } from '@/types/vacancy';
import { cn } from '@/lib/utils';

interface CandidateHistoryLinkProps {
  employeeId: string;
}

export function CandidateHistoryLink({ employeeId }: CandidateHistoryLinkProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const { data: candidateRecords } = useQuery({
    queryKey: ['employee-candidate-history', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, first_name, last_name, status, application_date, vacancies(position_title)')
        .eq('employee_id', employeeId)
        .order('application_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  if (!candidateRecords?.length) return null;

  return (
    <>
      <Card className="border-info/30 bg-info/5 shadow-none">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-info/15">
              <UserSearch className="w-3.5 h-3.5 text-info" />
            </div>
            <span className="text-sm font-semibold text-foreground">Historial como Candidato</span>
          </div>
          <div className="space-y-1.5">
            {candidateRecords.map((c: any) => {
              const statusConfig = candidateStatusConfig[c.status as keyof typeof candidateStatusConfig];
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md bg-background/80 cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => setSelectedCandidateId(c.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground truncate">
                      {(c.vacancies as any)?.position_title || 'Vacante'}
                    </span>
                    <Badge
                      className={cn('text-[10px] h-5', statusConfig?.color)}
                    >
                      {candidateStatusLabels[c.status as keyof typeof candidateStatusLabels] || c.status}
                    </Badge>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedCandidateId && (
        <CandidateDetailDialog
          open={!!selectedCandidateId}
          onOpenChange={(open) => { if (!open) setSelectedCandidateId(null); }}
          candidateId={selectedCandidateId}
        />
      )}
    </>
  );
}
