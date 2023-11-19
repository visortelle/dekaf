import { ModalStackEntry } from "../../app/contexts/Modals/Modals";
import LibraryBrowser, {LibraryBrowserProps} from "./LibraryBrowser";

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
  return {
    id: 'library-browser',
    content: (
      <ModalContent>
        <LibraryBrowser {...props.libraryBrowserProps} />
      </ModalContent>
    ),
    title: 'Library Browser',
    styleMode: 'no-content-padding'
  }
}
