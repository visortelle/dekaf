import React from 'react';
import s from './InternalConfig.module.css'
import * as BrokersConfig from '../../../app/contexts/BrokersConfig';

export type InternalConfigProps = {};

const InternalConfig: React.FC<InternalConfigProps> = (props) => {
  const { internalConfig } = BrokersConfig.useContext();

  return (
    <div className={s.InternalConfig}>
      <div className={s.Title}>Internal configuration</div>
      <table className={s.Table}>
        <tbody>
          {Object.entries(internalConfig).map(([key, value]) => (
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
