-- Migration: Add conversation starters to custom_prompts
-- Date: 2026-01-21
-- Description: Adds conversation_starters column for example prompts (like ChatGPT GPTs)

-- Add conversation_starters column (JSON array of strings)
ALTER TABLE custom_prompts
ADD COLUMN IF NOT EXISTS conversation_starters JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN custom_prompts.conversation_starters IS 'Array of example prompts to help users get started (similar to ChatGPT GPTs conversation starters)';

-- Update existing default prompts with conversation starters
UPDATE custom_prompts
SET conversation_starters = '[
  "Crie uma mensagem sobre gratidão",
  "Fale sobre a importância da aceitação",
  "Uma reflexão sobre o amor incondicional"
]'::jsonb
WHERE slug = 'mensagem-inspiradora' AND conversation_starters = '[]'::jsonb;

UPDATE custom_prompts
SET conversation_starters = '[
  "Explore o conceito de presença",
  "Reflexão profunda sobre o sofrimento",
  "O que significa verdadeira liberdade?"
]'::jsonb
WHERE slug = 'reflexao-profunda' AND conversation_starters = '[]'::jsonb;

UPDATE custom_prompts
SET conversation_starters = '[
  "Uma prática de respiração consciente",
  "Exercício de gratidão matinal",
  "Meditação para o dia"
]'::jsonb
WHERE slug = 'pratica-do-dia' AND conversation_starters = '[]'::jsonb;

UPDATE custom_prompts
SET conversation_starters = '[
  "Post sobre paz interior",
  "Mensagem de bom dia espiritual",
  "Citação inspiradora para Instagram"
]'::jsonb
WHERE slug = 'post-redes-sociais' AND conversation_starters = '[]'::jsonb;
