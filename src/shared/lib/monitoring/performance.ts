/**
 * Performance Monitoring & Tracking
 * SecondBrain-SriAmmaBhagavan
 *
 * Integração com Sentry para:
 * - Tracking de operações customizadas
 * - Web Vitals monitoring
 * - Error tracking com contexto
 */

import * as Sentry from '@sentry/nextjs';

// =====================================================
// Types
// =====================================================

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
  tags?: Record<string, string>;
}

export interface WebVitalMetric {
  name: string;
  value: number;
  label: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}

// =====================================================
// Sentry Configuration
// =====================================================

/**
 * Inicializar Sentry com otimizações de performance
 */
export function initializePerformanceMonitoring(): void {
  if (typeof window === 'undefined') return; // Server-side

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

    // Before send - remove sensitive data
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },

    // Replay on error
    replaysOnErrorSampleRate: 1.0,
  });
}

// =====================================================
// Operation Tracking
// =====================================================

/**
 * Track operações customizadas com performance metrics
 *
 * @example
 * ```
 * const result = await trackOperation(
 *   'rag_query',
 *   async () => await ragQuery(question, userId),
 *   { userId, questionLength: question.length }
 * );
 * ```
 */
export async function trackOperation<T>(
  operationName: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>,
  tags?: Record<string, string>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await Sentry.startSpan(
      {
        op: operationName,
        name: `Operation: ${operationName}`,
        attributes: {
          ...metadata,
          ...tags,
        },
      },
      async () => {
        return await fn();
      }
    );

    const duration = performance.now() - startTime;

    // Log métrica
    await logMetric({
      operation: operationName,
      duration,
      success: true,
      metadata,
      tags
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    // Log erro
    await logMetric({
      operation: operationName,
      duration,
      success: false,
      error: (error as Error).message,
      metadata,
      tags
    });

    // Capture exception
    Sentry.captureException(error, {
      tags: {
        operation: operationName,
        ...tags,
      },
      contexts: {
        operation: {
          name: operationName,
          duration,
          ...metadata,
        },
      },
    });

    throw error;
  }
}

/**
 * Log métrica para análise
 */
async function logMetric(metrics: PerformanceMetrics): Promise<void> {
  try {
    console.log(
      `[${metrics.operation}] ${metrics.duration.toFixed(2)}ms`,
      {
        success: metrics.success,
        metadata: metrics.metadata
      }
    );

    // Enviar para Sentry se falha
    if (!metrics.success) {
      Sentry.captureMessage(
        `Operation failed: ${metrics.operation}`,
        'error'
      );
    }

    // Alerta se operação muito lenta
    if (metrics.duration > 5000) {
      Sentry.captureMessage(
        `Slow operation: ${metrics.operation} took ${metrics.duration.toFixed(0)}ms`,
        'warning'
      );
    }
  } catch (error) {
    console.error('Metric logging error:', error);
  }
}

// =====================================================
// Web Vitals Monitoring
// =====================================================

/**
 * Report Web Vitals para Sentry
 *
 * Métricas monitoradas:
 * - FCP: First Contentful Paint (< 1500ms = good)
 * - LCP: Largest Contentful Paint (< 2500ms = good)
 * - CLS: Cumulative Layout Shift (< 0.1 = good)
 * - FID: First Input Delay (< 100ms = good)
 * - TTFB: Time to First Byte (< 600ms = good)
 */
export function reportWebVitals(metric: WebVitalMetric): void {
  const { name, value, label, delta } = metric;

  // Definir thresholds para boa performance
  const thresholds: Record<string, number> = {
    'FCP': 1500,     // First Contentful Paint
    'LCP': 2500,     // Largest Contentful Paint
    'CLS': 0.1,      // Cumulative Layout Shift
    'FID': 100,      // First Input Delay
    'TTFB': 600      // Time to First Byte
  };

  const threshold = thresholds[name];
  const isGood = value <= threshold;

  // Log métrica
  console.log(`[${name}] ${value.toFixed(0)} (${label})`);

  // Enviar para Sentry se degradação de performance
  if (!isGood) {
    Sentry.captureMessage(
      `Web Vital degradation: ${name}`,
      'warning'
    );

    Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: `${name} is ${label}`,
      level: label === 'poor' ? 'error' : 'warning',
      data: {
        value,
        delta,
        threshold
      }
    });
  }

  // Report para analytics
  if (typeof window !== 'undefined') {
    // Enviar para Google Analytics se disponível
    if ((window as any).gtag) {
      (window as any).gtag('event', name, {
        value: Math.round(value),
        event_category: 'web_vitals',
        event_label: metric.id,
        non_interaction: true,
      });
    }
  }
}

// =====================================================
// Error Tracking
// =====================================================

/**
 * Track LLM errors com contexto
 */
export function trackLLMError(
  error: Error,
  context: {
    provider: string;
    model: string;
    userId?: string;
    tokensUsed?: number;
  }
): void {
  Sentry.captureException(error, {
    tags: {
      llm_provider: context.provider,
      llm_model: context.model,
    },
    contexts: {
      llm: {
        provider: context.provider,
        model: context.model,
        userId: context.userId,
        tokensUsed: context.tokensUsed
      }
    }
  });
}

/**
 * Track database errors
 */
export function trackDatabaseError(
  error: Error,
  context: {
    operation: string;
    table?: string;
    userId?: string;
  }
): void {
  Sentry.captureException(error, {
    tags: {
      error_type: 'database_error',
      db_operation: context.operation,
      db_table: context.table,
    }
  });
}

/**
 * Track API errors
 */
export function trackAPIError(
  error: Error,
  context: {
    endpoint: string;
    method: string;
    statusCode?: number;
    userId?: string;
  }
): void {
  Sentry.captureException(error, {
    tags: {
      error_type: 'api_error',
      api_endpoint: context.endpoint,
      api_method: context.method,
      status_code: context.statusCode?.toString(),
    }
  });
}

// =====================================================
// Custom Events
// =====================================================

/**
 * Track custom eventos de negócio
 */
export function trackEvent(
  eventName: string,
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    category: 'app',
    message: eventName,
    level: 'info',
    data
  });

  // Também enviar para analytics se disponível
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, data);
  }
}

/**
 * Track cache hits/misses
 */
export function trackCacheEvent(
  hit: boolean,
  operation: string,
  duration?: number
): void {
  Sentry.addBreadcrumb({
    category: 'cache',
    message: hit ? 'Cache hit' : 'Cache miss',
    level: 'debug',
    data: {
      operation,
      duration
    }
  });
}

/**
 * Track rate limit events
 */
export function trackRateLimitEvent(
  userId: string,
  endpoint: string,
  remaining: number
): void {
  if (remaining <= 5) {
    Sentry.captureMessage(
      `User approaching rate limit: ${userId} on ${endpoint}`,
      'warning'
    );
  }
}
