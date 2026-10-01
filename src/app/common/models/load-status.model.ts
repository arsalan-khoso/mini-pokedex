export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

/** Async data plus the request lifecycle around it, so views can render loading / error / empty / success. */
export interface AsyncResource<T> {
  status: LoadStatus;
  data: T;
  error: string | null;
}
