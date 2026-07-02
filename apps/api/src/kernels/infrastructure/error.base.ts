export const INFRASTRUCTURE_ERROR_KIND = {
  UNAVAILABLE: 'unavailable',
  TIMEOUT: 'timeout',
  CONFLICT: 'conflict',
  INVALID_DATA: 'invalid_data',
  RESTORE_FAILED: 'restore_failed',
  BAD_RESPONSE: 'bad_response',
  UNEXPECTED: 'unexpected',
} as const;

export type InfrastructureErrorKind =
  (typeof INFRASTRUCTURE_ERROR_KIND)[keyof typeof INFRASTRUCTURE_ERROR_KIND];

export type InfrastructureErrorCode<
  Owner extends string,
  Reason extends string,
> = `${Owner}.${Reason}`;

export interface InfrastructureErrorSource {
  readonly boundary: string;
  readonly adapter: string;
}

export type InfrastructureErrorCauseDetails = {
  readonly cause: unknown;
};

export interface InfrastructureErrorBase<
  Kind extends InfrastructureErrorKind = InfrastructureErrorKind,
  Code extends string = string,
  Details extends InfrastructureErrorCauseDetails =
    InfrastructureErrorDetailsFor<Kind>,
  Source extends InfrastructureErrorSource = InfrastructureErrorSource,
> {
  readonly kind: Kind;
  readonly code: Code;
  readonly source: Source;
  readonly message: string;
  readonly details: Details;
}

export type InfrastructureErrorOf<
  Kind extends InfrastructureErrorKind,
  Owner extends string,
  Reason extends string,
  Details extends InfrastructureErrorCauseDetails =
    InfrastructureErrorDetailsFor<Kind>,
  Source extends InfrastructureErrorSource = InfrastructureErrorSource,
> = InfrastructureErrorBase<
  Kind,
  InfrastructureErrorCode<Owner, Reason>,
  Details,
  Source
>;

export type InfrastructureErrorDetailsFor<
  _Kind extends InfrastructureErrorKind,
> = InfrastructureErrorCauseDetails;
