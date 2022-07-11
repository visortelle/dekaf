import React, { ReactNode } from 'react';
import numeral from 'numeral';

export type Value = {
  formatBytes: (bytes: number) => string;
  formatBytesRate: (bytesPerSecond: number) => string;
  formatByteArray: (byteArray: Uint8Array) => string;
  formatCount: (count: number) => string;
  formatCountRate: (countPerSecond: number) => string;
  formatDate: (date: Date) => string;
  formatLongNumber: (longNumber: number) => string;
}

const defaultValue: Value = {
  formatBytes: (bytes: number) => bytes === 0 ? String(0) : numeral(bytes).format('0.00b'),
  formatBytesRate: (bytesPerSecond: number) => bytesPerSecond === 0 ? String(0) : numeral(bytesPerSecond).format('0.00b') + '/s',
  formatByteArray: (byteArray: Uint8Array) => toHexString(byteArray),
  formatCount: (count: number) => count === 0 ? String(0) : numeral(count).format(count < 1000 ? '0a' : '0.00a'),
  formatCountRate: (countPerSecond: number) => countPerSecond === 0 ? String(0) : numeral(countPerSecond).format(countPerSecond < 1000 ? '0a' : '0.00a') + '/s',
  formatDate: (date: Date) => date.toISOString(),
  formatLongNumber: (longNumber: number) => numeral(longNumber).format('0,0'),
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

function toHexString(byteArray: Uint8Array): string {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join(' ')
}
