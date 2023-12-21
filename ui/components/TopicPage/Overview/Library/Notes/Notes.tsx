import React, { useEffect, useState } from 'react';
import s from './Notes.module.css'
import MarkdownPreview from '../../../../ui/MarkdownEditor/MarkdownPreview/MarkdownPreview';
import markdown from './sample.md';
import { LibraryContext, resourceMatcherFromContext } from '../../../../ui/LibraryBrowser/model/library-context';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import * as mipb from '../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/managed_items_pb';
import { ManagedMarkdownDocument } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import { resourceMatcherToPb } from '../../../../ui/LibraryBrowser/model/resource-matchers-conversions-pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import { libraryItemFromPb, libraryItemToPb } from '../../../../ui/LibraryBrowser/model/library-conversions';
import { LibraryItem } from '../../../../ui/LibraryBrowser/model/library';
import { v4 as uuid } from 'uuid';
import Tabs, { Tab } from '../../../../ui/Tabs/Tabs';

export type NotesProps = {
  libraryContext: LibraryContext
};

const Notes: React.FC<NotesProps> = (props) => {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [notes, setNotes] = useState<ManagedMarkdownDocument[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(undefined);

  const fetchNotes = async () => {
    const req = new pb.ListLibraryItemsRequest();
    req.setTypesList([mipb.ManagedItemType.MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT]);

    const resourceMatcher = resourceMatcherFromContext(props.libraryContext);
    const resourceMatcherPb = resourceMatcherToPb(resourceMatcher);

    req.setContextsList([resourceMatcherPb]);

    const res = await libraryServiceClient.listLibraryItems(req, null)
      .catch(err => notifyError(`Unable to fetch notes. ${err}`));

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to fetch notes. ${res.getStatus()?.getMessage()}`);
      return;
    }

    const newNotes = res.getItemsList()
      .map(it => libraryItemFromPb(it))
      .map(it => (it.spec as ManagedMarkdownDocument));

    setNotes(newNotes);

    if (selectedNoteId === undefined && newNotes.length > 0) {
      setSelectedNoteId(newNotes[0].metadata.id);
    }
  }

  const saveLibraryItem = async (markdownDocument: ManagedMarkdownDocument) => {
    const req = new pb.SaveLibraryItemRequest();

    const newNote: LibraryItem = {
      metadata: {
        availableForContexts: [resourceMatcherFromContext(props.libraryContext)],
        updatedAt: new Date().toISOString()
      },
      spec: markdownDocument
    };

    req.setItem(libraryItemToPb(newNote));

    const res = await libraryServiceClient.saveLibraryItem(req, null)
      .catch(err => notifyError(`Unable save a note. ${err}`));

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to save a note. ${res.getStatus()?.getMessage()}`);
      return;
    }
  }

  useEffect(() => {
    fetchNotes();
  }, [props.libraryContext]);

  const selectedNote = notes?.find(note => note.metadata.id === selectedNoteId);

  return (
    <div className={s.Notes}>
      <div className={s.NoteTabs}>
        {selectedNoteId && <Tabs
          tabs={Object.fromEntries(notes.map(note => {
            const tab: Tab = {
              title: note.metadata.name,
              isRenderAlways: true,
              render: () => (
                <div className={s.MarkdownPreview}>
                  {selectedNote && <MarkdownPreview
                    // markdown={selectedNote.spec.markdown}
                    markdown={markdown}
                  />}
                </div>
              ),
              onClose: () => undefined
            };
            return [note.metadata.id, tab];
          }))}
          activeTab={selectedNoteId}
          onActiveTabChange={setSelectedNoteId}
          size='small'
          newTab={{
            onNewTab: async () => {
              const newMarkdownDocument: ManagedMarkdownDocument = {
                metadata: {
                  id: uuid(),
                  descriptionMarkdown: '',
                  name: 'New Note',
                  type: "markdown-document"
                },
                spec: {
                  markdown: 'Write something meaningful here.'
                }
              };

              await saveLibraryItem(newMarkdownDocument);
              await fetchNotes();
              setSelectedNoteId(newMarkdownDocument.metadata.id);
            },
            title: "Create new note"
          }}
          scrollToTabId={selectedNoteId}
        />}
      </div>
    </div>
  );
}

export default Notes;
