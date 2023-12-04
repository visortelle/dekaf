import React from 'react';
import s from './PulsarDistributionPickerButton.module.css'
import SmallButton from '../../ui/SmallButton/SmallButton';
import * as Modals from '../../app/Modals/Modals';
import PulsarDistributionPicker from './PulsarDistributionPicker/PulsarDistributionPicker';

export type PulsarDistributionPickerButtonProps = {
  onSelectVersion: (v: string) => void
  buttonText?: string
};

const PulsarDistributionPickerButton: React.FC<PulsarDistributionPickerButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.PulsarDistributionPickerButton}>
      <SmallButton
        type='primary'
        text={props.buttonText || 'Select Pulsar Version'}
        onClick={() => {
          modals.push({
            id: 'select-pulsar-distribution',
            title: 'Select Pulsar Version',
            content: (
              <div className={s.PickerContainer}>
                <PulsarDistributionPicker
                  onSelectVersion={(v) => {
                    modals.pop();
                    props.onSelectVersion(v);
                  }}
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

export default PulsarDistributionPickerButton;
