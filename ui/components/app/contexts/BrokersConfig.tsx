import React, { ReactNode } from 'react';
import * as Notifications from './Notifications';
import * as GrpcClient from './GrpcClient/GrpcClient';
import useSWR from "swr";
import { swrKeys } from '../../swrKeys';
import { GetAllDynamicConfigurationsRequest, GetInternalConfigurationDataRequest, GetRuntimeConfigurationsRequest } from '../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import * as pbUtils from '../../../pbUtils/pbUtils';

type InternalConfigurationData = {
  zookeeperServers?: string;
  configurationStoreServers?: string;
  bookkeeperMetadataServiceUri?: string;
  stateStorageServiceUrl?: string;
}

type ConfigValue = undefined | { value: string, source: 'dynamic-config' | 'runtime-config' };
export type Value = {
  runtimeConfig: Record<string, string>;
  internalConfig: Record<string, string>;
  dynamicConfig: Record<string, string>;
  get: (key: string) => ConfigValue;
  isLoading: boolean;
}

const defaultValue: Value = {
  runtimeConfig: {},
  internalConfig: {},
  dynamicConfig: {},
  get: (_: string) => undefined,
  isLoading: true,
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const { brokersServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const { data: runtimeConfig, error: runtimeConfigError, isLoading: isRuntimeConfigLoading } = useSWR(
    swrKeys.pulsar.brokers.runtimeConfig._(),
    async () => {
      const req = new GetRuntimeConfigurationsRequest();
      const res = await brokersServiceClient.getRuntimeConfigurations(req, {}).catch(err => notifyError(`Unable to get runtime configurations: ${err}`));
      if (res === undefined) {
        return {};
      }
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get runtime configurations: ${res.getStatus()?.getMessage()}`);
        return {};
      }
      return pbUtils.mapToObject(res.getConfigMap());
    }
  );

  if (runtimeConfigError) {
    notifyError(`Unable to get broker's runtime configuration. ${runtimeConfigError}`);
  }

  const { data: internalConfig, error: internalConfigError, isLoading: isInternalConfigLoading } = useSWR(
    swrKeys.pulsar.brokers.internalConfig._(),
    async () => {
      const req = new GetInternalConfigurationDataRequest();
      const res = await brokersServiceClient.getInternalConfigurationData(req, {}).catch(err => notifyError(`Unable to get internal configuration data: ${err}`));
      if (res === undefined) {
        return {};
      }
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get internal configuration data: ${res.getStatus()?.getMessage()}`);
        return {};
      }
      const config = res.getConfig();
      const internalConfig: InternalConfigurationData = {
        bookkeeperMetadataServiceUri: config?.getBookkeeperMetadataServiceUri(),
        configurationStoreServers: config?.getConfigurationStoreServers(),
        stateStorageServiceUrl: config?.getStateStorageServiceUrl(),
        zookeeperServers: config?.getZookeeperServers(),
      }
      return internalConfig;
    }
  );

  if (internalConfigError) {
    notifyError(`Unable to get broker's internal configuration. ${runtimeConfigError}`);
  }

  const { data: dynamicConfig, error: dynamicConfigError } = useSWR(
    swrKeys.pulsar.brokers.dynamicConfig._(),
    async () => {
      const req = new GetAllDynamicConfigurationsRequest();
      const res = await brokersServiceClient.getAllDynamicConfigurations(req, {}).catch(err => notifyError(`Unable to get dynamic configurations: ${err}`));
      if (res === undefined) {
        return {};
      }
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get dynamic configurations: ${res.getStatus()?.getMessage()}`);
        return {};
      }
      return pbUtils.mapToObject(res.getConfigMap());
    }
  );

  if (dynamicConfigError) {
    notifyError(`Unable to get broker's dynamic configuration. ${runtimeConfigError}`);
  }

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
          },
          isLoading: isRuntimeConfigLoading || isInternalConfigLoading,
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
