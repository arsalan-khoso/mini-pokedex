import { HttpErrorResponse } from '@angular/common/http';
import { defer, firstValueFrom, throwError } from 'rxjs';
import { vi } from 'vitest';
import { GraphqlRequestError } from '../../core/graphql/graphql.model';
import { isTransientError, retryWithBackoff } from './retry-with-backoff.util';

describe('retryWithBackoff', () => {
  it('treats network failures and 5xx as transient but not 4xx or GraphQL errors', () => {
    expect(isTransientError(new HttpErrorResponse({ status: 0 }))).toBe(true);
    expect(isTransientError(new HttpErrorResponse({ status: 503 }))).toBe(true);
    expect(isTransientError(new HttpErrorResponse({ status: 404 }))).toBe(false);
    expect(isTransientError(new GraphqlRequestError(['bad query']))).toBe(false);
  });

  it('retries a transient failure and succeeds once the source recovers', async () => {
    let attempts = 0;
    const source$ = defer(() => {
      attempts++;
      return attempts < 3 ? throwError(() => new HttpErrorResponse({ status: 0 })) : [42];
    });

    await expect(firstValueFrom(source$.pipe(retryWithBackoff(3, 1)))).resolves.toBe(42);
    expect(attempts).toBe(3);
  });

  it('does not retry a non-transient failure', async () => {
    const subscribe = vi.fn(() => throwError(() => new GraphqlRequestError(['bad query'])));

    await expect(
      firstValueFrom(defer(subscribe).pipe(retryWithBackoff(3, 1))),
    ).rejects.toBeInstanceOf(GraphqlRequestError);
    expect(subscribe).toHaveBeenCalledTimes(1);
  });
});
