export function hexStringToByteArray(hexString: string): Uint8Array {
  const normalizedHexString = hexString.replace(/\s/g, '');
  if (normalizedHexString.length % 2 !== 0) {
    throw "Must have an even number of hex digits to convert to bytes";
  }
  var numBytes = normalizedHexString.length / 2;
  var byteArray = new Uint8Array(numBytes);
  for (var i = 0; i < numBytes; i++) {
    byteArray[i] = parseInt(normalizedHexString.substr(i * 2, 2), 16);
  }
  return byteArray;
}

export type ByteArrayStyle = 'hex-no-space' | 'hex-with-space';
export function hexStringFromByteArray(byteArray: Uint8Array, style: ByteArrayStyle): string {
  return Array.from(byteArray, function (byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join(style === 'hex-with-space' ? ' ' : '');
}
