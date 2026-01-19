# Technical Architecture Document
## SecondBrain-SriAmmaBhagavan

**Versão:** 1.1
**Data:** 2026-01-15
**Autor:** Aria (Architect)
**Revisor:** QA Architect
**Status:** Reviewed & Updated

---

## 1. Executive Summary

Este documento define a arquitetura técnica para o **SecondBrain-SriAmmaBhagavan**, uma plataforma modular All-in-One que utiliza RAG (Retrieval-Augmented Generation) para responder perguntas baseadas nos ensinamentos de Sri Amma Bhagavan.

### Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **IA/LLM Principal** | Claude API (Anthropic) |
| **IA/LLM Fallback** | OpenAI GPT-4 (backup) |
| **Embeddings** | Voyage AI (principal) / OpenAI (fallback) |
| **Vector DB** | pgvector (extensão PostgreSQL) |
| **Cache** | Upstash Redis |
| **Email** | Resend |
| **Monitoring** | Sentry + Vercel Analytics |
| **Deploy** | Vercel (Frontend) + Supabase (Backend) |

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS                                          │
│                    (Browsers: Chrome, Safari, Firefox, Edge)                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLOUDFLARE                                       │
│                     (DNS + SSL + DDoS Protection)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VERCEL                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      NEXT.JS APPLICATION                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │    /core    │  │  /modules   │  │  /modules   │  │   /admin    │   │  │
│  │  │   Layout    │  │ secondbrain │  │ social-media│  │  Dashboard  │   │  │
│  │  │   Auth UI   │  │    Chat     │  │   (Soon)    │  │   Upload    │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    MIDDLEWARE LAYER                             │  │  │
│  │  │  [Auth Check] [Rate Limiter] [Token Budget] [Health Monitor]    │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│    UPSTASH REDIS    │  │      SUPABASE       │  │      SENTRY         │
│                     │  │                     │  │                     │
│  - Rate Limiting    │  │  - PostgreSQL       │  │  - Error Tracking   │
│  - Session Cache    │  │  - pgvector         │  │  - Performance      │
│  - Response Cache   │  │  - Auth             │  │  - Alerts           │
│                     │  │  - Storage          │  │                     │
└─────────────────────┘  │  - Edge Functions   │  └─────────────────────┘
                         └─────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │  CLAUDE API │ │  VOYAGE AI  │ │   RESEND    │
            │  (Primary)  │ │ (Embeddings)│ │  (Emails)   │
            └──────┬──────┘ └──────┬──────┘ └─────────────┘
                   │               │
            ┌──────▼──────┐ ┌──────▼──────┐
            │ OPENAI GPT  │ │   OPENAI    │
            │ (Fallback)  │ │ (Fallback)  │
            └─────────────┘ └─────────────┘
```

---

## 3. Resilience & Fallback Strategy

### 3.1 LLM Fallback Configuration

```typescript
// src/shared/lib/llm/provider.ts

export const LLM_CONFIG = {
  primary: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxRetries: 3,
    timeout: 30000
  },
  fallback: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    maxRetries: 2,
    timeout: 30000
  },
  circuitBreaker: {
    failureThreshold: 3,      // Falhas consecutivas para ativar
    resetTimeout: 60000,      // 1 minuto para tentar primary novamente
    halfOpenRequests: 2       // Requests de teste antes de reabrir
  }
};

export const EMBEDDING_CONFIG = {
  primary: {
    provider: 'voyage',
    model: 'voyage-2',
    dimensions: 1536
  },
  fallback: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536
  }
};
```

### 3.2 Circuit Breaker Implementation

```typescript
// src/shared/lib/llm/circuit-breaker.ts

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

class CircuitBreaker {
  private state: CircuitState = {
    failures: 0,
    lastFailure: 0,
    state: 'closed'
  };

