import React, { useEffect, useState } from 'react';
import s from './LicenseButton.module.css'
import * as Modals from '../app/Modals/Modals';
import * as Notifications from '../app/Notifications/Notifications';
import SmallButton from '../ui/SmallButton/SmallButton';
import LicenseDialog from './LicenseDialog/LicenseDialog';
import useLocalStorage from "use-local-storage-state";
import axios, { AxiosError } from 'axios';
import { localStorageKeys } from '../app/local-storage';
import { capitalize } from 'lodash';
import licenseIcon from './licenseIcon.svg';

const keygenAccountId = "add36df4-cf52-4909-b352-51318cb23d99";
const keygenApiUrl = "https://api.keygen.sh";
const keygenApiBase = `${keygenApiUrl}/v1/accounts/${keygenAccountId}`;

export type LicenseButtonProps = {};

type ValidLicense = {
  data: {
    attributes: {
      status: 'ACTIVE' | 'INACTIVE' | 'EXPIRING' | 'EXPIRED' | 'SUSPENDED' | 'BANNED'
    }
  }
};

type LicenseValidationResult = {
  type: 'unknown'
} | {
  type: 'free-tier'
} | {
  type: 'invalid-license'
} | {
  type: 'valid-license',
  license: ValidLicense
};

const LicenseButton: React.FC<LicenseButtonProps> = (props) => {
  const [licenseId, setLicenseId] = useLocalStorage<string>(localStorageKeys.dekafLicenseId, { defaultValue: '' });
  const [licenseToken, setLicenseToken] = useLocalStorage<string>(localStorageKeys.dekafLicenseToken, { defaultValue: '' });
  const { notifyError } = Notifications.useContext();
  const [license, setLicense] = useState<LicenseValidationResult>({ type: 'unknown' });

  useEffect(() => {
    async function fetchLicenseInfo() {
      const headers = {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        'Authorization': `Bearer ${licenseToken}`
      }
      const body = {
        "meta": {
          "nonce": parseInt(String(Math.random() * 1_000_000_000_000))
        }
      };
      const licenseValidationRes = await axios.post<ValidLicense>(`${keygenApiBase}/licenses/${licenseId}/actions/validate`, body, { headers })
        .catch((err: AxiosError) => {
          const res = err.response;
          if (res?.status === 401) {
            setLicense({ type: 'invalid-license' });
            return;
          }

          setLicense({ type: 'unknown' });
          notifyError(`Unable to fetch license info: ${err.cause}`)
        });

      if (licenseValidationRes === undefined) {
        return;
      }

      setLicense({ type: 'valid-license', license: licenseValidationRes.data });
    }

    if (licenseId === '' && licenseToken === '') {
      setLicense({ type: 'free-tier' });
      return;
    }

    if (licenseId === '' || licenseToken === '') {
      setLicense({ type: 'invalid-license' });
      return;
    }

    fetchLicenseInfo();
  }, [licenseId, licenseToken]);

  const modals = Modals.useContext();

  let label = '';
  let labelColor = '#fff';

  switch (license?.type) {
    case 'free-tier': {
      label = 'Free';
      labelColor = 'var(--accent-color-yellow)'
      break;
    }
    case 'valid-license': {
      label = capitalize(license.license.data.attributes.status);

      const status = license.license.data.attributes.status;

      if (status === 'ACTIVE') {
        labelColor = 'var(--accent-color-green)';
      } else if (status === 'EXPIRING') {
        labelColor = 'var(--accent-color-yellow)';
      } else {
        labelColor = 'var(--accent-color-red)';
      }
      break;
    }
    case 'invalid-license': {
      label = 'Invalid';
      labelColor = 'var(--accent-color-red)';
    }
  }

  return (
    <div className={s.LicenseButton}>
      {license?.type !== 'unknown' && (<span style={{ color: labelColor }}><strong>License:</strong> {label}</span>)}
      <SmallButton
        type='regular'
        text='Edit'
        svgIcon={licenseIcon}
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
