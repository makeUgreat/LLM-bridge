import { type ApplicationErrorBase } from './error.base.js';

export class ApplicationException<
  F extends ApplicationErrorBase = ApplicationErrorBase,
> extends Error {
  readonly error: F;

  constructor(error: F) {
    super(error.message);
    this.name = 'ApplicationException';
    this.error = error;
  }
}
