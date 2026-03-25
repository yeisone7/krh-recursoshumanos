import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BackgroundEmployee {
  found: boolean;
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  hire_date?: string | null;
  termination_date?: string | null;
}

export interface BackgroundDisciplinary {
  id: string;
  case_number: string;
  status: string;
  fault_type: string;
  opening_date: string;
  sanction_type: string | null;
}

export interface BackgroundCandidacy {
  id: string;
  vacancy_id: string;
  status: string;
  first_name: string;
  last_name: string;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  department: string | null;
  birth_date: string | null;
  gender: string | null;
  gender_identity: string | null;
  education_level: string | null;
  profession: string | null;
  experience_years: number | null;
  current_company: string | null;
  current_position: string | null;
  application_date: string;
  vacancy_title: string | null;
}

export interface CandidateBackground {
  was_employee: BackgroundEmployee;
  disciplinary_processes: BackgroundDisciplinary[];
  previous_candidacies: BackgroundCandidacy[];
}

export function useCandidateBackground() {
  const [background, setBackground] = useState<CandidateBackground | null>(null);
  const [loading, setLoading] = useState(false);

  const checkBackground = useCallback(async (documentNumber: string, companyId?: string | null) => {
    if (!documentNumber || documentNumber.length < 4) {
      setBackground(null);
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_candidate_background', {
        p_document_number: documentNumber,
        p_company_id: companyId || null,
      } as any);

      if (error) {
        console.error('Error checking background:', error);
        setBackground(null);
        return null;
      }

      const result = data as unknown as CandidateBackground;
      setBackground(result);
      return result;
    } catch (err) {
      console.error('Error checking background:', err);
      setBackground(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setBackground(null);
  }, []);

  return { background, loading, checkBackground, reset };
}
