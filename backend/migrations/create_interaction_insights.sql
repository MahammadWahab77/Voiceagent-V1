-- Migration: Create interaction_insights table for storing business data points
-- This table stores insights logged by the log_interaction and trigger_handoff tools

CREATE TABLE IF NOT EXISTS interaction_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL DEFAULT 'general',
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'hesitant')),
    summary TEXT NOT NULL,
    stage INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE interaction_insights ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role access" ON interaction_insights
    FOR ALL USING (true) WITH CHECK (true);

-- Index for querying by student
CREATE INDEX IF NOT EXISTS idx_interaction_insights_student ON interaction_insights(student_id);
CREATE INDEX IF NOT EXISTS idx_interaction_insights_type ON interaction_insights(insight_type);

-- Add comment for documentation
COMMENT ON TABLE interaction_insights IS 'Stores business insights from AI conversations: preferences, objections, decisions, and handoff events';
