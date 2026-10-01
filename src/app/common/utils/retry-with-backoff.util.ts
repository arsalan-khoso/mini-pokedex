import { HttpErrorResponse } from '@angular/common/http';
import { MonoTypeOperatorFunction, TimeoutError, retry, throwError, timer } from 'rxjs';
import { API_MAX_RETRIES, API_RETRY_BASE_DELAY_MS } from '../constants/api.constants';

/** Network drops, timeouts, rate limits and 5xx responses are worth retrying; 4xx and GraphQL errors are not. */
export function isTransientError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (error instanceof HttpErrorResponse) {
    return error.status === 0 || error.status === 429 || error.status >= 500;
  }
  return false;
}

/** Retries transient failures with exponential backoff (500ms, 1s, 2s by default). */
export function retryWithBackoff<T>(
  maxRetries = API_MAX_RETRIES,
  baseDelayMs = API_RETRY_BASE_DELAY_MS,
): MonoTypeOperatorFunction<T> {
  return retry({
    count: maxRetries,
    delay: (error: unknown, retryCount: number) =>
      isTransientError(error)
        ? timer(baseDelayMs * 2 ** (retryCount - 1))
        : throwError(() => error),
  });
}
