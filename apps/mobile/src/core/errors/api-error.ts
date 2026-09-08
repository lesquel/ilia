/**
 * Client-side mirror of the backend's uniform error envelope
 * (`{"error": {"code", "message", "detail"}}`, TRD 8).
 *
 * The screen switches on `code`, never on `message`: the backend's message is a
 * developer-facing string, and the wording the teacher reads is decided here.
 */

/**
 * The codes `core` knows about: the ones any endpoint can return.
 *
 * Features add their own on top (`invalid_credentials`, `quota_exceeded` for a
 * specific activity, …). Listing every feature's codes here would make `core`
 * depend on features, which is the one direction the architecture forbids.
 */
export type CommonErrorCode =
  | 'not_found'
  | 'validation_error'
  | 'schema_error'
  | 'conflict'
  | 'unauthenticated'
  | 'permission_denied'
  | 'quota_exceeded'
  | 'unavailable'
  | 'http_error'
  | 'network_error'
  | 'unknown';

/**
 * `string & {}` keeps autocomplete for the common codes while still accepting
 * a feature-specific one, instead of forcing a cast at every call site.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type ApiErrorCode = CommonErrorCode | (string & {});

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
