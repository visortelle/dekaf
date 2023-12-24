import { CSSProperties } from "react";
import { ModalStackEntry } from "../../app/contexts/Modals/Modals";
import LibraryBrowser, { LibraryBrowserProps } from "./LibraryBrowser";
import { getReadableItemType } from "./get-readable-item-type";
import { capitalize } from "lodash";
import { v4 as uuid } from 'uuid';

const ModalContent: React.FC<{ children: React.ReactNode, style?: CSSProperties }> = (props) => {
  return (
    <div
      style={{
        width: 'calc(100vw - 32rem)',
        maxHeight: 'inherit',
        overflow: 'hidden',
        display: 'grid',
        ...props.style
      }}
    >
      {props.children}
    </div>
  );
}

export type MkLibraryBrowserModalProps = {
  libraryBrowserProps: LibraryBrowserProps,
};

export const mkLibraryBrowserModal: (props: MkLibraryBrowserModalProps) => ModalStackEntry = (props) => {
  let title = 'Library Browser';
  switch (props.libraryBrowserProps.mode.type) {
    case "save": {
      const titleAction = capitalize(props.libraryBrowserProps.mode.appearance || 'save');
      title = titleAction + ' ' + getReadableItemType(props.libraryBrowserProps.mode.item.metadata.type);
      break;
    }
    case "pick": title = 'Load ' + getReadableItemType(props.libraryBrowserProps.mode.itemType); break;
  }

  return {
    id: `library-browser-${uuid()}`,
    content: (
      <ModalContent
        style={(props.libraryBrowserProps.mode.type === "save" && props.libraryBrowserProps.mode.item.metadata.type !== "consumer-session-config" && (props.libraryBrowserProps.mode.appearance === "create" || props.libraryBrowserProps.mode.appearance === "edit")) ? { width: 'unset', maxWidth: 'calc(100vw - 32rem)' } : undefined}
      >
        <LibraryBrowser {...props.libraryBrowserProps} />
      </ModalContent>
    ),
    title,
    styleMode: 'no-content-padding'
  }
}
