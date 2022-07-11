import React, { ReactNode, useState } from 'react';

export type Config = {

};

export type PerformanceOptimizations = {
  pulsarConsumerState: 'inactive' | 'active';
}

export type Value = {
  config: Config,
  performanceOptimizations: PerformanceOptimizations
  setPerformanceOptimizations: (performanceOptimizations: PerformanceOptimizations) => void;
}

const defaultValue: Value = {
  config: {},
  performanceOptimizations: { pulsarConsumerState: 'inactive' },
  setPerformanceOptimizations: () => undefined,
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [performanceOptimizations, setPerformanceOptimizations] = useState<PerformanceOptimizations>(defaultValue.performanceOptimizations);

  return (
    <>
      <Context.Provider
        value={{
          ...defaultValue,
          performanceOptimizations,
          setPerformanceOptimizations: (performanceOptimizations: PerformanceOptimizations) => setPerformanceOptimizations(performanceOptimizations),
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
