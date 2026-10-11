/**
 * Praesidium — Typed Errors
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown> | undefined;

  constructor(message: string, code: string, statusCode = 500, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context);
  }
}

export class StateTransitionError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'INVALID_STATE_TRANSITION', 400, context);
  }
}

export class IdempotencyError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'IDEMPOTENCY_CONFLICT', 409, context);
  }
}

export class JobError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'JOB_EXECUTION_ERROR', 500, context);
  }
}
