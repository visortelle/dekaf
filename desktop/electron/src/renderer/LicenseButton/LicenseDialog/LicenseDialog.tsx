import React, { useState } from 'react';
import s from './LicenseDialog.module.css'
import FormItem from '../../ui/FormItem/FormItem';
import FormLabel from '../../ui/FormLabel/FormLabel';
import Input from '../../ui/Input/Input';
import useLocalStorage from "use-local-storage-state";
import { localStorageKeys } from '../../app/local-storage';
import Button from '../../ui/Button/Button';
import A from '../../ui/A/A';

export type LicenseDialogProps = {
  onConfirm: () => void,
  onCancel: () => void
};

const LicenseDialog: React.FC<LicenseDialogProps> = (props) => {
  const [persistedLicenseId, setPersistedLicenseId] = useLocalStorage<string>(localStorageKeys.dekafLicenseId, { defaultValue: '' });
  const [licenseId, setLicenseId] = useState<string>(persistedLicenseId);

  const [persistedLicenseToken, setPersistedLicenseToken] = useLocalStorage<string>(localStorageKeys.dekafLicenseToken, { defaultValue: '' });
  const [licenseToken, setLicenseToken] = useState<string>(persistedLicenseToken);

  return (
    <div className={s.LicenseDialog}>
      <div className={s.DialogContent}>
        <div className={s.LicenseInput}>
          <FormItem>
            <FormLabel content="License ID" />
            <Input
              value={licenseId}
              onChange={setLicenseId}
              placeholder='asj438af-j454-8nfl-ladf-afh458fal325'
            />
          </FormItem>

          <FormItem>
            <FormLabel content="License Token" />
            <Input
              value={licenseToken}
              onChange={setLicenseToken}
              inputProps={{ type: 'password' }}
              placeholder='activ-53hj42jlfasdh54lj908hgajdh5l8salkj'
            />
          </FormItem>
        </div>

        <div style={{ marginTop: '12rem', display: 'flex', gap: '12rem', justifyContent: 'flex-end'}}>
          <A target='_blank' href="https://dekaf.io/pricing">🔑 Get License</A>
          <A target='_blank' href="https://dekaf.io/support">🛟 Get Help</A>
        </div>
      </div>

      <div className={s.DialogFooter}>
        <Button
          type='regular'
          text='Cancel'
          onClick={props.onCancel}
        />

        <Button
          type='primary'
          text='Confirm'
          onClick={() => {
            setPersistedLicenseId(licenseId);
            setPersistedLicenseToken(licenseToken);

            props.onConfirm();
          }}
        />
      </div>
    </div>
  );
}

export default LicenseDialog;
