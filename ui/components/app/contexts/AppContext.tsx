import React, { ReactNode, useState } from 'react';

type BuildInfo = {
  name: string,
  version: string,
  builtAtString: string,
  builtAtMillis: number
}

export type Config = {
  publicBaseUrl: string,
  /**
   * The path part of publicBaseUrl, starting and ending with a slash, e.g. "/" or "/dekaf/".
   * Use it instead of publicBaseUrl to build URLs the browser has to request, so that they
   * stay on the origin the UI is actually served from. See #349.
   */
  basePath: string,
  pulsarName: string,
  pulsarColor: string,
  pulsarBrokerUrl: string,
  pulsarWebUrl: string,
  buildInfo: BuildInfo,
}

export type PerformanceOptimizations = {
  pulsarConsumerState: 'inactive' | 'active';
}

// Consumed in ui/Table via one GLOBAL localStorage key shared by every table (an owner design
// decision: either the app auto-refreshes its tables or it doesn't). Lives here only as a type.
export type AutoRefresh = { type: 'enabled' | 'disabled' };

export type Value = {
  config: Config,
  performanceOptimizations: PerformanceOptimizations
  setPerformanceOptimizations: (performanceOptimizations: PerformanceOptimizations) => void;
}

const defaultValue: Value = {
  config: {
    publicBaseUrl: '',
    basePath: '/',
    pulsarName: '',
    pulsarColor: '',
    pulsarBrokerUrl: '',
    pulsarWebUrl: '',
    buildInfo: {
      name: '',
      version: '',
      builtAtString: '',
      builtAtMillis: 0
    },
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
  )
};

export const useContext = () => React.useContext(Context);
