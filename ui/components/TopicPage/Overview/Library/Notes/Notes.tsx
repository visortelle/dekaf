import React, { useEffect, useState } from 'react';
import s from './Notes.module.css'
import MarkdownPreview from '../../../../ui/MarkdownEditor/MarkdownPreview/MarkdownPreview';
import { LibraryContext, resourceMatcherFromContext } from '../../../../ui/LibraryBrowser/model/library-context';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import * as mipb from '../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/managed_items_pb';
import { ManagedMarkdownDocument } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import { resourceMatcherToPb } from '../../../../ui/LibraryBrowser/model/resource-matchers-conversions-pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import { libraryItemFromPb, libraryItemToPb } from '../../../../ui/LibraryBrowser/model/library-conversions';
import { LibraryItem } from '../../../../ui/LibraryBrowser/model/library';
import { v4 as uuid } from 'uuid';
import Tabs, { Tab } from '../../../../ui/Tabs/Tabs';
import ConfirmationButton from '../../../../ui/ConfirmationButton/ConfirmationButton';
import deleteIcon from './delete.svg';
import { defaultNote } from './default-note';
import Input from '../../../../ui/Input/Input';
import RenameButton from '../../../../ui/RenameButton/RenameButton';
import { cloneDeep } from 'lodash';

export type NotesProps = {
  libraryContext: LibraryContext,
  onCount: (count: number) => void
};

const Notes: React.FC<NotesProps> = (props) => {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [notes, setNotes] = useState<ManagedMarkdownDocument[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(defaultNote.metadata.id);
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
      .map(it => (it.spec as ManagedMarkdownDocument));

    setNotes(newNotes);
    props.onCount(newNotes.length);
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

  const notesToShow = notes.concat([defaultNote]);
  const selectedNote = notesToShow?.find(note => note.metadata.id === selectedNoteId);

  return (
    <div className={s.Notes}>
      <div className={s.NoteTabs}>
        <Tabs
          tabs={Object.fromEntries(notesToShow.map(note => {
            const tab: Tab = {
              title: note.metadata.name,
              isRenderAlways: true,
              render: () => (
                <div className={s.MarkdownPreview}>
                  {selectedNote && <MarkdownPreview
                    markdown={selectedNote.spec.markdown}
                  />}
                </div>
              ),
              extraControls: (
                <div style={{ display: 'flex' }}>
                  <RenameButton
                    modal={{
                      id: 'rename-markdown-document',
                      title: 'Rename Markdown Document'
                    }}
                    initialValue={note.metadata.name}
                    onConfirm={async (v) => {
                      const getLibItemReq = new pb.GetLibraryItemRequest();
                      getLibItemReq.setId(note.metadata.id);
                      const getLibItemRes = await libraryServiceClient.getLibraryItem(getLibItemReq, null)
                        .catch(err => notifyError(`Unable to get library item ${note.metadata.id}. ${err}`));

                      if (getLibItemRes === undefined) {
                        return;
                      }

                      if (getLibItemRes.getStatus()?.getCode() !== Code.OK) {
                        notifyError(`Unable to get library item ${note.metadata.id}. ${getLibItemRes.getStatus()?.getMessage()}`)
                      }

                      const libraryItem = libraryItemFromPb(getLibItemRes.getItem()!);
                      libraryItem.spec.metadata.name = v;

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
                        newNotes[itemIndex].metadata.name = libraryItem.spec.metadata.name;

                        return newNotes;
                      });
                    }}
                  />

                  <ConfirmationButton
                    button={{
                      type: 'regular',
                      appearance: 'borderless-semitransparent',
                      title: 'Delete this note',
                      svgIcon: deleteIcon
                    }}
                    dialog={{
                      content: <>Are you sure that you want to delete this markdown document?</>,
                      onConfirm: async () => {
                        const req = new pb.DeleteLibraryItemRequest();
                        req.setId(note.metadata.id);

                        const res = await libraryServiceClient.deleteLibraryItem(req, null)
                          .catch(err => notifyError(`Unable to delete library item. ${err}`));

                        if (res === undefined) {
                          return;
                        }

                        if (res.getStatus()?.getCode() !== Code.OK) {
                          notifyError(`Unable to delete library item. ${res.getStatus()?.getMessage()}`);
                          return
                        }

                        setNotes(v => v.filter(nt => nt.metadata.id !== note.metadata.id));
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
        />
      </div>
    </div>
  );
}

export default Notes;
