/**
 * The message id behind "Message with specific ID", and why some text is not one.
 *
 * The shared hex parser reads blank text as an EMPTY byte array, and that is right for what it is
 * for: a byte payload really can be empty. A start POSITION cannot. The server parses this field as
 * a real message id and refuses zero bytes, so an empty field bought a full create round trip whose
 * only outcome was an error naming no field at all.
 *
 * Kept out of the component so every serialization path can refuse the same text with one check.
 * There is more than one such path and no single "last" place: the Play request conversion runs
 * after the click, and the library-save conversion runs on save - an unguarded parse in either
 * throws where nothing catches it, so the check belongs at each sink.
 */
import { hexStringToByteArray } from '../../../../conversions/conversions';

export function messageIdError(hexString: string): string | undefined {
  if (hexString.trim() === '') {
    return 'Enter the message id to start from, as hex bytes - for example 08 c3 03 10 cd 04 20 00 30 01.';
  }

  try {
    hexStringToByteArray(hexString);
    return undefined;
  } catch (err) {
    return (err as Error).message;
  }
}
