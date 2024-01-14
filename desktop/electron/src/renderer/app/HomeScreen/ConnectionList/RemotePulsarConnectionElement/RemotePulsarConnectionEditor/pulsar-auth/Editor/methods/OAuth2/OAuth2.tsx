import React from 'react';
import s from './OAuth2.module.css'
import { OAuth2Credentials } from '../../../domain';
import Input from '../../../../../../../../../ui/Input/Input';
import FormItem from '../../../../../../../../../ui/FormItem/FormItem'
import FormLabel from '../../../../../../../../../ui/FormLabel/FormLabel';
import UploadZone from '../../../../../../../../../ui/UploadZone/UploadZone';
import { FileEntry } from '../../../../../../../../../ui/UploadZone/UploadZone';
import * as Notifications from '../../../../../../../../Notifications/Notifications';
import SvgIcon from "../../../../../../../../../ui/SvgIcon/SvgIcon";
import uploadCompleteIcon from './complete.svg';

export type OAuth2Props = {
  value: OAuth2Credentials
  onChange: (config: OAuth2Credentials) => void,
};

const OAuth2: React.FC<OAuth2Props> = (props) => {
  const { notifyInfo } = Notifications.useContext();
  const [isFileLoaded, setIsFileLoaded] = React.useState<boolean>(false);

  const submitKeyFile = async (files: FileEntry[]) => {
    const file = files[0];

    try {
      JSON.parse(file.content);
    } catch (e) {
      notifyInfo("Unable to parse the private key file.\nPlease make sure it's a valid JSON file.")
      return;
    }

    const maxSizeKb = 5;
    const sizeInKB = file.content.length / 1024;
    if (sizeInKB > maxSizeKb) {
      notifyInfo(`The file size is larger than ${maxSizeKb}KB.`);
      return;
    }

    setIsFileLoaded(true);

    const privateKey = `data:application/json;base64,${btoa(file.content)}`;
    props.onChange({ ...props.value, privateKey });
  }

  return (
    <div className={s.OAuth2}>
      <FormItem>
        <FormLabel content='Issuer URL' isRequired />
        <Input
          onChange={v => props.onChange({ ...props.value, issuerUrl: v })}
          value={props.value.issuerUrl}
        />
      </FormItem>

      <FormItem>
        <FormLabel content='Private Key' isRequired />
        <UploadZone isDirectory={false} onFiles={(files) => submitKeyFile(files)} isUploadPictureVisible={!isFileLoaded}>
          {!isFileLoaded &&
            <div className={s.UploadZone}>
              <span>Click here or drag'n'drop a .json file</span>
            </div>
          }
          {isFileLoaded &&
            <div className={s.FileUploaded}>
              <div className={s.UploadZoneIcon}>
                <SvgIcon svg={uploadCompleteIcon} />
              </div>
              <div>File loaded!</div>
            </div>
          }
        </UploadZone>
      </FormItem>

      <FormItem>
        <FormLabel content='Audience' />
        <Input
          onChange={v => props.onChange({ ...props.value, audience: v })}
          value={props.value.audience}
        />
      </FormItem>

      <FormItem>
        <FormLabel content='Scope' />
        <Input
          onChange={v => props.onChange({ ...props.value, scope: v })}
          value={props.value.scope}
        />
      </FormItem>
    </div>
  );
}

export default OAuth2;
