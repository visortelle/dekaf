import { ManagedMarkdownDocument } from "../../../../ui/LibraryBrowser/model/user-managed-items";
import defaultNoteMd from './default-note.md';

export const defaultNote: ManagedMarkdownDocument = {
  metadata: {
    descriptionMarkdown: '',
    id: '0447e2b1-0d2b-4fb8-876d-8aae83b5a6a9',
    name: 'About Library',
    type: 'markdown-document'
  },
  spec: {
    markdown: defaultNoteMd
  }
};
