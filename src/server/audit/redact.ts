// Helper to redact PII, tokens, and sensitive payment data
const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const CARD_REGEX = /\b(?:\d{4}[ -]?){3}(?=\d{4}\b)/g;
const SENSITIVE_KEYS = new Set([
  'authorization',
  'client_secret',
  'paypal_client_secret',
  'token',
  'access_token',
  'refresh_token',
  'password',
  'secret',
  'api_key',
  'apikey',
  'cvv',
  'cvc',
  'session_secret',
]);

export function redactString(str: string): string {
  return str
    .replace(EMAIL_REGEX, (match) => {
      const [name = '', domain = ''] = match.split('@');
      return `${name.slice(0, 2)}***@${domain}`;
    })
    .replace(CARD_REGEX, '****-****-****-');
}

export function redactObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return redactString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        copy[key] = '[REDACTED]';
      } else {
        copy[key] = redactObject(value);
      }
    }
    return copy as T;
  }

  return obj;
}
