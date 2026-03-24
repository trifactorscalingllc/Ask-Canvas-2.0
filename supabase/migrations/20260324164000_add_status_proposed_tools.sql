ALTER TABLE public.proposed_tools ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
