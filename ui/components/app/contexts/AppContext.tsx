import React, { ReactNode, useState } from 'react';

type BuildInfo = {
  name: string,
  version: string,
  builtAtString: string,
  builtAtMillis: number
}
export type Config = {
  publicUrl: string,
  buildInfo: BuildInfo,
  pulsarInstance: {
    name: string,
    color: string,
    brokerServiceUrl: string,
    webServiceUrl: string,
  }
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
    publicUrl: '',
    buildInfo: {
      name: '',
      version: '',
      builtAtString: '',
      builtAtMillis: 0
    }
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