  async execute<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>
  ): Promise<T> {
    if (this.state.state === 'open') {
      if (Date.now() - this.state.lastFailure > LLM_CONFIG.circuitBreaker.resetTimeout) {
        this.state.state = 'half-open';
      } else {
        console.log('[CircuitBreaker] Circuit open, using fallback');
        return fallbackFn();
      }
    }

    try {
      const result = await primaryFn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      console.error('[CircuitBreaker] Primary failed, using fallback:', error);
      return fallbackFn();
    }
  }

  private onSuccess() {
    this.state.failures = 0;
    this.state.state = 'closed';
  }

  private onFailure() {
    this.state.failures++;
    this.state.lastFailure = Date.now();
    if (this.state.failures >= LLM_CONFIG.circuitBreaker.failureThreshold) {
      this.state.state = 'open';
      // Alert admin
      notifyAdmin('LLM Circuit Breaker opened - switched to fallback');
    }
  }
}

export const llmCircuitBreaker = new CircuitBreaker();
```

---

## 4. Rate Limiting & Token Budget

### 4.1 Rate Limiting Strategy

```typescript
// src/shared/lib/rate-limit/config.ts

export const RATE_LIMITS = {
  chat: {
    // Por usuário
    perMinute: 10,
    perHour: 100,
    perDay: 500,
    // Global (proteção contra DDoS)
    globalPerMinute: 1000
  },
  admin: {
    uploadPerHour: 50,
    invitesPerDay: 100
  },
  api: {
    generalPerMinute: 60
  }
};

// Implementação com Upstash Redis
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export const chatRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:chat'
});

export const chatDailyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(500, '1 d'),
  analytics: true,
  prefix: 'ratelimit:chat:daily'
});
```

### 4.2 Token Budget Management

```typescript
// src/shared/lib/token-budget/config.ts

export const TOKEN_BUDGET = {
  // Limites por request
  request: {
    maxQuestionTokens: 500,
    maxContextTokens: 4000,
    maxResponseTokens: 2000,
    maxTotalTokens: 8000
  },
  // Limites por usuário
  user: {
    dailyTokens: 50000,
    monthlyTokens: 1000000
  },
  // Limites globais (proteção de custo)
  global: {
    dailyTokens: 5000000,
    monthlyTokens: 100000000,
    monthlyBudgetUSD: 200
  },
  // Alertas
  alerts: {
    userDailyWarning: 0.8,    // 80% do limite
    globalDailyWarning: 0.7,
    globalMonthlyWarning: 0.8
  }
};

// src/shared/lib/token-budget/tracker.ts

export class TokenBudgetTracker {
  async checkAndTrack(userId: string, tokensUsed: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    const key = `tokens:${userId}:${new Date().toISOString().split('T')[0]}`;
    const current = await redis.get<number>(key) || 0;

    if (current + tokensUsed > TOKEN_BUDGET.user.dailyTokens) {
      return {
        allowed: false,
        remaining: Math.max(0, TOKEN_BUDGET.user.dailyTokens - current),
        resetAt: getNextMidnight()
      };
    }

    await redis.incr(key, tokensUsed);
    await redis.expire(key, 86400); // 24h

    // Check global budget
    await this.trackGlobalUsage(tokensUsed);

    return {
      allowed: true,
      remaining: TOKEN_BUDGET.user.dailyTokens - current - tokensUsed,
      resetAt: getNextMidnight()
    };
  }

  private async trackGlobalUsage(tokens: number) {
    const dailyKey = `tokens:global:${new Date().toISOString().split('T')[0]}`;
    const daily = await redis.incr(dailyKey, tokens);

    if (daily > TOKEN_BUDGET.global.dailyTokens * TOKEN_BUDGET.alerts.globalDailyWarning) {
      notifyAdmin(`Global token usage at ${(daily / TOKEN_BUDGET.global.dailyTokens * 100).toFixed(1)}%`);
    }
  }
}
```

---

## 5. Backup Strategy

### 5.1 Backup Configuration

```yaml
# Backup Strategy

database:
  automated:
    provider: Supabase
    frequency: daily
    retention: 7 days (free) / 30 days (pro)
    point_in_time_recovery: true (pro plan)

  manual_exports:
    frequency: weekly
    destination: Google Cloud Storage
    tables:
      - documents
      - document_chunks
      - teaching_sources
      - conversations
      - messages
    format: pg_dump

storage:
  supabase_storage:
    versioning: enabled
    lifecycle_rules:
      - keep_versions: 5
      - delete_after: 90 days

  external_backup:
    provider: Google Cloud Storage
    bucket: secondbrain-backups
    frequency: daily
    retention: 90 days

