/**
 * Client-side mirror of the backend's uniform error envelope
 * (`{"error": {"code", "message", "detail"}}`, TRD 8).
 *
 * The screen switches on `code`, never on `message`: the backend's message is a
 * developer-facing string, and the wording the teacher reads is decided here.
 */

export type ApiErrorCode =
  | 'not_found'
  | 'validation_error'
  | 'schema_error'
  | 'conflict'
  | 'permission_denied'
  | 'quota_exceeded'
  | 'unavailable'
  | 'http_error'
  | 'network_error'
  | 'unknown';

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    detail?: unknown;
  };
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly detail: unknown;

  constructor(code: ApiErrorCode, message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const envelope = body as Partial<ApiErrorEnvelope>;
    const error = envelope?.error;

    if (!error) {
      return new ApiError('unknown', `Unexpected response (HTTP ${status})`, status, body);
    }

    return new ApiError(error.code as ApiErrorCode, error.message, status, error.detail);
  }

  static network(cause: unknown): ApiError {
    return new ApiError('network_error', 'The server could not be reached', 0, cause);
  }

  /** Retrying only makes sense when the failure was not the caller's fault. */
  get isRetryable(): boolean {
    return this.code === 'network_error' || this.code === 'unavailable' || this.status >= 500;
  }
}
