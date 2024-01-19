import React, { useEffect, useState } from 'react';
import s from './Notes.module.css'
import { LibraryContext, resourceMatcherFromContext } from '../../LibraryBrowser/model/library-context';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import * as Modals from '../../../app/contexts/Modals/Modals';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import * as mipb from '../../../../grpc-web/tools/teal/pulsar/ui/library/v1/managed_items_pb';
import { ManagedMarkdownDocument } from '../../../ui/LibraryBrowser/model/user-managed-items';
import { resourceMatcherToPb } from '../../../ui/LibraryBrowser/model/resource-matchers-conversions-pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { libraryItemFromPb, libraryItemToPb } from '../../../ui/LibraryBrowser/model/library-conversions';
import { LibraryItem } from '../../../ui/LibraryBrowser/model/library';
import { v4 as uuid } from 'uuid';
import Tabs, { Tab } from '../../../ui/Tabs/Tabs';
import ConfirmationButton from '../../../ui/ConfirmationButton/ConfirmationButton';
import deleteIcon from './delete.svg';
import backIcon from './back-icon.svg';
import { helpNote } from './help-note';
import { blogNote } from './blog-note';
import defaultMarkdown from './default.md';
import RenameButton from '../../../ui/RenameButton/RenameButton';
import { cloneDeep } from 'lodash';
import MarkdownInput from '../../../ui/MarkdownInput/MarkdownInput';
import SmallButton from '../../SmallButton/SmallButton';

export type NotesProps = {
  libraryContext: LibraryContext,
  onCount: (count: number) => void
};

const factoryNotes = [helpNote, blogNote];

