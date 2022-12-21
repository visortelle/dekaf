import React, { ReactNode } from 'react';

import Button from '../ui/Button/Button';
import { H3 } from '../ui/H/H';
import Input from '../ui/Input/Input';
import { DefaultProvider } from '../app/contexts/Modals/Modals';

import s from './ConfirmationDialog.module.css';
import ActionButton from '../ui/ActionButton/ActionButton';

type Props = {
  description: ReactNode,
  /* In order to prevent accidental unwanted actions, 
     we can ask user to enter a specific string to confirm the action. */
  onConfirm: () => void,
  onCancel: () => void,
  guard?: string,
}

const ConfirmationDialog = (props: Props) => {



  return (
    <DefaultProvider>
      {/* <div className={`${s.ConfirmationDialog}`}>
        <div>
          <H3>
            123
          </H3>
          <ActionButton 
            action={{ type: 'predefined', action: 'close' }}
            onClick={() => {}}
          />
        </div>

        <div>
          <span>

          </span>
          <span>

          </span>
        </div>

        <div>
          <span>

          </span>
          <Input
            value=""
            onChange={() => {}}
          />
        </div>

        <div>
          <Button
            onClick={() => {}}
            type="primary"
          />
          <Button
            onClick={() => {}}
            type="primary"
          />
        </div>

      </div> */}
      <div></div>
    </DefaultProvider>
  )
}

{/* <Button
  onClick={() => modals.push({
    id: 'delete-namespace',
    title: `Delete namespace`,
    content: (
      <ConfirmationDialog
        description={(
          <div>This action <strong>cannot</strong> be undone.
          <br />
          <div>It will permanently delete the ${namespace} namespace and all its topics.</div>
        )}
        onConfirm={deleteNamespace} 
        onCancel={modals.pop}
        guard={`public/default`}
      />
    ),
    styleMode: 'no-content-padding'
  })}
  text="View"
  type='danger'
/> */}

export default ConfirmationDialog;