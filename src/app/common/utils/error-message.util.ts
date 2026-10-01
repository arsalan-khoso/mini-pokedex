import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { GraphqlRequestError } from '../../core/graphql/graphql.model';

/** Builds a user-facing sentence such as "Couldn't load teams. The server can't be reached…". */
export function toUserMessage(error: unknown, action: string): string {
  return `Couldn't ${action}. ${describeError(error)}`;
}

function describeError(error: unknown): string {
  if (error instanceof TimeoutError) {
    return 'The request timed out.';
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return "The server can't be reached. Check your connection.";
    if (error.status >= 500) return 'The server is having trouble right now.';
    return `The server responded with an error (${error.status}).`;
  }
  if (error instanceof GraphqlRequestError) {
    return 'The server rejected the request.';
  }
  return 'Something unexpected happened.';
}
