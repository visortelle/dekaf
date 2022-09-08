import React, { useEffect, useRef } from 'react';
import s from './Configuration.module.css';
import * as BrokerConfig from '../../app/contexts/BrokersConfig';
import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import editIcon from '!!raw-loader!./edit.svg';
import closeIcon from '!!raw-loader!./close.svg';
import useSWR, { mutate } from 'swr';
import * as PulsarAdminClient from '../../app/contexts/PulsarAdminClient';
import * as Notifications from '../../app/contexts/Notifications';
import Input from '../../ui/Input/Input';
import SmallButton from '../../ui/SmallButton/SmallButton';
import Button from '../../ui/Button/Button';
import { swrKeys } from '../../swrKeys';
import Highlighter from "react-highlight-words";
import { useQueryParam, withDefault, StringParam, BooleanParam } from 'use-query-params';
import { help } from './help';
import ReactDOMServer from 'react-dom/server';

const Configuration: React.FC = () => {
  const { dynamicConfig, runtimeConfig } = BrokerConfig.useContext();
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const [isShowDynamicOnly, setIsShowDynamicOnly] = useQueryParam('showDynamicOnly', withDefault(BooleanParam, false));
  const [paramFilter, setParamFilter] = useQueryParam('paramFilter', withDefault(StringParam, ''));

  const { data: availableDynamicConfigKeys, error: availableDynamicConfigKeysError } = useSWR(
    swrKeys.pulsar.brokers.availableDynamicConfigKeys._(),
    async () => await adminClient.brokers.getDynamicConfigurationName() as unknown as string[], // TODO - report a bug about missing swagger definitions.
  );

  if (availableDynamicConfigKeysError) {
    notifyError(`Unable to get dynamic configuration parameters list. ${availableDynamicConfigKeysError}`);
  }

  let allKeys = Array.from(new Set([...Object.keys(dynamicConfig), ...Object.keys(runtimeConfig)])).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (paramFilter !== '') {
    allKeys = allKeys.filter(key => key.toLowerCase().includes(paramFilter.toLowerCase()));
  }
  if (isShowDynamicOnly) {
    allKeys = allKeys.filter((key) => availableDynamicConfigKeys?.includes(key));
  }

  return (
    <div className={s.Configuration}>
      <div className={s.Toolbar}>
        <div style={{ width: '480rem' }}>
          <Input value={paramFilter} onChange={v => setParamFilter(v)} placeholder="managedLedger" focusOnMount={true} clearable={true} />
        </div>
        <div style={{ marginLeft: 'auto', marginTop: 'auto' }}>
          <SmallButton
            text={isShowDynamicOnly ? 'Show all' : 'Show dynamic only'}
            onClick={() => setIsShowDynamicOnly(!isShowDynamicOnly)}
            type="primary"
          />
        </div>
      </div>

      <div className={s.ConfigurationTable}>
        <table className={s.Table}>
          <thead>
            <tr className={s.Row}>
              <th className={s.Cell}>Param</th>
              <th className={s.Cell}>Runtime config</th>
              <th className={s.Cell}>Dynamic config</th>
            </tr>
          </thead>
          <tbody>
            {allKeys.map((key) => {
              return (
                <tr key={key} className={s.Row}>
                  <td className={`${s.Cell} ${s.ConfigParamKeyCell}`} data-tip={ReactDOMServer.renderToStaticMarkup(help[key] || <div>-</div>)}>
                    <Highlighter
                      highlightClassName="highlight-substring"
                      searchWords={[paramFilter]}
                      autoEscape={true}
                      textToHighlight={key}
                    />
                  </td>
                  <td className={`${s.Cell} ${s.RuntimeConfigCell}`}>{runtimeConfig[key]}</td>
                  <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    {availableDynamicConfigKeys?.includes(key) ? (
                      <DynamicConfigValue configKey={key} configValue={dynamicConfig[key]} />
                    ) : <span>-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type DynamicConfigValueProps = {
  configKey: string;
  configValue: string;
}

const DynamicConfigValue: React.FC<DynamicConfigValueProps> = (props) => {
  const [isShowEditor, setIsShowEditor] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(props.configValue || '');
  const ref = useRef<HTMLDivElement>(null);
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifySuccess, notifyError } = Notifications.useContext();

  const handleClickOutside = (event: MouseEvent) => {
    if (!ref.current) {
      return;
    }

    if (ref.current === event.target || ref.current.contains(event.target as Node)) {
      return;
    }

    setIsShowEditor(false);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const updateDynamicConfigValue = async () => {
    try {
      await adminClient.brokers.updateDynamicConfiguration(props.configKey, inputValue);
      notifySuccess(`Dynamic configuration parameter ${props.configKey} has been successfully update.`);
      setIsShowEditor(false);
    } catch (err) {
      notifyError(`Unable to update dynamic configuration parameter ${props.configKey}. ${err}`);
    }

    await mutate(swrKeys.pulsar.brokers.runtimeConfig._());
    await mutate(swrKeys.pulsar.brokers.dynamicConfig._());
  }

  const deleteDynamicConfigValue = async () => {
    try {
      await adminClient.brokers.deleteDynamicConfiguration(props.configKey);
      notifySuccess(`Dynamic configuration parameter ${props.configKey} has been successfully deleted.`);
      setIsShowEditor(false);
    } catch (err) {
      notifyError(`Unable to delete dynamic configuration parameter ${props.configKey}. ${err}`);
    }

    await mutate(swrKeys.pulsar.brokers.runtimeConfig._());
    await mutate(swrKeys.pulsar.brokers.dynamicConfig._());
  }

  return (
    <div className={s.DynamicConfigValue} ref={ref}>
      {isShowEditor && (
        <div
          tabIndex={0}
          className={s.DynamicConfigValueEditor}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              updateDynamicConfigValue()
            }
            if (e.key === 'Escape') {
              setIsShowEditor(false);
            }
          }}
        >
          <div className={s.DynamicConfigValueEditorHeader}>
            {props.configKey}
          </div>
          <div className={s.DynamicConfigValueEditorInput}>
            <Input onChange={(v) => setInputValue(v)} placeholder="Enter new value" value={inputValue} focusOnMount={true} />
          </div>

          <div className={s.DynamicConfigValueEditorButtons}>
            <div className={s.DynamicConfigValueEditorUpdateButton}>
              <Button text="Delete" type='danger' onClick={deleteDynamicConfigValue} />
            </div>

            <div className={s.DynamicConfigValueEditorUpdateButton}>
              <Button text="Update" type='primary' onClick={updateDynamicConfigValue} />
            </div>
          </div>
        </div>
      )}

      {props.configValue}

      <button type="button" className={s.DynamicConfigValueButton} onClick={() => setIsShowEditor(!isShowEditor)}>
        {isShowEditor ? <SvgIcon svg={closeIcon} /> : <SvgIcon svg={editIcon} />}
      </button>
    </div>
  );
}

export default Configuration;
