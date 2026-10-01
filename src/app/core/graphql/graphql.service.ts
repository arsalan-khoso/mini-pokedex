import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_REQUEST_TIMEOUT_MS } from '../../common/constants/api.constants';
import { GraphqlRequestError, GraphqlResponse } from './graphql.model';

@Injectable({ providedIn: 'root' })
export class GraphqlService {
  private readonly http = inject(HttpClient);

  /**
   * Executes a GraphQL operation against `url` and emits its `data` payload.
   *
   * GraphQL servers report failures as HTTP 200 with an `errors` array; those are
   * rethrown as {@link GraphqlRequestError} so every caller handles one error channel.
   * Requests that hang longer than {@link API_REQUEST_TIMEOUT_MS} fail with a `TimeoutError`.
   */
  request$<TData>(
    url: string,
    query: string,
    variables: Record<string, unknown> = {},
  ): Observable<TData> {
    return this.http.post<GraphqlResponse<TData>>(url, { query, variables }).pipe(
      timeout(API_REQUEST_TIMEOUT_MS),
      map((response) => {
        if (response.errors?.length) {
          throw new GraphqlRequestError(response.errors.map((error) => error.message));
        }
        if (response.data == null) {
          throw new GraphqlRequestError(['The response contained no data.']);
        }
        return response.data;
      }),
    );
  }
}
