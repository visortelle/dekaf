const hexGroupRegExp = /^[0-9a-fA-F]+$/;

export function hexStringToByteArray(hexString: string): Uint8Array {
  // Byte pairs may be separated by whitespace - that is how hexStringFromByteArray renders
  // 'hex-with-space'. A pair itself must not be split though, so validate group by group instead of
  // stripping all whitespace up front: otherwise "a 1b 2" silently regroups into different bytes.
  const groups = hexString.split(/\s+/).filter(group => group.length > 0);

  for (const group of groups) {
    if (!hexGroupRegExp.test(group)) {
      // parseInt() would otherwise stop at the first non-hex character or yield NaN, and the value
      // assigned into a Uint8Array would silently become some other byte.
      throw new Error(`Invalid hex string: "${group}" is not a hex number.`);
    }
    if (group.length % 2 !== 0) {
      throw new Error(`Invalid hex string: "${group}" must have an even number of hex digits to convert to bytes.`);
    }
  }

  const normalizedHexString = groups.join('');
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
