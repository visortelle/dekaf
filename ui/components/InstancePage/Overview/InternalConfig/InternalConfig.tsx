import React from 'react';
import s from './InternalConfig.module.css'
import sts from '../../../ui/SimpleTable/SimpleTable.module.css';
import * as BrokersConfig from '../../../app/contexts/BrokersConfig';
import _ from 'lodash';

export type InternalConfigProps = {};

const InternalConfig: React.FC<InternalConfigProps> = () => {
  const { internalConfig } = BrokersConfig.useContext();

  if (Object.keys(internalConfig).length === 0) {
    return <div className={s.NothingToShow}>Nothing to show.</div>
  }

  return (
    <div className={s.InternalConfig}>
      <table className={sts.Table}>
        <tbody>
          {_(internalConfig).toPairs().sortBy().value().map(([key, value]) => (
            <tr className={sts.Row} key={key}>
              <td className={sts.HighlightedCell}>{key}</td>
              <td className={sts.Cell}>{value || <div className={s.NoData}>-</div>}</td>
            </tr>
          ))}
          </tbody>
      </table>
    </div>
  );
}

export default InternalConfig;
