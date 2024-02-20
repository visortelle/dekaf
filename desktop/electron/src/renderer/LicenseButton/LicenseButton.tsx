import React from 'react';
import s from './LicenseButton.module.css'
import * as Modals from '../app/Modals/Modals';
import SmallButton from '../ui/SmallButton/SmallButton';
import LicenseDialog from './LicenseDialog/LicenseDialog';

export type LicenseButtonProps = {};

const LicenseButton: React.FC<LicenseButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.LicenseButton}>
      <SmallButton
        type='regular'
        text='Enter License Info'
        onClick={() => {
          modals.push({
            id: 'license-info',
            title: 'License Info',
            content: (
              <LicenseDialog
                onCancel={modals.pop}
                onConfirm={modals.pop}
              />
            ),
            styleMode: 'no-content-padding'
          });
        }}
      />
    </div>
  );
}

export default LicenseButton;
