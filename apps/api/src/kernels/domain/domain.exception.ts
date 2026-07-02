import { type DomainErrorBase } from './error.base.js';

export class DomainException<
  F extends DomainErrorBase = DomainErrorBase,
> extends Error {
  readonly error: F;

  constructor(error: F) {
    super(error.message);
    this.name = 'DomainException';
    this.error = error;
  }
}
