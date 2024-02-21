import React from 'react';
import s from './ConsumerSessions.module.css'
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import BrowseDialog from '../../../LibraryBrowser/dialogs/BrowseDialog/BrowseDialog';
import { navigateToConsumerSession } from '../navigateToConsumerSession';
import { useNavigate } from 'react-router';
import addIcon from './add.svg';
import SmallButton from '../../../SmallButton/SmallButton';

export type ConsumerSessionsProps = {
  libraryContext: LibraryContext
};

const ConsumerSessions: React.FC<ConsumerSessionsProps> = (props) => {
  const navigate = useNavigate();

  return (
    <div className={s.ConsumerSessions}>
      <div className={s.NewSessionButton}>
        <SmallButton
          type='primary'
          text='New Consumer Session'
          svgIcon={addIcon}
          onClick={() => {
            navigateToConsumerSession({
              libraryContext: props.libraryContext,
              navigate
            });
          }}
        />
      </div>

      <div className={s.BrowseDialog}>
        <BrowseDialog
          itemType='consumer-session-config'
          libraryContext={props.libraryContext}
          onCanceled={() => undefined}
          onSelected={(libraryItem) => {
            navigateToConsumerSession({
              session: libraryItem.spec,
              libraryContext: props.libraryContext,
              navigate
            });
          }}
          isSearchResultsOnly
          isHideCancelButton
        />
      </div>
    </div>
  );
}

export default ConsumerSessions;
