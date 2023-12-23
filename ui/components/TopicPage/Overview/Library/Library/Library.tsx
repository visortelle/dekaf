import React from 'react';
import s from './Library.module.css'
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';
import CreateLibraryItemButton from './CreateLibraryItemButton/CreateLibraryItemButton';

export type LibraryProps = {
  libraryContext: LibraryContext
};

const Library: React.FC<LibraryProps> = (props) => {
  return (
    <div className={s.Library}>
      <div>
        <CreateLibraryItemButton
          itemType="message-filter"
          libraryContext={props.libraryContext}
        />
      </div>
    </div>
  );
}

export default Library;
