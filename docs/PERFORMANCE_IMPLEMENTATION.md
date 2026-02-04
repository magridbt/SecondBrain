# 🛠️ Performance Implementation Guide
## SecondBrain-SriAmmaBhagavan

**Versão:** 1.0
**Data:** 2026-02-01
**Owner:** DevOps Agent (Gage)

Este documento contém **implementações prontas para usar** das otimizações de performance.

---

## 📦 Phase 1: Quick Wins (Implementações)

### **1. Índices de Banco de Dados**

**Arquivo:** `supabase/migrations/001_performance_indexes.sql`

```sql
-- =====================================================
-- Performance Optimization: Database Indexes
-- =====================================================

-- 1. Vector Search Index (HNSW - mais rápido que IVFFlat)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 2. Document Queries
CREATE INDEX IF NOT EXISTS idx_documents_user_created
ON documents(uploaded_by, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_source_status
ON documents(source_id, status)
WHERE deleted_at IS NULL;

-- 3. Conversation Queries (most common)
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
ON conversations(user_id, updated_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at DESC)
WHERE deleted_at IS NULL;

-- 4. Chunk Queries
CREATE INDEX IF NOT EXISTS idx_chunks_document_index
ON document_chunks(document_id, chunk_index)
WHERE deleted_at IS NULL;

-- 5. Feedback Analysis
CREATE INDEX IF NOT EXISTS idx_feedback_rating_created
ON feedback(rating, created_at DESC);

-- 6. Auth & User Queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_active
ON profiles(role, deleted_at)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invites_email_active
ON invites(email)
WHERE accepted_at IS NULL AND expires_at > NOW();

-- Analyze for query planner optimization
ANALYZE document_chunks;
ANALYZE documents;
ANALYZE conversations;
ANALYZE messages;
```

---

### **2. Dynamic Imports (Frontend)**

**Arquivo:** `src/core/layout/index.tsx`

```typescript
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Skeleton } from '@/shared/components/Skeleton';

// ✅ Code splitting: Carrega apenas quando necessário
const Sidebar = dynamic(() => import('./Sidebar'), {
  loading: () => <Skeleton className="h-screen w-64" />,
  ssr: true
});

const Header = dynamic(() => import('./Header'), {
  loading: () => <Skeleton className="h-16 w-full" />,
  ssr: true
});

// Admin só carrega no client e se usuário for admin
const AdminPanel = dynamic(() => import('@/modules/admin/components/AdminPanel'), {
  loading: () => <Skeleton className="p-4" />,
  ssr: false // Não renderizar no servidor para admin
});

export function PlatformLayout({
  children,
  isAdmin = false
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  return (
    <div className="flex h-screen">
      <Suspense fallback={<Skeleton className="w-64 h-screen" />}>
        <Sidebar />
      </Suspense>

      <div className="flex-1 flex flex-col">
        <Suspense fallback={<Skeleton className="h-16" />}>
          <Header />
        </Suspense>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {isAdmin && (
        <Suspense fallback={null}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
}
```

---

### **3. Response Cache (Redis)**

**Arquivo:** `src/modules/secondbrain/lib/cache.ts`

```typescript
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

interface CachedResponse {
  response: string;
  sources: any[];
  generatedAt: number;
}

/**
 * Cache de resposta com base em embedding semântico
 * TTL: 7 dias
 */
export async function getCachedResponse(
  questionEmbedding: number[]
): Promise<CachedResponse | null> {
  try {
    // Buscar em cache semântico (já implementado em architecture.md)
    // Esta é uma otimização adicional para cache rápido

    const embeddingHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(questionEmbedding))
      .digest('hex');

    const cached = await redis.get<CachedResponse>(
      `response:${embeddingHash}`
    );

    if (cached) {
      // Incrementar hit counter
      await redis.hincrby(`response:${embeddingHash}`, 'hits', 1);
      return cached;
    }

    return null;
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return null; // Falha graciosamente
  }
}

export async function setCachedResponse(
  questionEmbedding: number[],
  response: string,
  sources: any[]
): Promise<void> {
  try {
    const embeddingHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(questionEmbedding))
      .digest('hex');

    const cached: CachedResponse = {
      response,
      sources,
      generatedAt: Date.now()
    };

    // Set com TTL de 7 dias
    await redis.setex(
      `response:${embeddingHash}`,
      604800, // 7 dias em segundos
      JSON.stringify(cached)
    );
  } catch (error) {
    console.error('Cache set error:', error);
    // Não falhar a requisição se cache falhar
  }
}

/**
 * Session cache - 24 horas
 */
export async function cacheUserSession(
  userId: string,
  data: {
    preferences: any;
    tokenUsageToday: number;
  }
): Promise<void> {
  await redis.setex(
    `user:${userId}`,
    86400, // 24 horas
    JSON.stringify(data)
  );
}

export async function getUserSessionCache(userId: string) {
  return await redis.get(`user:${userId}`);
}

/**
 * Invalidar cache quando necessário
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await redis.del(`user:${userId}`);
}
```

