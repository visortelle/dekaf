import React, { useState } from 'react';
import useSWR from 'swr';

import { swrKeys } from '../../../../swrKeys';
import * as Notifications from '../../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/io/v1/io_pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import { BatchSourceConfig, SourceConfigurations, sourceConfigurations as defaultConfigurations, CryptoConfig, ProducerConfig } from '../configurationsFields/configurationsFields';
import IoUpdate from "../../IoUpdate/IoUpdate";
import updateSource from "../../IoUpdate/updateSource";
import { ConsumerCryptoFailureAction, ProcessingGuarantees, ProducerCryptoFailureAction, Resources } from '../../Sinks/configurationsFields/configurationsFields';

import s from './EditSource.module.css';

type EditSourceProps = {
  tenant: string,
  namespace: string,
  source: string,
}

const EditSource = (props: EditSourceProps) => {

  const { ioServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const [configurations, setConfigurations] = useState<SourceConfigurations>(defaultConfigurations);

  const producerCryptoFailureActionFromPb = (value: pb.ProducerCryptoFailureAction | undefined): ProducerCryptoFailureAction => {
    switch (value) {
      case pb.ProducerCryptoFailureAction.PRODUCER_CRYPTO_FAILURE_ACTION_FAIL:
        return 'fail';
      case pb.ProducerCryptoFailureAction.PRODUCER_CRYPTO_FAILURE_ACTION_SEND:
        return 'send';
      default: 
        return 'fail';
    }
  }

  const consumerCryptoFailureActionFromPb = (value: pb.ConsumerCryptoFailureAction | undefined): ConsumerCryptoFailureAction => {
    switch (value) {
      case pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_CONSUME:
        return 'consume';
      case pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_DISCARD:
        return 'discard';
      case pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_FAIL:
        return 'fail';
      default:
        return 'fail';
    }
  }

  const processingGuaranteesFromPb = (value: pb.ProcessingGuarantees | undefined): ProcessingGuarantees => {
    switch (value) {
      case pb.ProcessingGuarantees.PROCESSING_GUARANTEES_ATLEAST_ONCE:
        return 'atleast_once';
      case pb.ProcessingGuarantees.PROCESSING_GUARANTEES_ATMOST_ONCE:
        return 'atmost_once';
      case pb.ProcessingGuarantees.PROCESSING_GUARANTEES_EFFECTIVELY_ONCE:
        return 'effectively_once';
      default:
        return 'atleast_once';
    }
  }

  const getResources = (resourcesPb: pb.Resources | undefined): Resources => {
    const resources: Resources = {
      cpu: resourcesPb?.getCpu() || 1,
      ram: resourcesPb?.getRam() || 2,
      disk: resourcesPb?.getDisk() || 100,
    }

    return resources;
  }

  const getCryptoConfig = (cryptoConfigPb: pb.CryptoConfig | undefined): CryptoConfig => {
    const cryptoConfig: CryptoConfig = {
      cryptoKeyReaderClassName: cryptoConfigPb?.getCryptoKeyReaderClassName() || '',
      cryptoKeyReaderConfig: cryptoConfigPb?.getCryptoKeyReaderConfig() || '',
      encryptionKeys: cryptoConfigPb?.getEncryptionKeysList() || [],
      producerCryptoFailureAction: producerCryptoFailureActionFromPb(cryptoConfigPb?.getProducerCryptoFailureAction()),
      consumerCryptoFailureAction: consumerCryptoFailureActionFromPb(cryptoConfigPb?.getConsumerCryptoFailureAction()),
    }

    return cryptoConfig;
  }

  const getProducerConfig = (producerConfigPb: pb.ProducerConfig | undefined): ProducerConfig => {
    const producerConfig: ProducerConfig = {
      maxPendingMessages: producerConfigPb?.getMaxPendingMessages() || 0,
      maxPendingMessagesAcrossPartitions: producerConfigPb?.getMaxPendingMessagesAcrossPartitions() || 0,
      useThreadLocalProducers: producerConfigPb?.getUseThreadLocalProducers() || false,
      cryptoConfig: getCryptoConfig(producerConfigPb?.getCryptoConfig()),
      batchBuider: producerConfigPb?.getBatchBuilder() || '',
    }

    return producerConfig;
  }

  const getBatchSourceConfig = (batchSourceConfigPb: pb.BatchSourceConfig | undefined): BatchSourceConfig => {
    const batchSourceConfig: BatchSourceConfig = {
      batchsourceConfigKey: batchSourceConfigPb?.getBatchsourceConfigKey() || '',
      batchsourceClassnameKey: batchSourceConfigPb?.getBatchsourceClassnameKey() || '',
      discoveryTriggererClassName: batchSourceConfigPb?.getDiscoveryTriggererClassName() || '',
      discoveryTriggererConfig: batchSourceConfigPb?.getDiscoveryTriggererConfig() || '',
    }

    return batchSourceConfig;
  }

  const { data: sink, error: groupsError } = useSWR(
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.io.sources.edit._({ tenant: props.tenant, namespace: props.namespace, source: props.source }),
    async () => {
      const req = new pb.GetSourceRequest();
      req.setTenant(props.tenant);
      req.setNamespace(props.namespace);
      req.setSource(props.source)

      const res = await ioServiceClient.getSource(req, {});
      
      if (res === undefined) {
        return [];
      }
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get sink: ${res.getStatus()?.getMessage()}`);
        return [];
      }

      const sourceConfig = res.getSource();

      const source: SourceConfigurations = {
        name: sourceConfig?.getName() || '',
        className: sourceConfig?.getClassName() || '',
        topicName: sourceConfig?.getTopicName() || '',
        producerConfig: getProducerConfig(sourceConfig?.getProducerConfig()),
        serdeClassName: sourceConfig?.getSerdeClassName() || '',
        schemaType: sourceConfig?.getSchemaType() || '',
        configs: sourceConfig && JSON.parse(sourceConfig.getConfigs()),
        secrets: sourceConfig?.getSecrets() || '',
        parallelism: sourceConfig?.getParallelism() || 0,
        processingGuarantees: processingGuaranteesFromPb(sourceConfig?.getProcessingGuarantees()),
        resources: getResources(sourceConfig?.getResources()),
        archive: sourceConfig?.getArchive() || '',
        runtimeFlags: sourceConfig?.getRuntimeFlags() || '',
        customRuntimeOptions: sourceConfig?.getCustomRuntimeOptions() || '',
        batchSourceConfig: getBatchSourceConfig(sourceConfig?.getBatchSourceConfig()),
        batchBuilder: sourceConfig?.getBatchBuilder() || '',
      }

      setConfigurations(source);
      return null;
    }
  );

  if (groupsError) {
    notifyError(`Unable to get sink configs. ${groupsError}`);
  }

  return (
    <>
      {configurations ? 
        <IoUpdate
          configurations={configurations}
          action='edit'
          tenant={props.tenant}
          namespace={props.namespace}
          updateIo={updateSource}
          ioType='source'
        />
         :
        <div className={s.NoData}>No data to show.</div>
      }
    </>
  )
}

export default EditSource;