export { AggregateRoot } from './aggregate-root.base.js';
export { DomainException } from './domain.exception.js';
export { DomainEvent, type DomainEventParams } from './domain-event.base.js';
export {
  Entity,
  type AggregateID,
  type CreateEntityProps,
} from './entity.base.js';
export {
  DOMAIN_ERROR_KIND,
  type DomainError,
  type DomainErrorBase,
  type DomainErrorOf,
  type DomainErrorKind,
  type DomainValidationDetails,
} from './error.base.js';
export { newId } from './id-generator.js';
export { ValueObject, type DomainPrimitive } from './value-object.base.js';
