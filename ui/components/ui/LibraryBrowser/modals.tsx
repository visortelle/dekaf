import { ModalStackEntry } from "../../app/contexts/Modals/Modals";
import LibraryBrowser from "./LibraryBrowser";

const ModalContent: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <div style={{ maxWidth: 'calc(100vw - 48rem)' }}>
      {props.children}
    </div>
  );
}

export const mkLibraryBrowserModal: () => ModalStackEntry = () => {
  return {
    id: 'library-browser',
    content: (
      <ModalContent>
        <LibraryBrowser />
      </ModalContent>
    ),
    title: 'Library Browser',
    styleMode: 'no-content-padding'
  }
}
