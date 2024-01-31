import React from 'react';
import s from './AvailableInContextsDialog.module.css'
import { ResourceMatcher } from '../../../model/resource-matchers';

export type AvailableInContextsDialogProps = {
  value: ResourceMatcher[],
  onChange: (v: ResourceMatcher[]) => void
};

const AvailableInContextsDialog: React.FC<AvailableInContextsDialogProps> = (props) => {
  return (
    <div className={s.AvailableInContextsDialog}>
      avaialble in contexts
    </div>
  );
}

export default AvailableInContextsDialog;
