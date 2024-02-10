import React from 'react';
import s from './AvailableInContextsButton.module.css'
import { ResourceMatcher } from '../../model/resource-matchers';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import SmallButton from '../../../SmallButton/SmallButton';
import AvailableInContextsDialog from './AvailableInContextsDialog/AvailableInContextsDialog';
import { LibraryContext } from '../../model/library-context';
import { MaxProducersPerTopicSpecified } from '../../../../../grpc-web/tools/teal/pulsar/ui/namespace_policies/v1/namespace_policies_pb';

export type AvailableInContextsButtonProps = {
  value: ResourceMatcher[],
  onChange: (v: ResourceMatcher[]) => void,
  libraryContext: LibraryContext,
  isReadOnly?: boolean
};

const AvailableInContextsButton: React.FC<AvailableInContextsButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.AvailableInContextsButton}>
      <SmallButton
        type='regular'
        text={`Available in ${props.value.length} context${props.value.length === 1 ? '' : 's'}`}
        onClick={() => {
          modals.push({
            id: `available-in-contexts`,
            title: `Available in Contexts`,
            content: (
              <div style={{ overflow: 'hidden', maxHeight: 'inherit', display: 'flex' }}>
                <AvailableInContextsDialog
                  value={props.value}
                  onChange={props.onChange}
                  onCanceled={modals.pop}
                  libraryContext={props.libraryContext}
                  isReadOnly={props.isReadOnly}
                />
              </div>
            ),
            styleMode: 'no-content-padding'
          });
        }}
      />
    </div>
  );
}

export default AvailableInContextsButton;