embeddings:
  export:
    frequency: weekly
    format: JSON with metadata
    destination: Google Cloud Storage

  regeneration_script:
    location: scripts/regenerate-embeddings.ts
    estimated_cost: $50-100
    estimated_time: 2-4 hours
```

### 5.2 Backup Edge Function

```typescript
// supabase/functions/scheduled-backup/index.ts

import { createClient } from '@supabase/supabase-js';
import { Storage } from '@google-cloud/storage';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const storage = new Storage();
  const bucket = storage.bucket('secondbrain-backups');
  const timestamp = new Date().toISOString().split('T')[0];

  // Export critical tables
  const tables = ['documents', 'document_chunks', 'teaching_sources'];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) {
      console.error(`Error exporting ${table}:`, error);
      continue;
    }

    const filename = `${timestamp}/${table}.json`;
    await bucket.file(filename).save(JSON.stringify(data, null, 2));
    console.log(`Backed up ${table}: ${data.length} rows`);
  }

  // Export embeddings separately (large file)
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('id, document_id, embedding, metadata');

  await bucket
    .file(`${timestamp}/embeddings.json`)
    .save(JSON.stringify(chunks));

  return new Response(JSON.stringify({ success: true, timestamp }));
});
```

---

## 6. Database Schema (Updated)

### 6.1 Complete Schema with Triggers

```sql
-- =====================================================
-- Migration 00001: Extensions and Base Functions
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- Migration 00002: Profiles and Invites
-- =====================================================

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  avatar_url VARCHAR(500),
  preferences JSONB DEFAULT '{"language": "pt", "theme": "light"}',
  token_usage_today INTEGER DEFAULT 0,
  token_usage_month INTEGER DEFAULT 0,
  last_token_reset DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Invites table
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  invited_by UUID REFERENCES profiles(id),
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_pending_invite UNIQUE (email, accepted_at)
);

-- Indexes
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_deleted ON profiles(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- Migration 00003: Teaching Sources
-- =====================================================

CREATE TABLE teaching_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  document_count INTEGER DEFAULT 0,  -- Denormalized counter
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_teaching_sources_updated_at
  BEFORE UPDATE ON teaching_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial sources
INSERT INTO teaching_sources (name, description) VALUES
  ('Programa 81000 Deeksha Yajna', 'Ensinamentos do programa 81000'),
  ('Aulas Aprofundamentos', 'Aulas de aprofundamento espiritual'),
  ('Videos Kalki Dharma', 'Vídeos do Kalki Dharma'),
  ('Tejasaji', 'Ensinamentos de Tejasaji'),
  ('Outros', 'Outras fontes diversas');

-- =====================================================
-- Migration 00004: Documents and Chunks
-- =====================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('pdf', 'transcript', 'text')),
  source_id UUID NOT NULL REFERENCES teaching_sources(id),
  original_filename VARCHAR(255),
  storage_path VARCHAR(500),
  file_size_bytes INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'processed', 'indexed', 'error')),
  uploaded_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update source document count
CREATE OR REPLACE FUNCTION update_source_document_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE teaching_sources
    SET document_count = document_count + 1
    WHERE id = NEW.source_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE teaching_sources
    SET document_count = document_count - 1
    WHERE id = OLD.source_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_source_count
  AFTER INSERT OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_source_document_count();

-- Document chunks table
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_hash VARCHAR(64),  -- SHA256 for deduplication
  embedding VECTOR(1536),
  chunk_index INTEGER NOT NULL,
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_documents_source ON documents(source_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_deleted ON documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_name_search ON documents USING gin(to_tsvector('portuguese', name));
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_hash ON document_chunks(content_hash);

-- Vector index (HNSW for better recall than IVFFlat)
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- =====================================================
-- Migration 00005: Conversations and Messages
-- =====================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  module VARCHAR(50) NOT NULL DEFAULT 'secondbrain',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  model_used VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Function to update conversation message count and title
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET
    message_count = message_count + 1,
    title = COALESCE(title, LEFT(NEW.content, 100)),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.role = 'user')
  EXECUTE FUNCTION update_conversation_on_message();

