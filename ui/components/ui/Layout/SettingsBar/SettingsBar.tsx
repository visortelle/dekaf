import React from 'react';
import s from './SettingsBar.module.css'
import ProductLogo from '../../Layout/TealTools/ProductLogo/Logo';

export type SettingsBarProps = {};

const SettingsBar: React.FC<SettingsBarProps> = (props) => {
  return (
    <div className={s.SettingsBar}>
      <a className={s.ProductLogo} href='https://dekaf.io' target='_blank'>
        <ProductLogo />
      </a>
    </div>
  );
}

export default SettingsBar;

