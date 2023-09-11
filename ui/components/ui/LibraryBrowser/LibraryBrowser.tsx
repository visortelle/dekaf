import React from 'react';
import s from './LibraryBrowser.module.css'
import LibraryItemTypePicker from './LibraryItemTypePicker/LibraryItemTypePicker';
import { LibraryItemType } from './types';

export type LibraryBrowserProps = {
  libraryItemType?: LibraryItemType;
};

const LibraryBrowser: React.FC<LibraryBrowserProps> = (props) => {
  const [libraryItemType, setLibraryItemType] = React.useState<LibraryItemType>(props.libraryItemType || 'message-filter');

  return (
    <div className={s.LibraryBrowser}>
      <div>
        <LibraryItemTypePicker
          value={libraryItemType}
          onChange={setLibraryItemType}
          disabled={props.libraryItemType !== undefined}
        />
      </div>

    </div>
  );
}

export default LibraryBrowser;
