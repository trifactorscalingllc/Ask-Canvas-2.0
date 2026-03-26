-- 20260325000000_enable_vector_rag.sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for coarse-grained PDF/Syllabus chunks
CREATE TABLE IF NOT EXISTS course_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  embedding vector(1536)
);

-- Index for similarity search
CREATE INDEX ON course_documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable RLS
ALTER TABLE course_documents ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can read
DROP POLICY IF EXISTS "Users can read course documents" ON course_documents;
CREATE POLICY "Users can read course documents"
ON course_documents FOR SELECT
TO authenticated
USING (true);

-- Service role exclusively for ingestion
DROP POLICY IF EXISTS "Service role can manage documents" ON course_documents;
CREATE POLICY "Service role can manage documents"
ON course_documents FOR ALL
TO service_role
USING (true);

-- RPC Function for Similarity Search
CREATE OR REPLACE FUNCTION match_course_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_course_id text
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cd.id,
    cd.content,
    cd.metadata,
    1 - (cd.embedding <=> query_embedding) AS similarity
  FROM course_documents cd
  WHERE cd.course_id = filter_course_id
    AND 1 - (cd.embedding <=> query_embedding) > match_threshold
  ORDER BY cd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
