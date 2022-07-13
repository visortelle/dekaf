import React, { ReactNode } from 'react';
import numeral from 'numeral';

export type Value = {
  formatBytes: (bytes: number) => string;
  formatBytesRate: (bytesPerSecond: number) => string;
  formatByteArray: (byteArray: Uint8Array, style: ByteArrayStyle) => string;
  formatCount: (count: number) => string;
  formatCountRate: (countPerSecond: number) => string;
  formatDate: (date: Date) => string;
  formatLongNumber: (longNumber: number) => string;
}

const defaultValue: Value = {
  formatBytes: (bytes) => bytes === 0 ? String(0) : (bytes < 1024 ? numeral(bytes).format('0b') : numeral(bytes).format('0.00b')),
  formatBytesRate: (bytesPerSecond) => bytesPerSecond === 0 ? String(0) : numeral(bytesPerSecond).format('0.00b') + '/s',
  formatByteArray: (byteArray, style) => toHexString(byteArray, style),
  formatCount: (count) => count === 0 ? String(0) : numeral(count).format(count < 1000 ? '0a' : '0.00a'),
  formatCountRate: (countPerSecond) => countPerSecond === 0 ? String(0) : numeral(countPerSecond).format(countPerSecond < 1000 ? '0a' : '0.00a') + '/s',
  formatDate: (date) => date.toISOString(),
  formatLongNumber: (longNumber) => numeral(longNumber).format('0,0'),
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <Context.Provider
        value={defaultValue}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);

type ByteArrayStyle = 'hex-no-space' | 'hex-with-space';
function toHexString(byteArray: Uint8Array, style: ByteArrayStyle): string {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join(style === 'hex-with-space' ? ' ' : '');
}
