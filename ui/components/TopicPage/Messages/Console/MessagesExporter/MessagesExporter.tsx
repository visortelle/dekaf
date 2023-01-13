import React, { useState } from 'react';
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import Select from '../../../../ui/Select/Select';
import { MessageDescriptor, SessionState } from '../../types';
import CsvConfigInput from './CsvConfigInput/CsvConfigInput';
import s from './MessagesExporter.module.css'
import { ExportConfig, Format, CsvConfig } from './types';
import useLocalStorage from 'use-local-storage-state';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import { localStorageKeys } from '../../../../local-storage-keys';
import * as Notifications from '../../../../app/contexts/Notifications';
import { ErrorBoundary } from 'react-error-boundary';
import MessageFieldsConfig from './MessageFieldsConfig/MessageFieldsConfig';

export type MessagesExporterProps = {
  messages: MessageDescriptor[],
  sessionState: SessionState,
  isVisible: boolean
};

const defaultFieldsConfig: MessageFieldsConfig = {
  fields: [
    { id: 'messageId', name: 'Message Id', isActive: true },
    { id: 'eventTime', name: 'Event time', isActive: true },
    { id: 'publishTime', name: 'Publish time', isActive: true },
    { id: 'brokerPublishTime', name: 'Broker publish time', isActive: true },
    { id: 'sequenceId', name: 'Sequence Id', isActive: true },
    { id: 'producerName', name: 'Producer name', isActive: true },
    { id: 'key', name: 'Key', isActive: true },
    { id: 'orderingKey', name: 'Ordering key', isActive: true },
    { id: 'topic', name: 'Topic', isActive: true },
    { id: 'size', name: 'Size', isActive: true },
    { id: 'redeliveryCount', name: 'Redelivery count', isActive: true },
    { id: 'schemaVersion', name: 'Schema version', isActive: true },
    { id: 'isReplicated', name: 'Is replicated', isActive: true },
    { id: 'replicatedFrom', name: 'Replicated from', isActive: true },
    { id: 'properties', name: 'Properties', isActive: true },
    { id: 'bytes', name: 'Bytes', isActive: true },
    { id: 'value', name: 'Value', isActive: true },
    { id: 'accum', name: 'Accum', isActive: true },
    { id: 'index', name: 'Index', isActive: true },
  ]
};

const defaultCsvConfig: CsvConfig = {
  quotes: true,
  quoteChar: '"',
  escapeChar: '"',
  delimiter: ',',
  header: true,
  newline: '\r\n',
  escapeFormulae: { type: 'true' },
}

const defaultExportConfig: ExportConfig = {
  format: { type: 'json' },
  data: [{ type: 'whole-message' }],
  dateFormat: 'iso',
  csvConfig: defaultCsvConfig,
  fields: defaultFieldsConfig,
};

const _MessagesExporter: React.FC<MessagesExporterProps & { config: ExportConfig, onConfigChange: (config: ExportConfig) => void }> = (props) => {
  if (!props.isVisible) {
    return <></>;
  }

  return (
    <div className={s.MessagesExporter}>
      <div className={s.ResetSettingsButton}>
        <SmallButton
          type='primary'
          text='Reset settings'
          onClick={() => props.onConfigChange(defaultExportConfig)}
        />
      </div>

      <FormItem>
        <div style={{ minWidth: '300rem' }}>
          <FormLabel content="File format" />
          <FormItem>
            <Select<Format['type']>
              list={[
                { type: 'item', value: 'json', title: 'JSON' },
                { type: 'item', value: 'json-values-only', title: 'JSON - values' },
                { type: 'item', value: 'json-bytes-only', title: 'JSON - raw values (base64)' },

                { type: 'item', value: 'csv', title: 'CSV' },
                { type: 'item', value: 'csv-values-only', title: 'CSV - values' },
                { type: 'item', value: 'csv-bytes-only', title: 'CSV - raw values (base64)' },

                { type: 'item', value: 'values', title: 'JSON value per file' },
                { type: 'item', value: 'bytes', title: 'Raw value per file' },
              ]}
              onChange={(v) => {
                let format: Format;
                switch (v) {
                  case 'json': format = { type: 'json' }; break;
                  case 'json-values-only': format = { type: 'json-values-only' }; break;
                  case 'json-bytes-only': format = { type: 'json-bytes-only' }; break;
                  case 'csv': format = { type: 'csv' }; break;
                  case 'csv-values-only': format = { type: 'csv-values-only' }; break;
                  case 'csv-bytes-only': format = { type: 'csv-bytes-only' }; break;
                  case 'values': format = { type: 'values' }; break;
                  case 'bytes': format = { type: 'bytes' }; break;
                }

                props.onConfigChange({ ...props.config, format });
              }}
              value={props.config.format.type}
            />
          </FormItem>

          {isCsvOutput(props.config) && (
              <CsvConfigInput
                value={props.config.csvConfig}
                onChange={(v) => {
                  if (!isCsvOutput(props.config)) {
                    return;
                  }

                  props.onConfigChange({ ...props.config, csvConfig: v })
                }}
              />
            )}
        </div>
      </FormItem>

      {isMessageFieldsConfigurable(props.config) && (
        <FormItem>
          <FormLabel content="Message fields" />
          <div className={s.MessageFieldsConfig}>
            <MessageFieldsConfig
              value={props.config.fields}
              onChange={(v) => props.onConfigChange({ ...props.config, fields: v })}
            />
          </div>
        </FormItem>
      )}
    </div>
  );
}

const MessagesExporter = (props: MessagesExporterProps) => {
  const [config, setConfig] = useLocalStorage<ExportConfig>(
    localStorageKeys.messageExportConfig,
    { defaultValue: defaultExportConfig }
  );

  const { notifyInfo } = Notifications.useContext();

  // We store ExportConfig in local storage.
  // Instead of describing ExportConfig type in JSON schema and validating the value from local-storage,
  // we are trying to recover from invalid config by resetting it to default.
  const [errorKey, setErrorKey] = useState(0);

  return (
    <ErrorBoundary
      onError={() => {
        setConfig(defaultExportConfig);
        setErrorKey(errorKey + 1);
        notifyInfo('Invalid export config. Resetting to default. Try to reload the page if the problem persists.');
      }}
      fallback={<></>}
    >
      <_MessagesExporter key={errorKey} {...props} config={config} onConfigChange={setConfig} />
    </ErrorBoundary>
  );
}

function isCsvOutput(config: ExportConfig): boolean {
  return config.format.type === 'csv' || config.format.type === 'csv-values-only' || config.format.type === 'csv-bytes-only';
}

function isJsonOutput(config: ExportConfig): boolean {
  return config.format.type === 'json' || config.format.type === 'json-values-only' || config.format.type === 'json-bytes-only';
}

function isMessageFieldsConfigurable(config: ExportConfig): boolean {
  return config.format.type === 'json' || config.format.type === 'csv';
}

export default MessagesExporter;
