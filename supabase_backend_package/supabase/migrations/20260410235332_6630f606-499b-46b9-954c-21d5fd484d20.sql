-- Add parent_position_id for position hierarchy
ALTER TABLE public.positions
ADD COLUMN parent_position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL;

-- Index for hierarchy queries
CREATE INDEX idx_positions_parent_position_id ON public.positions(parent_position_id);
