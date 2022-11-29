import React, { ReactNode, useState } from 'react';

type BuildInfo = {

}
export type Config = {
  publicUrl: string
}

export type PerformanceOptimizations = {
  pulsarConsumerState: 'inactive' | 'active';
}

export type Value = {
  config: Config,
  performanceOptimizations: PerformanceOptimizations
  setPerformanceOptimizations: (performanceOptimizations: PerformanceOptimizations) => void;
}

const defaultValue: Value = {
  config: {
    publicUrl: ''
  },
  performanceOptimizations: { pulsarConsumerState: 'inactive' },
  setPerformanceOptimizations: () => undefined,
};

const Context = React.createContext<Value>(defaultValue);

type DefaultProviderProps = {
 children: ReactNode,
 config: Config
};

export const DefaultProvider: React.FC<DefaultProviderProps> = (props) => {
  const [performanceOptimizations, setPerformanceOptimizations] = useState<PerformanceOptimizations>(defaultValue.performanceOptimizations);

  return (
    <>
      <Context.Provider
        value={{
          ...defaultValue,
          config: props.config,
          performanceOptimizations,
          setPerformanceOptimizations: (performanceOptimizations: PerformanceOptimizations) => setPerformanceOptimizations(performanceOptimizations),
        }}
      >
        {props.children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
