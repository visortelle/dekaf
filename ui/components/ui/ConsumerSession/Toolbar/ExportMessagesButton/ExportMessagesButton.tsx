import React from 'react';
import s from './ExportMessagesButton.module.css'
import * as Modals from '../../../../app/contexts/Modals/Modals';
import SmallButton from '../../../SmallButton/SmallButton';
import MessagesExporter, { MessagesExporterProps } from './MessagesExporter/MessagesExporter';
import exportIcon from './export.svg';

export type ExportMessagesButtonProps = MessagesExporterProps;

const ExportMessagesButton: React.FC<ExportMessagesButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.ExportMessagesButton}>
      <SmallButton
        testId="cs-export-open"
        title="Export messages"
        svgIcon={exportIcon}
        type='regular'
        text='Export messages'
        disabled={props.messages.length === 0}
        onClick={() => {
          modals.push({
            id: 'export-messages',
            title: `Export ${props.messages.length} messages`,
            content: <MessagesExporter {...props} />,
            styleMode: 'no-content-padding'
          });
        }}
      />
    </div>
  );
}

export default ExportMessagesButton;
