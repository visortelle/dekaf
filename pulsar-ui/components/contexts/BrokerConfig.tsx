import React, { ReactNode, useState } from 'react';
import * as Notifications from './Notifications';
import * as PulsarAdminClient from './PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";

export type Value = {
  runtimeConfig: Record<string, string>,
  internalConfig: Record<string, string>,
  dynamicConfig: Record<string, string>,
}

const defaultValue: Value = {
  runtimeConfig: {},
  internalConfig: {},
  dynamicConfig: {}
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

  console.log('runtimeConfig', runtimeConfig);
  console.log('internalConfig', internalConfig);
  console.log('dynamicConfig', dynamicConfig);

  return (
    <>
      <Context.Provider
        value={{
          runtimeConfig: runtimeConfig || {},
          internalConfig: internalConfig || {},
          dynamicConfig: dynamicConfig || {}
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
