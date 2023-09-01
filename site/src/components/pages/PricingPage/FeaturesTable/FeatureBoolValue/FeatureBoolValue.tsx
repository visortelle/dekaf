import React from 'react';
import IconClose from '@site/static/img/icon_close_24dp.svg';
import IconChecked from '@site/static/img/icon_check_24dp.svg';

import style from './FeatureBoolValue.module.css';

type FeatureBoolValueProps = {
  value: boolean;
};

const FeatureBoolValue: React.FC<FeatureBoolValueProps> = ({ value }) => {
  const svgClass = value ? 'iconChecked' : 'iconCross';

  return (
    <div className={`${style.featureBoolValue} ${style[svgClass]}`}>
      {value ? <IconChecked /> : <IconClose />}
    </div>
  );
};

export default FeatureBoolValue;
