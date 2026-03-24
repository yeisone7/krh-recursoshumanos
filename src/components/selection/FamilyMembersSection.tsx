import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

interface FamilyMember {
  id: string;
  relationship: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  observations: string | null;
}

interface FamilyMembersSectionProps {
  candidateId: string;
}

const genderLabels: Record<string, string> = {
  M: 'Masculino',
  F: 'Femenino',
};

export function FamilyMembersSection({ candidateId }: FamilyMembersSectionProps) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('candidate_family_members' as any)
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: true });
      setMembers((data as any) || []);
      setLoading(false);
    };
    fetch();
  }, [candidateId]);

  if (loading || members.length === 0) return null;

  return (
    <>
      <Separator />
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Núcleo Familiar ({members.length} persona{members.length !== 1 ? 's' : ''} a cargo)
        </h3>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  {member.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.relationship}
                    {member.age != null && ` • ${member.age} años`}
                    {member.gender && ` • ${genderLabels[member.gender] || member.gender}`}
                  </p>
                </div>
              </div>
              {member.observations && (
                <Badge variant="outline" className="text-xs shrink-0 ml-2">
                  {member.observations}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
