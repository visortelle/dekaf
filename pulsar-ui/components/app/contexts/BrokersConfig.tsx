import React, { ReactNode } from 'react';
import * as Notifications from './Notifications';
import * as PulsarAdminClient from './PulsarAdminClient';
import useSWR from "swr";

type ConfigValue = undefined | { value: string, source: 'dynamic-config' | 'runtime-config' };
export type Value = {
  runtimeConfig: Record<string, string>;
  internalConfig: Record<string, string>;
  dynamicConfig: Record<string, string>;
  get: (key: string) => ConfigValue;
}

const defaultValue: Value = {
  runtimeConfig: {},
  internalConfig: {},
  dynamicConfig: {},
  get: (_: string) => undefined,
};

const swrKeys = {
  runtimeConfig: ['pulsar', 'brokers', 'runtimeConfig'],
  internalConfig: ['pulsar', 'brokers', 'internalConfig'],
  dynamicConfig: ['pulsar', 'brokers', 'dynamicConfig'],
}

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();

  const { data: runtimeConfig, error: runtimeConfigError } = useSWR(
    swrKeys.runtimeConfig,
    async () => await adminClient.brokers.getRuntimeConfiguration()
  );

  if (runtimeConfigError) {
    notifyError(`Unable to get broker's runtime configuration. ${runtimeConfigError}`);
  }

  const { data: internalConfig, error: internalConfigError } = useSWR(
    swrKeys.internalConfig,
    async () => await adminClient.brokers.getInternalConfigurationData()
  );

  if (internalConfigError) {
    notifyError(`Unable to get broker's internal configuration. ${runtimeConfigError}`);
  }

  const { data: dynamicConfig, error: dynamicConfigError } = useSWR(
    swrKeys.dynamicConfig,
    async () => await adminClient.brokers.getAllDynamicConfigurations()
  );

  if (dynamicConfigError) {
    notifyError(`Unable to get broker's dynamic configuration. ${runtimeConfigError}`);
  }

  // Please don't delete this line. Sometime it's useful to uncomment.
  // console.info('Broker config:', { runtimeConfig, internalConfig, dynamicConfig });

  return (
    <>
      <Context.Provider
        value={{
          runtimeConfig: runtimeConfig || {},
          internalConfig: internalConfig || {},
          dynamicConfig: dynamicConfig || {},
          get: (key) => {
            let value: ConfigValue = undefined;
            if (runtimeConfig !== undefined && runtimeConfig[key] !== undefined) {
              value = { value: runtimeConfig[key], source: 'runtime-config' };
            }
            if (dynamicConfig !== undefined && dynamicConfig[key] !== undefined) {
              value = { value: dynamicConfig[key], source: 'dynamic-config' };
            }
            return value;
          }
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
