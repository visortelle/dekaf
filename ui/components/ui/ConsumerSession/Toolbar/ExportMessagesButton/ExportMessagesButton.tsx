import React from 'react';
import s from './ExportMessagesButton.module.css'
import * as Modals from '../../../../app/contexts/Modals/Modals';
import * as AppContext from '../../../../app/contexts/AppContext';
import SmallButton from '../../../SmallButton/SmallButton';
import MessagesExporter, { MessagesExporterProps } from './MessagesExporter/MessagesExporter';
import exportIcon from './export.svg';
import { ProductCode } from '../../../../app/licensing/ProductCode';
import A from '../../../A/A';

export type ExportMessagesButtonProps = MessagesExporterProps;

const ExportMessagesButton: React.FC<ExportMessagesButtonProps> = (props) => {
  const modals = Modals.useContext();
  const { config } = AppContext.useContext();

  return (
    <div className={s.ExportMessagesButton}>
      <SmallButton
        title="Export messages"
        svgIcon={exportIcon}
        type='regular'
        text='Export messages'
        disabled={props.messages.length === 0 && props.sessionState !== 'paused'}
        onClick={() => {
          modals.push({
            id: 'export-messages',
            title: `Export ${props.messages.length} messages`,
            content: <MessagesExporter {...props} />,
            styleMode: 'no-content-padding'
          });
        }}
        isPremiumFeature={config.productCode === ProductCode.DekafDesktopFree || config.productCode === ProductCode.DekafFree}
        premiumFeatureTitle={(
          <div>
            The message export feature is not available in your product plan. Please upgrade on <A href="https://dekaf.io" isExternalLink>https://dekaf.io</A>
          </div>
        )}
      />
    </div>
  );
}

export default ExportMessagesButton;
