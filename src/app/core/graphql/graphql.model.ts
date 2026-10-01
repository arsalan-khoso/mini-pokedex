export interface GraphqlErrorItem {
  message: string;
}

export interface GraphqlResponse<TData> {
  data?: TData | null;
  errors?: readonly GraphqlErrorItem[];
}

export class GraphqlRequestError extends Error {
  constructor(readonly messages: readonly string[]) {
    super(messages.join('; '));
    this.name = 'GraphqlRequestError';
  }
}