-- Indexes
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_deleted ON conversations(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- =====================================================
-- Migration 00006: Feedback
-- =====================================================

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  rating VARCHAR(20) NOT NULL CHECK (rating IN ('like', 'dislike')),
  comment TEXT,
  tags VARCHAR(50)[],  -- ['inaccurate', 'helpful', 'missing_source', etc.]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_message_feedback UNIQUE (user_id, message_id)
);

CREATE INDEX idx_feedback_message ON feedback(message_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);

-- =====================================================
-- Migration 00007: Audit Logs
-- =====================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action VARCHAR(100),
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Migration 00008: Response Cache
-- =====================================================

CREATE TABLE response_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_hash VARCHAR(64) NOT NULL,  -- SHA256 of normalized question
  question_embedding VECTOR(1536),
  response TEXT NOT NULL,
  sources JSONB,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_cache_hash ON response_cache(question_hash);
CREATE INDEX idx_cache_embedding ON response_cache
  USING hnsw (question_embedding vector_cosine_ops);
CREATE INDEX idx_cache_expires ON response_cache(expires_at);

-- =====================================================
-- Migration 00009: Row Level Security
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_cache ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Teaching sources policies
CREATE POLICY "Authenticated users can view active sources"
  ON teaching_sources FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage sources"
  ON teaching_sources FOR ALL
  USING (is_admin());

-- Documents policies
CREATE POLICY "Authenticated users can view indexed documents"
  ON documents FOR SELECT
  TO authenticated
  USING (status = 'indexed' AND deleted_at IS NULL);

CREATE POLICY "Admins can manage documents"
  ON documents FOR ALL
  USING (is_admin());

-- Document chunks policies
CREATE POLICY "Authenticated users can search chunks"
  ON document_chunks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_chunks.document_id
      AND documents.status = 'indexed'
      AND documents.deleted_at IS NULL
    )
  );

-- Conversations policies
CREATE POLICY "Users can manage own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Messages policies
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
      AND conversations.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
      AND conversations.deleted_at IS NULL
    )
  );

-- Feedback policies
CREATE POLICY "Users can manage own feedback"
  ON feedback FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON feedback FOR SELECT
  USING (is_admin());

-- Invites policies
CREATE POLICY "Admins can manage invites"
  ON invites FOR ALL
  USING (is_admin());

-- Audit logs policies
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- Response cache policies
CREATE POLICY "System can manage cache"
  ON response_cache FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- Migration 00010: Semantic Search Function
-- =====================================================

