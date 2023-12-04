import React from 'react';
import s from './LicenseInput.module.css'
import FormItem from '../ui/FormItem/FormItem';
import FormLabel from '../ui/FormLabel/FormLabel';
import Input from '../ui/Input/Input';
import useLocalStorage from "use-local-storage-state";
import { localStorageKeys } from '../app/local-storage';

export type LicenseInputProps = {};

const LicenseInput: React.FC<LicenseInputProps> = (props) => {
  const [licenseId, setLicenseId] = useLocalStorage<string>(localStorageKeys.dekafLicenseId, { defaultValue: '' });
  const [licenseToken, setLicenseToken] = useLocalStorage<string>(localStorageKeys.dekafLicenseToken, { defaultValue: '' });

  return (
    <div className={s.LicenseInput}>
      <FormItem>
        <FormLabel content="License ID" />
        <Input
          value={licenseId}
          onChange={setLicenseId}
        />
      </FormItem>

      <FormItem>
        <FormLabel content="License Token" />
        <Input
          value={licenseToken}
          onChange={setLicenseToken}
          inputProps={{ type: 'password' }}
        />
      </FormItem>


    </div>
  );
}

export default LicenseInput;
