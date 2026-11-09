export interface LogContext {
  requestId?: string;
  telegramUserId?: string;
  clinicId?: string;
  [key: string]: unknown;
}

const REDACT_KEYS = ['token', 'key', 'secret', 'password', 'authorization', 'api_key', 'apikey'];

function redactSensitive(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(redactSensitive);
  }
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (REDACT_KEYS.some((k) => key.toLowerCase().includes(k))) {
      copy[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      copy[key] = redactSensitive(value);
    } else {
      copy[key] = value;
    }
  }
  return copy;
}

export const logger = {
  info(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'test') return;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        ...(context ? (redactSensitive(context) as Record<string, unknown>) : {})
      })
    );
  },
  warn(message: string, context?: LogContext) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message,
        ...(context ? (redactSensitive(context) as Record<string, unknown>) : {})
      })
    );
  },
  error(message: string, context?: LogContext) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message,
        ...(context ? (redactSensitive(context) as Record<string, unknown>) : {})
      })
    );
  }
};

