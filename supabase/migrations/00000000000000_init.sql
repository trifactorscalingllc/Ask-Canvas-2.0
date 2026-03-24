-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  encrypted_canvas_key TEXT,
  iv TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chats table
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create proposed_tools table
CREATE TABLE public.proposed_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_feature TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposed_tools ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile."
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile."
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Chats policies
CREATE POLICY "Users can view their own chats."
  ON public.chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats."
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats."
  ON public.chats FOR UPDATE
  USING (auth.uid() = user_id);

-- Proposed tools policies
CREATE POLICY "Users can view their own proposed tools."
  ON public.proposed_tools FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own proposed tools."
  ON public.proposed_tools FOR INSERT
  WITH CHECK (auth.uid() = user_id);
