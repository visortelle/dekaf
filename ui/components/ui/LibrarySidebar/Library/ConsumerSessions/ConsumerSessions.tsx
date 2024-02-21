import React from 'react';
import s from './ConsumerSessions.module.css'
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import BrowseDialog from '../../../LibraryBrowser/dialogs/BrowseDialog/BrowseDialog';
import { navigateToConsumerSession } from '../navigateToConsumerSession';
import { useNavigate } from 'react-router';

export type ConsumerSessionsProps = {
  libraryContext: LibraryContext
};

const ConsumerSessions: React.FC<ConsumerSessionsProps> = (props) => {
  const navigate = useNavigate();

  return (
    <div className={s.ConsumerSessions}>
      <div className={s.BrowseDialog}>
        <BrowseDialog
          itemType='consumer-session-config'
          libraryContext={props.libraryContext}
          onCanceled={() => undefined}
          onSelected={(libraryItem) => {
            navigateToConsumerSession({
              item: libraryItem.spec,
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
