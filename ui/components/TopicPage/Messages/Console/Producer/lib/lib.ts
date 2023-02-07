import { Buffer } from 'buffer';
import { ValueType } from '../types';
import * as Either from 'fp-ts/lib/Either';

export function valueToBytes(value: string, valueType: ValueType): Either.Either<Error, Uint8Array> {
  switch (valueType) {
    case 'json': {
      let validationError: Error | undefined = undefined;
      try {
        JSON.parse(value);
      } catch (err) {
        validationError = err as Error;
      }

      if (validationError !== undefined) {
        return Either.left(validationError);
      }

      const bytes = Uint8Array.from(Buffer.from(value))
      return Either.right(bytes);
    };
    case 'bytes-hex': {
      const bytes = Uint8Array.from(Buffer.from(value.replace(/\s/g, ''), 'hex'))
      return Either.right(bytes);
    };
  }
}