---

### **4. Lazy Loading de Imagens**

**Arquivo:** `src/shared/components/OptimizedImage.tsx`

```typescript
'use client';

import Image from 'next/image';
import { useState } from 'react';
import clsx from 'clsx';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={clsx('relative overflow-hidden', className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        quality={80} // ✅ Reduz tamanho em ~20%
        placeholder="blur" // ✅ Blur placeholder para melhor LCP
        blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23f0f0f0' width='400' height='300'/%3E%3C/svg%3E"
        onLoadingComplete={() => setIsLoading(false)}
        className={clsx(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        sizes="(max-width: 640px) 100vw,
               (max-width: 1024px) 75vw,
               50vw" // ✅ Responsive images
      />
    </div>
  );
}
```

---

### **5. Compression & Headers (Next.js)**

**Arquivo:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ SWC Minifier (mais rápido que Terser)
  swcMinify: true,

  // ✅ Compress arquivos estáticos
  compress: true,

  // ✅ Remover source maps em produção
  productionBrowserSourceMaps: false,

  // ✅ Otimizar imagens automaticamente
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // ✅ Headers de performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          }
        ],
      },
      // Cache estático agressivo para assets
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

### **6. Middleware de Performance**

**Arquivo:** `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ✅ Adicionar headers de performance
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ✅ Habilitar compression
  response.headers.set('Vary', 'Accept-Encoding');

  // ✅ Cache headers baseado no path
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (request.nextUrl.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## 📊 Phase 2: Monitoring

### **7. Performance Tracking**

**Arquivo:** `src/shared/lib/monitoring/performance.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Track custom operations
 */
export async function trackOperation<T>(
  operationName: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = performance.now();

  const transaction = Sentry.startTransaction({
    op: operationName,
    name: `Operation: ${operationName}`,
  });

  try {
    const result = await fn();
    const duration = performance.now() - startTime;

    transaction.finish();

    await logMetric({
      operation: operationName,
      duration,
      success: true,
      metadata
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    transaction.setStatus('error');
    transaction.finish();

    await logMetric({
      operation: operationName,
      duration,
      success: false,
      error: (error as Error).message,
      metadata
    });

    throw error;
  }
}

/**
 * Log metrics para análise
 */
async function logMetric(metrics: PerformanceMetrics): Promise<void> {
  try {
    // Log local (ou enviar para analytics)
    console.log(`[${metrics.operation}] ${metrics.duration.toFixed(2)}ms`, {
      success: metrics.success,
      metadata: metrics.metadata
    });

    // Enviar para Sentry se falha
    if (!metrics.success) {
      Sentry.captureMessage(
        `Operation failed: ${metrics.operation}`,
        'error',
        {
          tags: { operation: metrics.operation },
          extra: metrics
        }
      );
    }
  } catch (error) {
    console.error('Metric logging error:', error);
  }
}

/**
 * Web Vitals
 */
export function reportWebVitals(metric: any): void {
  const { name, value, label } = metric;

  // Thresholds para boa performance
  const thresholds = {
    'FCP': 1500,     // First Contentful Paint
    'LCP': 2500,     // Largest Contentful Paint
    'CLS': 0.1,      // Cumulative Layout Shift
    'FID': 100,      // First Input Delay
    'TTFB': 600      // Time to First Byte
  };

  const threshold = thresholds[name as keyof typeof thresholds];
  const isGood = value <= threshold;

  if (!isGood) {
    Sentry.captureMessage(
      `Web Vital degradation: ${name}`,
      'warning',
      {
        extra: { name, value, label, threshold }
      }
    );
  }
}
```

---

## 🚀 Próximas Implementações

1. **Batch embeddings** - Processar múltiplos chunks em uma chamada
2. **Query profiling** - Identificar queries lentas automaticamente
3. **Load balancing** - Distribuir carga entre múltiplas instâncias
4. **CDN setup** - Servir assets estáticos via CDN global

---

**Owner:** Gage (DevOps Agent)
**Status:** Pronto para implementação
**Prioridade:** Phase 1 (Quick Wins) primeiro