CREATE OR REPLACE FUNCTION search_teachings(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_name VARCHAR,
  source_name VARCHAR,
  source_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    d.id AS document_id,
    d.name AS document_name,
    ts.name AS source_name,
    ts.id AS source_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  JOIN teaching_sources ts ON d.source_id = ts.id
  WHERE d.status = 'indexed'
    AND d.deleted_at IS NULL
    AND ts.is_active = true
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function for semantic cache lookup
CREATE OR REPLACE FUNCTION search_response_cache(
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.95
)
RETURNS TABLE (
  response TEXT,
  sources JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.response,
    rc.sources,
    1 - (rc.question_embedding <=> query_embedding) AS similarity
  FROM response_cache rc
  WHERE rc.expires_at > NOW()
    AND 1 - (rc.question_embedding <=> query_embedding) > similarity_threshold
  ORDER BY rc.question_embedding <=> query_embedding
  LIMIT 1;
END;
$$;
```

---

## 7. Project Structure (Updated)

```
secondbrain-sriammabhagavan/
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
│
├── public/
│   ├── favicon.ico
│   └── images/
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── invite/[token]/page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (platform)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── secondbrain/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [conversationId]/page.tsx
│   │   │   └── admin/
│   │   │       ├── page.tsx
│   │   │       ├── members/page.tsx
│   │   │       ├── sources/page.tsx
│   │   │       ├── documents/page.tsx
│   │   │       └── analytics/page.tsx      # NEW: Dashboard
│   │   │
│   │   ├── api/
│   │   │   ├── health/route.ts              # NEW: Health check
│   │   │   ├── chat/route.ts
│   │   │   └── webhook/route.ts
│   │   │
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── not-found.tsx
│   │
│   ├── core/
│   │   ├── auth/
│   │   ├── layout/
│   │   └── invite/
│   │
│   ├── modules/
│   │   ├── secondbrain/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── actions/
│   │   │   ├── lib/
│   │   │   │   ├── rag.ts
│   │   │   │   ├── embeddings.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── claude.ts
│   │   │   │   ├── cache.ts                 # NEW: Response cache
│   │   │   │   └── validation.ts            # NEW: Response validation
│   │   │   └── types/
│   │   └── social-media/
│   │
│   ├── admin/
│   │
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   │       ├── supabase/
│   │       ├── llm/                         # NEW: LLM abstraction
│   │       │   ├── provider.ts
│   │       │   ├── circuit-breaker.ts
│   │       │   ├── claude.ts
│   │       │   └── openai.ts
│   │       ├── rate-limit/                  # NEW: Rate limiting
│   │       │   ├── config.ts
│   │       │   └── middleware.ts
│   │       ├── token-budget/                # NEW: Token management
│   │       │   ├── config.ts
│   │       │   └── tracker.ts
│   │       ├── monitoring/                  # NEW: Monitoring
│   │       │   ├── sentry.ts
│   │       │   └── analytics.ts
│   │       ├── utils.ts
│   │       └── constants.ts
│   │
│   ├── i18n/
│   └── types/
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 00001_extensions_functions.sql
│   │   ├── 00002_profiles_invites.sql
│   │   ├── 00003_teaching_sources.sql
│   │   ├── 00004_documents_chunks.sql
│   │   ├── 00005_conversations_messages.sql
│   │   ├── 00006_feedback.sql
│   │   ├── 00007_audit_logs.sql
│   │   ├── 00008_response_cache.sql
│   │   ├── 00009_row_level_security.sql
│   │   └── 00010_search_functions.sql
│   ├── functions/
│   │   ├── process-document/
│   │   ├── generate-embeddings/
│   │   ├── send-invite/
│   │   └── scheduled-backup/                # NEW: Backup function
│   └── seed.sql
│
├── scripts/                                  # NEW: Utility scripts
│   ├── regenerate-embeddings.ts
│   ├── export-data.ts
│   └── health-check.ts
│
└── docs/
    ├── project-brief.md
    ├── prd.md
    └── architecture.md
```

---

## 8. Health Check & Monitoring

### 8.1 Health Check Endpoint

```typescript
// src/app/api/health/route.ts

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: CheckResult;
    claude_api: CheckResult;
    embeddings_api: CheckResult;
    redis: CheckResult;
    storage: CheckResult;
  };
  metrics?: {
    responseTimeMs: number;
    activeUsers24h: number;
    questionsToday: number;
    errorRate: number;
  };
}

interface CheckResult {
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}

export async function GET(request: Request) {
  const startTime = Date.now();
  const checks: HealthStatus['checks'] = {
    database: { status: 'error' },
    claude_api: { status: 'error' },
    embeddings_api: { status: 'error' },
    redis: { status: 'error' },
    storage: { status: 'error' }
  };

  // Check Database
  try {
    const dbStart = Date.now();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from('profiles').select('count').limit(1);
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (error) {
    checks.database = { status: 'error', error: (error as Error).message };
  }

  // Check Claude API
  try {
    const claudeStart = Date.now();
    const anthropic = new Anthropic();
    await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }]
    });
    checks.claude_api = { status: 'ok', latencyMs: Date.now() - claudeStart };
  } catch (error) {
    checks.claude_api = { status: 'error', error: (error as Error).message };
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!
    });
    await redis.ping();
    checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
  } catch (error) {
    checks.redis = { status: 'error', error: (error as Error).message };
  }

  // Determine overall status
  const failedChecks = Object.values(checks).filter(c => c.status === 'error');
  let overallStatus: HealthStatus['status'] = 'healthy';

  if (failedChecks.length > 0) {
    overallStatus = failedChecks.some(c =>
      c === checks.database || c === checks.claude_api
    ) ? 'unhealthy' : 'degraded';
  }

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks
  };

  return Response.json(response, {
    status: overallStatus === 'unhealthy' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
```

### 8.2 Monitoring Configuration

```typescript
// src/shared/lib/monitoring/sentry.ts

import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,

    beforeSend(event) {
      // Remove sensitive data
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
      }
      return event;
    },

    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],
  });
}

