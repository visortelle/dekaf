import React from 'react';
import s from './PulsarDistributionPickerButton.module.css'
import SmallButton from '../ui/SmallButton/SmallButton';
import * as Modals from '../app/Modals/Modals';
import PulsarDistributionPicker from './PulsarDistributionPicker/PulsarDistributionPicker';

export type PulsarDistributionPickerButtonProps = {};

const PulsarDistributionPickerButton: React.FC<PulsarDistributionPickerButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.PulsarDistributionPickerButton}>
      <SmallButton
        type='primary'
        text='Select distribution'
        onClick={() => {
          modals.push({
            id: 'select-pulsar-distribution',
            title: 'Select Pulsar version',
            content: (
              <div className={s.PickerContainer}>
                <PulsarDistributionPicker />
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
