import React, { useState } from 'react';
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import Select from '../../../../ui/Select/Select';
import { MessageDescriptor, SessionState } from '../../types';
import CsvConfigInput from './CsvConfigInput/CsvConfigInput';
import s from './MessagesExporter.module.css'
import { ExportConfig, Format } from './types';
import useLocalStorage from 'use-local-storage-state';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import { localStorageKeys } from '../../../../local-storage-keys';
import * as Notifications from '../../../../app/contexts/Notifications';
import { ErrorBoundary } from 'react-error-boundary';
import MessageFieldsConfig from './MessageFieldsConfig/MessageFieldsConfig';
import Button from '../../../../ui/Button/Button';
import exportIcon from './export.svg';
import { defaultExportConfig } from './defaults';
import * as jsonExporter from './exporters/json-message-per-entry';
import * as jsonValuesExporter from './exporters/json-value-per-entry';

export type MessagesExporterProps = {
  messages: MessageDescriptor[],
  sessionState: SessionState,
  isVisible: boolean
};

const _MessagesExporter: React.FC<MessagesExporterProps & { config: ExportConfig, onConfigChange: (config: ExportConfig) => void }> = (props) => {
  const [lastProcessedMessageIndex, setLastProcessedMessageIndex] = useState<undefined | number>();

  if (!props.isVisible) {
    return <></>;
  }

  return (
    <div className={s.MessagesExporter}>
      <div className={s.ResetSettingsButton}>
        <SmallButton
          type='regular'
          text='Reset export configuration'
          onClick={() => props.onConfigChange(defaultExportConfig)}
        />
      </div>

      <FormItem>
        <div style={{ width: '46ch' }}>
          <FormLabel content="File format" />
          <FormItem>
            <Select<Format['type']>
              list={[
                { type: 'item', value: 'json-message-per-entry', title: '.json - message per entry' },
                { type: 'item', value: 'json-value-per-entry', title: '.json - value per entry' },
                { type: 'item', value: 'json-raw-value-per-entry', title: '.json - raw value per entry (base64)' },

                { type: 'item', value: 'csv-message-per-row', title: '.csv - messages' },
                { type: 'item', value: 'csv-value-per-row', title: '.csv - value per row' },
                { type: 'item', value: 'csv-raw-value-per-row', title: '.csv - raw value per row (base64)' },

                { type: 'item', value: 'file-per-value', title: 'File per value' },
                { type: 'item', value: 'file-per-raw-value', title: 'File per raw value' },
              ]}
              onChange={(v) => {
                let format: Format;
                switch (v) {
                  case 'json-message-per-entry': format = { type: 'json-message-per-entry' }; break;
                  case 'json-value-per-entry': format = { type: 'json-value-per-entry' }; break;
                  case 'json-raw-value-per-entry': format = { type: 'json-raw-value-per-entry' }; break;
                  case 'csv-message-per-row': format = { type: 'csv-message-per-row' }; break;
                  case 'csv-value-per-row': format = { type: 'csv-value-per-row' }; break;
                  case 'csv-raw-value-per-row': format = { type: 'csv-raw-value-per-row' }; break;
                  case 'file-per-value': format = { type: 'file-per-value' }; break;
                  case 'file-per-raw-value': format = { type: 'file-per-raw-value' }; break;
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
          <FormLabel
            content={`Message fields ${props.config.fields.fields.filter(f => f.isActive).length} of ${props.config.fields.fields.length}`}
          />
          <div className={s.MessageFieldsConfig}>
            <MessageFieldsConfig
              value={props.config.fields}
              onChange={(v) => props.onConfigChange({ ...props.config, fields: v })}
            />
          </div>
        </FormItem>
      )}

      <FormItem>
        <Button
          type='primary'
          text='Export'
          svgIcon={exportIcon}
          onClick={() => {
            const exportName = `messages-${new Date().toISOString()}`;

            switch (props.config.format.type) {
              case 'json-message-per-entry': {
                jsonExporter.exportMessages({
                  messages: props.messages,
                  config: props.config,
                  exportName,
                });
              }; break;
              case 'json-value-per-entry': {
                jsonValuesExporter.exportMessages({
                  messages: props.messages,
                  config: props.config,
                  exportName,
                });
              }; break;
              default: console.log('Not implemented');
            }
          }}
        />
        {lastProcessedMessageIndex !== undefined && (
          <div>Messages processed: {lastProcessedMessageIndex + 1} / {props.messages.length}</div>
        )}
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
        notifyInfo('Invalid export config. Resetting to default. Try to reload the page if the problem persists.');
      }}
      fallback={<></>}
    >
      <_MessagesExporter key={errorKey} {...props} config={config} onConfigChange={setConfig} />
    </ErrorBoundary>
  );
}

function isCsvOutput(config: ExportConfig): boolean {
  return config.format.type === 'csv-message-per-row' || config.format.type === 'csv-value-per-row' || config.format.type === 'csv-raw-value-per-row';
}
function isMessageFieldsConfigurable(config: ExportConfig): boolean {
  return config.format.type === 'json-message-per-entry' || config.format.type === 'csv-message-per-row';
}

export default MessagesExporter;
