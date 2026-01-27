-- Table to track contract consecutive numbers per company per year
CREATE TABLE public.contract_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  prefix TEXT NOT NULL DEFAULT 'PC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, year)
);

-- Enable RLS
ALTER TABLE public.contract_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company sequences"
ON public.contract_sequences
FOR SELECT
USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert sequences for their company"
ON public.contract_sequences
FOR INSERT
WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can update sequences for their company"
ON public.contract_sequences
FOR UPDATE
USING (public.is_company_member(company_id));

-- Function to get next contract number
CREATE OR REPLACE FUNCTION public.get_next_contract_number(
  _company_id UUID,
  _prefix TEXT DEFAULT 'PC'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year INTEGER;
  _next_number INTEGER;
  _contract_number TEXT;
BEGIN
  _year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Insert or update the sequence and get the next number
  INSERT INTO public.contract_sequences (company_id, year, last_number, prefix)
  VALUES (_company_id, _year, 1, _prefix)
  ON CONFLICT (company_id, year)
  DO UPDATE SET 
    last_number = contract_sequences.last_number + 1,
    prefix = _prefix,
    updated_at = now()
  RETURNING last_number INTO _next_number;
  
  -- Format: PREFIX-YEAR-0001
  _contract_number := _prefix || '-' || _year::TEXT || '-' || LPAD(_next_number::TEXT, 4, '0');
  
  RETURN _contract_number;
END;
$$;

-- Add trigger to update updated_at
CREATE TRIGGER update_contract_sequences_updated_at
BEFORE UPDATE ON public.contract_sequences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();