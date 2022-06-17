import React from 'react';
import s from './InternalConfig.module.css'
import * as BrokersConfig from '../../../app/contexts/BrokersConfig';
import _ from 'lodash';

export type InternalConfigProps = {};

const InternalConfig: React.FC<InternalConfigProps> = () => {
  const { internalConfig } = BrokersConfig.useContext();

  return (
    <div className={s.InternalConfig}>
      <div className={s.Title}>Config</div>
      <table className={s.Table}>
        <tbody>
          {_(internalConfig).toPairs().sortBy().value().map(([key, value]) => (
            <tr className={s.Row} key={key}>
              <td className={s.Cell}>{key}</td>
              <td className={s.Cell}>{value}</td>
            </tr>
          ))}
          </tbody>
      </table>
    </div>
  );
}

export default InternalConfig;
