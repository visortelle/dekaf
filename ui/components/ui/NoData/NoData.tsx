import React from 'react';
import s from './NoData.module.css'

export type NoDataProps = {};

const NoData: React.FC<NoDataProps> = (props) => {
  return (
    <div className={s.NoData}>-</div>
  );
}

export default NoData;
