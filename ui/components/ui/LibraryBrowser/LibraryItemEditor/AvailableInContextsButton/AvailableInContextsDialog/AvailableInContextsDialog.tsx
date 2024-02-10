import React, { useState } from 'react';
import s from './AvailableInContextsDialog.module.css'
import { ResourceMatcher } from '../../../model/resource-matchers';
import Button from '../../../../Button/Button';
import FormItem from '../../../../ConfigurationTable/FormItem/FormItem';
import ResourceMatchersInput from '../../../SearchEditor/ResourceMatchersInput/ResourceMatchersInput';
import { LibraryContext } from '../../../model/library-context';

export type AvailableInContextsDialogProps = {
  value: ResourceMatcher[],
  onChange: (v: ResourceMatcher[]) => void,
  onCanceled: () => void,
  libraryContext: LibraryContext,
  isReadOnly?: boolean
};

const AvailableInContextsDialog: React.FC<AvailableInContextsDialogProps> = (props) => {
  const [value, setValue] = useState(props.value);

  return (
    <div className={s.AvailableInContextsDialog}>
      <div className={s.Content}>
        <FormItem>
          <ResourceMatchersInput
            value={value}
            onChange={setValue}
            libraryContext={props.libraryContext}
            isReadOnly={props.isReadOnly}
          />
        </FormItem>
      </div>

      <div className={s.Footer}>
        <Button
          type='regular'
          text='Cancel'
          onClick={props.onCanceled}
        />
        {!props.isReadOnly && (
          <Button
            type='primary'
            text='Confirm'
            onClick={() => {
              props.onChange(value);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default AvailableInContextsDialog;
