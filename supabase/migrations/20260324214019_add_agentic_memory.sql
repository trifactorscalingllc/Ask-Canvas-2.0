-- Add JSONB cache column to users for semi-static course data
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "canvas_cache" jsonb;

-- Create the user_memories table for personalized LLM context
CREATE TABLE IF NOT EXISTS "public"."user_memories" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" uuid NOT NULL,
    "memory_text" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "user_memories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

-- Enable RLS on user_memories
ALTER TABLE "public"."user_memories" ENABLE ROW LEVEL SECURITY;

-- Policies for user_memories
CREATE POLICY "Users can insert their own memories." ON "public"."user_memories" 
FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own memories." ON "public"."user_memories" 
FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can update their own memories." ON "public"."user_memories" 
FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can delete their own memories." ON "public"."user_memories" 
FOR DELETE USING ((auth.uid() = user_id));

-- Trigger for updated_at on user_memories
CREATE TRIGGER update_user_memories_updated_at
BEFORE UPDATE ON public.user_memories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
