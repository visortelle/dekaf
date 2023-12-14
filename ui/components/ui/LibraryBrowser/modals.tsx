import { ModalStackEntry } from "../../app/contexts/Modals/Modals";
import LibraryBrowser, { LibraryBrowserProps } from "./LibraryBrowser";
import { getReadableItemType } from "./get-readable-item-type";

const ModalContent: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <div
      style={{
        maxWidth: 'calc(100vw - 48rem)',
        maxHeight: 'inherit',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {props.children}
    </div>
  );
}

export type MkLibraryBrowserModalProps = {
  libraryBrowserProps: LibraryBrowserProps
};

export const mkLibraryBrowserModal: (props: MkLibraryBrowserModalProps) => ModalStackEntry = (props) => {
  let title = 'Library Browser';
  switch (props.libraryBrowserProps.mode.type) {
    case "save": title = 'Save ' + getReadableItemType(props.libraryBrowserProps.mode.item.metadata.type); break
    case "pick": title = 'Load ' + getReadableItemType(props.libraryBrowserProps.mode.itemType); break;
  }

  return {
    id: 'library-browser',
    content: (
      <ModalContent>
        <LibraryBrowser {...props.libraryBrowserProps} />
      </ModalContent>
    ),
    title,
    styleMode: 'no-content-padding'
  }
}
