import { ModalStackEntry } from "../../app/contexts/Modals/Modals";
import LibraryBrowser, { LibraryBrowserProps } from "./LibraryBrowser";
import { ManagedItemType } from "./model/user-managed-items";

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

function getReadableItemType(managedItemType: ManagedItemType): string {
  switch (managedItemType) {
    case "coloring-rule": return "Coloring Rule";
    case "coloring-rule-chain": return "Coloring Rule Chain";
    case "consumer-session-config": return "Consumer Session Config";
    case "consumer-session-event": return "Consumer Session Event";
    case "consumer-session-pause-trigger-chain": return "Consumer Session Pause Trigger Chain";
    case "consumer-session-start-from": return "Consumer Session Start From";
    case "consumer-session-topic": return "Consumer Session Topic";
    case "date-time": return "Date Time";
    case "markdown-document": return "Markdown Document";
    case "message-filter": return "Message Filter";
    case "message-filter-chain": return "Message Filter Chain";
    case "message-id": return "Message ID";
    case "producer-session-config": return "Producer Session Config";
    case "relative-date-time": return "Relative Date Time";
    case "topic-selector": return "Topic Selector";
  }
}
