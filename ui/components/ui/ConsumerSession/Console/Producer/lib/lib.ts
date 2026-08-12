import { Buffer } from 'buffer';
import { ValueType } from '../types';
import * as Either from 'fp-ts/lib/Either';
import { hexStringToByteArray } from '../../../../../conversions/conversions';

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
      // The parser REFUSES malformed hex by throwing rather than quietly writing some other byte.
      // This function advertises an Either and its caller inspects it inside an async click
      // handler with no try of its own, so an escaping throw rejected that handler: no message
      // sent, and no toast either - the click simply did nothing.
      try {
        return Either.right(hexStringToByteArray(value));
      } catch (err) {
        return Either.left(err as Error);
      }
    };
  }
}