// Custom error tracking for LLM failures
export function trackLLMError(error: Error, context: {
  provider: string;
  model: string;
  userId?: string;
  tokensUsed?: number;
}) {
  Sentry.captureException(error, {
    tags: {
      llm_provider: context.provider,
      llm_model: context.model
    },
    extra: context
  });
}

// Track important events
export function trackEvent(name: string, data: Record<string, any>) {
  Sentry.addBreadcrumb({
    category: 'app',
    message: name,
    data,
    level: 'info'
  });
}
```

---

## 9. Response Caching & Validation

### 9.1 Semantic Response Cache

```typescript
// src/modules/secondbrain/lib/cache.ts

import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embeddings';
import crypto from 'crypto';

interface CachedResponse {
  response: string;
  sources: Source[];
  similarity: number;
}

export async function checkSemanticCache(
  question: string
): Promise<CachedResponse | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Generate embedding for the question
  const embedding = await generateEmbedding(question);

  // Search for similar cached responses
  const { data, error } = await supabase.rpc('search_response_cache', {
    query_embedding: embedding,
    similarity_threshold: 0.95
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  // Update hit count
  const questionHash = crypto
    .createHash('sha256')
    .update(question.toLowerCase().trim())
    .digest('hex');

  await supabase
    .from('response_cache')
    .update({ hit_count: data[0].hit_count + 1 })
    .eq('question_hash', questionHash);

  return {
    response: data[0].response,
    sources: data[0].sources,
    similarity: data[0].similarity
  };
}

export async function cacheResponse(
  question: string,
  questionEmbedding: number[],
  response: string,
  sources: Source[]
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const questionHash = crypto
    .createHash('sha256')
    .update(question.toLowerCase().trim())
    .digest('hex');

  await supabase.from('response_cache').upsert({
    question_hash: questionHash,
    question_embedding: questionEmbedding,
    response,
    sources,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });
}
```

### 9.2 Response Validation

```typescript
// src/modules/secondbrain/lib/validation.ts

interface ValidationResult {
  isGrounded: boolean;
  confidence: number;
  warnings: string[];
}

export function validateResponse(
  response: string,
  sources: Source[]
): ValidationResult {
  const warnings: string[] = [];
  let confidence = 1.0;

  // Check if response mentions sources
  const hasCitation = sources.some(s =>
    response.toLowerCase().includes(s.sourceName.toLowerCase()) ||
    response.includes('"') // Has quoted content
  );

  if (!hasCitation) {
    warnings.push('Response does not cite any sources');
    confidence -= 0.3;
  }

  // Check for hallucination indicators
  const hallucinationPhrases = [
    'eu acredito que',
    'na minha opinião',
    'provavelmente',
    'talvez',
    'i think',
    'in my opinion'
  ];

  for (const phrase of hallucinationPhrases) {
    if (response.toLowerCase().includes(phrase)) {
      warnings.push(`Response contains speculative phrase: "${phrase}"`);
      confidence -= 0.1;
    }
  }

  // Check response length vs context
  const totalSourceLength = sources.reduce((sum, s) => sum + s.content.length, 0);
  if (response.length > totalSourceLength * 2) {
    warnings.push('Response is significantly longer than source material');
    confidence -= 0.2;
  }

  return {
    isGrounded: confidence >= 0.5,
    confidence: Math.max(0, confidence),
    warnings
  };
}
```

---

## 10. Updated RAG Pipeline

```typescript
// src/modules/secondbrain/lib/rag.ts

import { llmCircuitBreaker } from '@/shared/lib/llm/circuit-breaker';
import { TokenBudgetTracker } from '@/shared/lib/token-budget/tracker';
import { generateEmbedding } from './embeddings';
import { searchSimilarChunks } from './search';
import { generateClaudeResponse, generateOpenAIResponse } from './claude';
import { checkSemanticCache, cacheResponse } from './cache';
import { validateResponse } from './validation';
import { trackEvent, trackLLMError } from '@/shared/lib/monitoring/sentry';

const tokenTracker = new TokenBudgetTracker();

export async function ragQuery(
  question: string,
  userId: string,
  conversationId?: string
): Promise<RAGResponse> {
  const startTime = Date.now();

  // 1. Check rate limits and token budget
  const budgetCheck = await tokenTracker.checkAndTrack(userId, 0);
  if (!budgetCheck.allowed) {
    throw new Error(`Daily token limit reached. Resets at ${budgetCheck.resetAt}`);
  }

  // 2. Check semantic cache first
  const cachedResponse = await checkSemanticCache(question);
  if (cachedResponse && cachedResponse.similarity > 0.95) {
    trackEvent('cache_hit', { similarity: cachedResponse.similarity });
    return {
      answer: cachedResponse.response,
      sources: cachedResponse.sources,
      fromCache: true,
      responseTimeMs: Date.now() - startTime
    };
  }

  // 3. Generate embedding for the question
  const questionEmbedding = await generateEmbedding(question);

  // 4. Search for similar chunks
  const chunks = await searchSimilarChunks(questionEmbedding, {
    limit: 5,
    minScore: 0.7
  });

  if (chunks.length === 0) {
    return {
      answer: 'Não encontrei ensinamentos específicos sobre esse tema na base de conhecimento. Por favor, tente reformular sua pergunta ou pergunte sobre outro aspecto.',
      sources: [],
      fromCache: false,
      responseTimeMs: Date.now() - startTime
    };
  }

  // 5. Build context
  const context = chunks.map(chunk => ({
    content: chunk.content,
    source: chunk.sourceName,
    document: chunk.documentName,
    page: chunk.metadata?.page
  }));

  // 6. Generate response with fallback
  let response: string;
  let modelUsed: string;
  let tokensUsed: number;

  try {
    const result = await llmCircuitBreaker.execute(
      // Primary: Claude
      async () => {
        const claudeResult = await generateClaudeResponse({
          question,
          context,
          systemPrompt: SYSTEM_PROMPT
        });
        return { ...claudeResult, model: 'claude-3-5-sonnet' };
      },
      // Fallback: OpenAI
      async () => {
        const openaiResult = await generateOpenAIResponse({
          question,
          context,
          systemPrompt: SYSTEM_PROMPT
        });
        return { ...openaiResult, model: 'gpt-4-turbo' };
      }
    );

    response = result.response;
    modelUsed = result.model;
    tokensUsed = result.tokensUsed;
  } catch (error) {
    trackLLMError(error as Error, {
      provider: 'all',
      model: 'fallback_failed',
      userId
    });
    throw new Error('Serviço temporariamente indisponível. Por favor, tente novamente em alguns minutos.');
  }

  // 7. Track token usage
  await tokenTracker.checkAndTrack(userId, tokensUsed);

  // 8. Validate response
  const sources = chunks.map(c => ({
    documentId: c.documentId,
    documentName: c.documentName,
    sourceName: c.sourceName,
    content: c.content,
    page: c.metadata?.page,
    score: c.score
  }));

  const validation = validateResponse(response, sources);
  if (!validation.isGrounded) {
    trackEvent('low_confidence_response', {
      confidence: validation.confidence,
      warnings: validation.warnings
    });
  }

  // 9. Cache the response
  await cacheResponse(question, questionEmbedding, response, sources);

  // 10. Return response
  return {
    answer: response,
    sources,
    fromCache: false,
    responseTimeMs: Date.now() - startTime,
    tokensUsed,
    modelUsed,
    validation
  };
}

const SYSTEM_PROMPT = `Você é um assistente espiritual que responde perguntas
baseado exclusivamente nos ensinamentos de Sri Amma Bhagavan.

REGRAS CRÍTICAS:
1. Responda APENAS com base no contexto fornecido - nunca invente
2. SEMPRE cite a fonte do ensinamento usando o formato: "texto" - Fonte: [Nome]
3. Use um tom sereno, compassivo e respeitoso
4. Se não encontrar informação relevante, diga: "Não encontrei um ensinamento específico sobre isso"
5. Não use frases como "eu acredito", "na minha opinião", "provavelmente"
6. Responda no idioma da pergunta (português ou inglês)
7. Seja conciso mas completo - não adicione informações além do contexto

Formato de citação:
"[citação exata do ensinamento]"
— Fonte: [Nome da Fonte], [Documento]`;
```

---

## 11. Environment Variables (Complete)

```bash
# .env.example

# =====================================================
# Supabase
# =====================================================
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# =====================================================
# LLM APIs
# =====================================================
# Primary LLM
ANTHROPIC_API_KEY=sk-ant-...

# Fallback LLM
OPENAI_API_KEY=sk-...

# =====================================================
# Embeddings
# =====================================================
# Primary
VOYAGE_API_KEY=pa-...

# Fallback (uses OPENAI_API_KEY above)

# =====================================================
# Cache & Rate Limiting
# =====================================================
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=xxx

# =====================================================
# Email
# =====================================================
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@sriammabhagavan.org

# =====================================================
# Monitoring
# =====================================================
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx

# =====================================================
# Backup (Google Cloud)
# =====================================================
GCP_PROJECT_ID=secondbrain-backups
GCP_BUCKET_NAME=secondbrain-backups
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# =====================================================
# App Configuration
# =====================================================
NEXT_PUBLIC_APP_URL=https://secondbrain.sriammabhagavan.org
NEXT_PUBLIC_APP_NAME=SecondBrain Sri Amma Bhagavan

# Invite settings
INVITE_EXPIRY_DAYS=7

# Token limits
MAX_TOKENS_PER_REQUEST=8000
MAX_TOKENS_PER_USER_DAILY=50000
MAX_TOKENS_GLOBAL_DAILY=5000000
MAX_MONTHLY_BUDGET_USD=200

# Rate limits
RATE_LIMIT_CHAT_PER_MINUTE=10
RATE_LIMIT_CHAT_PER_HOUR=100
RATE_LIMIT_CHAT_PER_DAY=500
```

---

## 12. Cost Estimation (Updated)

| Service | Free Tier | Estimated Usage | Monthly Cost |
|---------|-----------|-----------------|--------------|
| **Vercel** | 100GB bandwidth | ~50GB | $0 |
| **Supabase Pro** | - | Required for PITR backup | $25 |
| **Claude API** | - | ~300k tokens/day | ~$45-75 |
| **OpenAI (Fallback)** | - | ~50k tokens/day (10% traffic) | ~$5-10 |
| **Voyage AI** | - | ~50k embeddings | ~$5-10 |
| **Upstash Redis** | 10k commands/day | ~50k commands/day | $10 |
| **Resend** | 3k emails/month | ~100 emails | $0 |
| **Sentry** | 5k errors/month | ~1k errors | $0 |
| **GCS Backup** | 5GB free | ~5GB | $0 |
| **TOTAL** | | | **~$90-130/month** |

---

## 13. Security Checklist

- [x] Row Level Security (RLS) em todas as tabelas
- [x] Soft delete para dados sensíveis
- [x] Audit logs para ações administrativas
- [x] Rate limiting por usuário e global
- [x] Token budget para controle de custos
- [x] Circuit breaker para resiliência
- [x] Input validation em todos os endpoints
- [x] Sanitização de dados em logs (sem PII)
- [x] HTTPS forçado (Vercel + Cloudflare)
- [x] Environment variables para secrets
- [x] Backups automatizados
- [ ] Penetration testing (antes do lançamento público)
- [ ] LGPD compliance review

---

## 14. Launch Checklist

### Antes do MVP:
- [ ] Configurar Supabase Pro (backup PITR)
- [ ] Configurar Upstash Redis
- [ ] Configurar Sentry
- [ ] Configurar Google Cloud Storage para backups
- [ ] Criar primeiro admin via seed.sql
- [ ] Testar fluxo de convite completo
- [ ] Testar circuit breaker com fallback
- [ ] Carregar primeiros documentos de teste
- [ ] Validar rate limiting funciona
- [ ] Configurar alertas de custo

### Antes do lançamento público:
- [ ] Load testing (100 usuários simultâneos)
- [ ] Security review
- [ ] LGPD compliance
- [ ] Documentação de usuário
- [ ] Plano de suporte

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-01-15 | 1.0 | Versão inicial | Aria (Architect) |
| 2026-01-15 | 1.1 | Correções do review: fallback LLM, rate limiting, token budget, triggers, soft delete, audit logs, cache, health check, backup strategy | Aria + QA Architect |

---

*Documento gerado com Synkra AIOS - Aria (Architect)*

— Aria, arquitetando o futuro
