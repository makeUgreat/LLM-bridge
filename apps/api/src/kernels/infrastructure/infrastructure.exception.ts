import { type InfrastructureErrorBase } from './error.base.js';

export class InfrastructureException<
  F extends InfrastructureErrorBase = InfrastructureErrorBase,
> extends Error {
  readonly error: F;

  constructor(error: F) {
    super(error.message);
    this.name = 'InfrastructureException';
    this.error = error;
  }
}
