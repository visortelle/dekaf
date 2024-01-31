import React from 'react';
import s from './AvailableInContextsButton.module.css'
import { ResourceMatcher } from '../../model/resource-matchers';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import SmallButton from '../../../SmallButton/SmallButton';
import AvailableInContextsDialog from './AvailableInContextsDialog/AvailableInContextsDialog';

export type AvailableInContextsButtonProps = {
  value: ResourceMatcher[],
  onChange: (v: ResourceMatcher[]) => void
};

const AvailableInContextsButton: React.FC<AvailableInContextsButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.AvailableInContextsButton}>
      <SmallButton
        type='regular'
        text={`Available in ${2} contexts`}
        onClick={() => {
          modals.push({
            id: `available-in-contexts`,
            title: `Available in Contexts`,
            content: (
              <AvailableInContextsDialog
                value={props.value}
                onChange={props.onChange}
              />
            )
          });
        }}
      />
    </div>
  );
}

export default AvailableInContextsButton;
