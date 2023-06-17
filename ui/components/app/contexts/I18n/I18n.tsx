import React, { ReactNode } from 'react';
import numeral from 'numeral';
import dayjs from 'dayjs';
import _humanizeDuration from 'humanize-duration';

const humanizeDuration = _humanizeDuration.humanizer({
  language: "shortEn",
  languages: {
    shortEn: {
      y: () => "y",
      mo: () => "mo",
      w: () => "w",
      d: () => "d",
      h: () => "h",
      m: () => "m",
      s: () => "s",
      ms: () => "ms",
    },
  },
});

export type Value = {
  formatBytes: (bytes: number) => string;
  formatBytesRate: (bytesPerSecond: number) => string;
  bytesToHexString: (byteArray: Uint8Array, style: ByteArrayStyle) => string;
  hexStringToBytes: (hexString: string) => Uint8Array;
  formatCount: (count: number) => string;
  formatCountRate: (countPerSecond: number) => string;
  formatTime: (date: Date) => string;
  formatDateTime: (date: Date) => string;
  formatDuration: (millis: number) => string;
  formatLongNumber: (longNumber: number) => string;
  formatBoolean: (boolean: boolean) => string;
  withVoidDefault: <T>(value: T | undefined, format: (v: T) => ReactNode) => ReactNode | undefined;
}

const defaultValue: Value = {
  formatBytes: (bytes) => bytes === 0 ? String(0) : (bytes < 1024 ? numeral(bytes).format('0b') : numeral(bytes).format('0.00b')),
  formatBytesRate: (bytesPerSecond) => bytesPerSecond === 0 ? String(0) : numeral(bytesPerSecond).format('0.00b') + '/s',
  bytesToHexString: (byteArray, style) => bytesToHexString(byteArray, style),
  hexStringToBytes: (hexString) => hexStringToBytes(hexString),
  formatCount: (count) => count === 0 ? String(0) : numeral(count).format(count < 1000 ? '0a' : '0.00a'),
  formatCountRate: (countPerSecond) => countPerSecond === 0 ? String(0) : numeral(countPerSecond).format(countPerSecond < 1000 ? '0a' : '0.00a') + '/s',
  formatTime: (date) => dayjs(date).format('HH:mm:ss'),
  formatDateTime: (date) => dayjs(date).format('MMM DD, YYYY HH:mm:ss'),
  formatDuration: (millis) => humanizeDuration(millis, { language: 'shortEn', units: ['y', 'mo', 'w', 'd', 'h', 'm', 's', 'ms'], largest: 2, maxDecimalPoints: 2 }),
  formatLongNumber: (longNumber) => numeral(longNumber).format('0,0'),
  formatBoolean: (boolean) => boolean ? 'Yes' : 'No',
  withVoidDefault: (value, format) => value === undefined ? undefined : format(value),
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
function bytesToHexString(byteArray: Uint8Array, style: ByteArrayStyle): string {
  return Array.from(byteArray, function (byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join(style === 'hex-with-space' ? ' ' : '');
}
function hexStringToBytes(hexString: string): Uint8Array {
  const hs = hexString.replace(/\s/g, '');

  if (!hs) {
    return new Uint8Array();
  }

  let a = [];
  for (let i = 0, len = hs.length; i < len; i += 2) {
    a.push(parseInt(hs.substr(i, 2), 16));
  }

  return new Uint8Array(a);
}
