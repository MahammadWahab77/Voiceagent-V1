-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Students table (with name and phone)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  name TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  stage INT NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  tokens_used INT DEFAULT 0,
  response_time_ms INT DEFAULT 0,
  validation_passed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users (linked to auth.users)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage configs
CREATE TABLE IF NOT EXISTS stage_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_number INT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  validation_rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

-- Global config
CREATE TABLE IF NOT EXISTS global_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  global_system_prompt TEXT,
  rag_top_k INT DEFAULT 3,
  rag_similarity_threshold FLOAT DEFAULT 0.7,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

-- Analytics
CREATE TABLE IF NOT EXISTS student_analytics (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  total_sessions INT DEFAULT 0,
  avg_response_time_ms FLOAT DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  payment_option TEXT,
  stages_completed INT[] DEFAULT ARRAY[]::INT[],
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Document embeddings
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_stage ON conversations(stage);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON document_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Match function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Default stages
INSERT INTO stage_configs (stage_number, name, system_prompt, validation_rules) VALUES 
(1, 'Introduction', 'Greet the student warmly and ask about their learning goals.', '{"required_elements": ["greeting"], "min_length": 10, "tone": "friendly"}'),
(2, 'Information Gathering', 'Ask detailed questions to understand student needs.', '{"must_ask_question": true, "min_length": 20}'),
(3, 'Recommendation', 'Provide personalized recommendations.', '{"required_elements": ["recommendation"], "min_length": 50}')
ON CONFLICT (stage_number) DO NOTHING;

-- Default global config
INSERT INTO global_config (key, global_system_prompt, rag_top_k)
VALUES ('main', 'You are a helpful educational assistant.', 3)
ON CONFLICT (key) DO NOTHING;
