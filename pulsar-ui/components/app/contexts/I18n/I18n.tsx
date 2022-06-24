import React, { ReactNode } from 'react';

export type Value = {
  formatBytes: (bytes: number) => string;
  formatCount: (count: number) => string;
  formatRate: (countPerSecond: number) => string;
}

const defaultValue: Value = {
  formatBytes: (bytes: number) => String(bytes),
  formatCount: (count: number) => String(count),
  formatRate: (countPerSecond: number) => String(countPerSecond),
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
