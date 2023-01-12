import React, { useState } from 'react';
import Checkbox from '../../../../ui/Checkbox/Checkbox';
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import Select from '../../../../ui/Select/Select';
import { MessageDescriptor, SessionState } from '../../types';
import CsvConfigInput from './CsvConfigInput/CsvConfigInput';
import s from './MessagesExporter.module.css'
import { ExportConfig, Chunking, Format, CsvConfig } from './types';
import useLocalStorage from 'use-local-storage-state';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import { localStorageKeys } from '../../../../local-storage-keys';
import * as Notifications from '../../../../app/contexts/Notifications';
import { ErrorBoundary } from 'react-error-boundary';

export type MessagesExporterProps = {
  messages: MessageDescriptor[],
  sessionState: SessionState,
  isVisible: boolean
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
  chunking: { type: 'no-chunking' },
  data: [{ type: 'whole-message' }],
  dateFormat: 'iso',
  csvConfig: defaultCsvConfig,
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

          {(
            props.config.format.type === 'csv' ||
            props.config.format.type === 'csv-values-only' ||
            props.config.format.type === 'csv-bytes-only'
          ) && (
              <CsvConfigInput
                value={props.config.csvConfig}
                onChange={(v) => {
                  if (props.config.format.type !== 'csv') {
                    return;
                  }

                  props.onConfigChange({ ...props.config, csvConfig: v })
                }}
              />
            )}
        </div>
      </FormItem>

      <FormItem>
        <FormLabel content="Group by" help="Each group will be exported as a separate file." />
        <Select<Chunking['type']>
          list={[
            { type: 'item', value: 'no-chunking', title: 'Don\'t group' },
            { type: 'item', value: 'file-per-message', title: 'File per message' },
            { type: 'item', value: 'by-message-key', title: 'Group by message key' },
            { type: 'item', value: 'by-topic-and-partition', title: 'Group by topic' },
            { type: 'item', value: 'by-producer-name', title: 'Group by producer name' },
          ]}
          onChange={(v) => props.onConfigChange({ ...props.config, chunking: { type: v } })}
          value={props.config.chunking.type}
        />
      </FormItem>

      <FormItem>
        <FormLabel content="Message value" />
        <Checkbox onChange={() => { }} checked={false} />
      </FormItem>
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
        notifyInfo('Invalid export config. Resetting to default.');
      }}
      fallback={<></>}
    >
      <_MessagesExporter key={errorKey} {...props} config={config} onConfigChange={setConfig} />
    </ErrorBoundary>
  );
}

export default MessagesExporter;