const Notes: React.FC<NotesProps> = (props) => {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [notes, setNotes] = useState<ManagedMarkdownDocument[]>([]);
  const [fetchCount, setFetchCount] = useState(0);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(props.libraryContext.pulsarResource.type === 'instance' ? blogNote.metadata.id : helpNote.metadata.id);
  const [refreshIframeKey, setRefreshIframeKey] = useState(0);
  const modals = Modals.useContext();

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
      .map(it => (it.spec as ManagedMarkdownDocument))
      .sort((a, b) => {
        const nameA = a.metadata.name;
        const nameB = b.metadata.name;

        if (nameA === nameB) {
          return a.metadata.id.localeCompare(b.metadata.id, 'en', { numeric: true })
        }

        return nameA.localeCompare(nameB, 'en', { numeric: true });
      });

    if (notes.length === 0 && newNotes.length > 0) {
      setSelectedNoteId(newNotes[0].metadata.id);
    }

    setNotes(newNotes);
    setFetchCount(v => v + 1);
    props.onCount(newNotes.length);
  }

  const createNote = async (markdownDocument: ManagedMarkdownDocument) => {
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

    setSelectedNoteId(markdownDocument.metadata.id);
  }

  const updateNote = async (markdownDocument: ManagedMarkdownDocument) => {
    const getLibItemReq = new pb.GetLibraryItemRequest();
    getLibItemReq.setId(markdownDocument.metadata.id);
    const getLibItemRes = await libraryServiceClient.getLibraryItem(getLibItemReq, null)
      .catch(err => notifyError(`Unable to get library item ${markdownDocument.metadata.id}. ${err}`));

    if (getLibItemRes === undefined) {
      return;
    }

    if (getLibItemRes.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to get library item ${markdownDocument.metadata.id}. ${getLibItemRes.getStatus()?.getMessage()}`)
    }

    const libraryItem = libraryItemFromPb(getLibItemRes.getItem()!);
    libraryItem.spec = markdownDocument;

    const req = new pb.SaveLibraryItemRequest();
    const updatedLibraryItemPb = libraryItemToPb(libraryItem);
    req.setItem(updatedLibraryItemPb);

    const res = await libraryServiceClient.saveLibraryItem(req, null)
      .catch(err => notifyError(`Unable to save library item. ${err}`));

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to save library item. ${res.getStatus()?.getMessage()}`)
    }

    setNotes(v => {
      const newNotes = cloneDeep(v);
      const itemIndex = newNotes.findIndex(note => note.metadata.id === libraryItem.spec.metadata.id);
      newNotes[itemIndex] = markdownDocument;

      return newNotes;
    });
  }

  const deleteNote = async (id: string) => {
    const req = new pb.DeleteLibraryItemRequest();
    req.setId(id);

    const res = await libraryServiceClient.deleteLibraryItem(req, null)
      .catch(err => notifyError(`Unable to delete library item. ${err}`));

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to delete library item. ${res.getStatus()?.getMessage()}`);
      return
    }

    setNotes(v => {
      const newNotes = v.filter(nt => nt.metadata.id !== id);
      const defaultNoteId = props.libraryContext.pulsarResource.type === 'instance' ? blogNote.metadata.id : helpNote.metadata.id;
      setSelectedNoteId(newNotes.length > 0 ? newNotes[0].metadata.id : defaultNoteId);
      return newNotes;
    });
  }

  useEffect(() => {
    fetchNotes();
  }, [props.libraryContext]);

  let notesToShow: ManagedMarkdownDocument[] = notes;
  if (props.libraryContext.pulsarResource.type === 'instance') {
    notesToShow = notesToShow.concat([blogNote]);
  }
  notesToShow = notesToShow.concat([helpNote]);

  const selectedNote = notesToShow?.find(note => note.metadata.id === selectedNoteId);

  if (fetchCount === 0) {
    return <div style={{ padding: '12rem' }}>Loading...</div>;
  }

  return (
    <div className={s.Notes}>
      <div className={s.NoteTabs}>
        <Tabs
          tabs={Object.fromEntries(notesToShow.map(note => {
            const isFactoryNote = factoryNotes.some(n => n.metadata.id === note.metadata.id);
            const tab: Tab = {
              title: note.metadata.name,
              render: () => (
                <div className={s.MarkdownPreview}>
                  {selectedNoteId === blogNote.metadata.id && (
                    <div className={s.ExternalContent}>
                      <div className={s.ExternalContentControls}>
                        <SmallButton
                          appearance='borderless'
                          onClick={() => setRefreshIframeKey(v => v + 1)}
                          text='Show all updates'
                          svgIcon={backIcon}
                        />
                      </div>
                      <iframe key={refreshIframeKey} src="https://dekaf.io/blog?isCropPage=true" className={s.ExternalContentIframe} />
                    </div>
                  )}
                  {selectedNote && selectedNoteId !== blogNote.metadata.id && (
                    <MarkdownInput
                      value={selectedNote.spec.markdown}
                      onChange={async (v) => {
                        const newNote = cloneDeep(note);
                        newNote.spec.markdown = v;

                        await updateNote(newNote);
                      }}
                      isReadOnly={isFactoryNote}
                    />
                  )}
                </div>
              ),
              extraControls: isFactoryNote ? undefined : (
                <div style={{ display: 'flex' }}>
                  <RenameButton
                    modal={{
                      id: 'rename-markdown-document',
                      title: 'Rename Markdown Document'
                    }}
                    button={{
                      title: 'Rename this markdown document'
                    }}
                    initialValue={note.metadata.name}
                    onConfirm={async (v) => {
                      const newNote = cloneDeep(note);
                      newNote.metadata.name = v;

                      await updateNote(newNote);
                    }}
                  />

                  <ConfirmationButton
                    button={{
                      type: 'regular',
                      appearance: 'borderless-semitransparent',
                      title: 'Delete this markdown document',
                      svgIcon: deleteIcon
                    }}
                    dialog={{
                      content: <>Are you sure that you want to delete this markdown document?</>,
                      onConfirm: async () => {
                        await deleteNote(note.metadata.id);
                        modals.pop();
                      },
                      type: 'danger'
                    }}
                    modal={{
                      id: 'delete-note',
                      title: 'Delete Markdown Document'
                    }}
                  />
                </div>
              )
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
                  name: `Note ${notes.length + 1}`,
                  type: "markdown-document"
                },
                spec: {
                  markdown: defaultMarkdown
                }
              };

              await createNote(newMarkdownDocument);
              await fetchNotes();
            },
            title: "Create new note"
          }}
          scrollToTabId={selectedNoteId}
        />
      </div>
    </div>
  );
}

export default Notes;
