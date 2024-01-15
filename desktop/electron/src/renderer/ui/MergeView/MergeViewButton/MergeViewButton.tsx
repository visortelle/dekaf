import React from 'react';
import s from './MergeViewButton.module.css'
import MergeView, { MergeViewProps } from '../MergeView';
import * as Modals from '../../../app/Modals/Modals';
import SmallButton, { SmallButtonProps } from '../../SmallButton/SmallButton';

type MergeViewButtonProps = {
  buttonText?: string
  buttonType?: SmallButtonProps['type']
} & MergeViewProps;

const MergeViewButton: React.FC<MergeViewButtonProps> = (props) => {
  const { buttonText, buttonType, onMerge, ...mergeViewProps } = props;

  const modals = Modals.useContext();

  return (
    <div className={s.MergeViewButton}>
      <SmallButton
        type={buttonType || 'regular'}
        text={props.buttonText}
        onClick={() => {
          modals.push({
            id: 'merge-view',
            content: (
              <div style={{ display: 'flex', flex: '1 1 auto', overflow: 'auto', width: 'calc(100vw - 64rem)' }}>
                <MergeView
                  onMerge={(v) => {
                    modals.pop();
                    onMerge(v);
                  }}
                  {...mergeViewProps}
                />
              </div>
            ),
            title: buttonText || 'Merge',
            styleMode: 'no-content-padding'
          });
        }}
      />
    </div>
  );
}

export default MergeViewButton;
