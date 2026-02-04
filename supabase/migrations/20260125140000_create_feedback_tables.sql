-- Create message_feedback table for like/dislike feedback
CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  module TEXT NOT NULL DEFAULT 'sri-ab-teachings',
  feedback TEXT NOT NULL CHECK (feedback IN ('like', 'dislike')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user can only give one feedback per message
  UNIQUE(message_id, user_id)
);

-- Create message_fidelity_feedback table for fidelity ratings
CREATE TABLE IF NOT EXISTS message_fidelity_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  module TEXT NOT NULL DEFAULT 'sri-ab-teachings',
  fidelity TEXT NOT NULL CHECK (fidelity IN ('faithful', 'partial', 'unfaithful')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user can only give one fidelity feedback per message
  UNIQUE(message_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_message_feedback_user ON message_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_message ON message_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_module ON message_feedback(module);

CREATE INDEX IF NOT EXISTS idx_message_fidelity_feedback_user ON message_fidelity_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_message_fidelity_feedback_message ON message_fidelity_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_message_fidelity_feedback_module ON message_fidelity_feedback(module);

-- Enable Row Level Security
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_fidelity_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_feedback
CREATE POLICY "Users can view their own feedback"
  ON message_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
  ON message_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
  ON message_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
  ON message_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for message_fidelity_feedback
CREATE POLICY "Users can view their own fidelity feedback"
  ON message_fidelity_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fidelity feedback"
  ON message_fidelity_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fidelity feedback"
  ON message_fidelity_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fidelity feedback"
  ON message_fidelity_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON message_feedback TO authenticated;
GRANT ALL ON message_fidelity_feedback TO authenticated;
