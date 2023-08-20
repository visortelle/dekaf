import React, { ReactNode, useState } from 'react';
import useLocalStorage from "use-local-storage-state";
import { localStorageKeys } from '../../local-storage-keys';

type BuildInfo = {
  name: string,
  version: string,
  builtAtString: string,
  builtAtMillis: number
}
export type Config = {
  publicUrl: string,
  pulsarName: string,
  pulsarColor: string,
  pulsarBrokerUrl: string,
  pulsarHttpUrl: string,
  buildInfo: BuildInfo,
}

export type PerformanceOptimizations = {
  pulsarConsumerState: 'inactive' | 'active';
}

export type AutoRefresh = { type: 'enabled' | 'disabled' };

export type Value = {
  config: Config,
  performanceOptimizations: PerformanceOptimizations
  setPerformanceOptimizations: (performanceOptimizations: PerformanceOptimizations) => void;
  autoRefresh: AutoRefresh;
  setAutoRefresh: (autoRefresh: AutoRefresh) => void;
}

const defaultValue: Value = {
  config: {
    publicUrl: '',
    pulsarName: '',
    pulsarColor: '',
    pulsarBrokerUrl: '',
    pulsarHttpUrl: '',
    buildInfo: {
      name: '',
      version: '',
      builtAtString: '',
      builtAtMillis: 0
    },
  },
  performanceOptimizations: { pulsarConsumerState: 'inactive' },
  setPerformanceOptimizations: () => undefined,
  autoRefresh: { type: 'enabled' },
  setAutoRefresh: () => undefined,
};

const Context = React.createContext<Value>(defaultValue);

type DefaultProviderProps = {
  children: ReactNode,
  config: Config
};

export const DefaultProvider: React.FC<DefaultProviderProps> = (props) => {
  const [performanceOptimizations, setPerformanceOptimizations] = useState<PerformanceOptimizations>(defaultValue.performanceOptimizations);
  const [autoRefresh, setAutoRefresh] = useLocalStorage<AutoRefresh>(localStorageKeys.autoRefresh, { defaultValue: defaultValue.autoRefresh });

  return (
    <Context.Provider
      value={{
        ...defaultValue,
        config: props.config,
        performanceOptimizations,
        setPerformanceOptimizations: (performanceOptimizations: PerformanceOptimizations) => setPerformanceOptimizations(performanceOptimizations),
        autoRefresh,
        setAutoRefresh
      }}
    >
      {props.children}
    </Context.Provider>
  )
};

export const useContext = () => React.useContext(Context);
