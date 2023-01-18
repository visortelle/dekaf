import React from 'react';

import ActionButton from '../../../../../../ui/ActionButton/ActionButton';
import Button from '../../../../../../ui/Button/Button';
import { H3 } from '../../../../../../ui/H/H';
import Input from '../../../../../../ui/Input/Input';

import deleteIcon from '../../icons/delete.svg';
import createIcon from '../../icons/create.svg';
import duplicateIcon from '../../icons/duplicate.svg';
import editIcon from '../../icons/edit.svg';

const Collections = () => {


  const onCreateCollection = async () => {
    const collection = new pb.Collection()
    collection.setName("new collection");
    collection.setDescription("");

    const req = new pb.CreateCollectionRequest();
    req.setCollection(collection);
    const res = await libraryServiceClient.createCollection(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create collection: ${res.getStatus()?.getMessage()}`);
    }

    await mutate(swrKey);
  }

  type UpdateCollectionProps = {
    name?: string,
    description?: string,
    item?: string,
  }

  const onUpdateCollection = async (collectionData: UpdateCollectionProps) => {
    if (!activeCollection) {
      return;
    }

    const updateCollection = new pb.Collection();
    updateCollection.setId(activeCollection);
    updateCollection.setName(collectionData.name || listFilters[activeCollection].name);
    updateCollection.setDescription(collectionData.description || listFilters[activeCollection].description);
    updateCollection.setCollectionItemIdsList(collectionData.item ? [ ...Object.keys(listFilters[activeCollection].filters), collectionData.item ] : Object.keys(listFilters[activeCollection].filters));

    const req = new pb.UpdateCollectionRequest();
    req.setCollection(updateCollection);
    const res = await libraryServiceClient.updateCollection(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to save collection: ${res.getStatus()?.getMessage()}`);
    }

    await mutate(swrKey);
  }

  const onDuplicateCollection = async () => {
    if (!activeCollection) {
      return;
    }

    const collection = new pb.Collection();
    collection.setName(`${listFilters[activeCollection].name}-dublicate`);
    collection.setDescription(listFilters[activeCollection].description);
    collection.setCollectionItemIdsList(Object.keys(listFilters[activeCollection].filters));

    const req = new pb.CreateCollectionRequest();
    req.setCollection(collection);
    const res = await libraryServiceClient.createCollection(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create collection: ${res.getStatus()?.getMessage()}`);
    }

    await mutate(swrKey);
  }

  const onDeleteCollection = async () => {
    if (!activeCollection) {
      return;
    }

    const req = new pb.DeleteCollectionRequest();
    req.setId(activeCollection);
    const res = await libraryServiceClient.deleteCollection(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to delete collection: ${res.getStatus()?.getMessage()}`);
    }

    setActiveCollection(undefined);
    setActiveFilter(undefined);
    await mutate(swrKey);
  }

  return (
    <div className={`${s.Column}`}>
      <div className={`${s.Collections}`}>
        <H3>
          Collections
        </H3>
        {Object.keys(listFilters).map(collection => (
          <span
            key={collection}
            onClick={() => switchCollection(collection)}
            className={`${s.Inactive} ${activeCollection === collection && s.Active}`}
          >
            {listFilters[collection].name}
          </span>
        ))}
      </div>
      <div className={`${s.Buttons}`}>

        <Button
          svgIcon={deleteIcon}
          onClick={() => onDeleteCollection()}
          type="danger"
          title="Delete collection"
          disabled={!activeCollection}
        />
        <Button
          svgIcon={duplicateIcon}
          onClick={() => onDuplicateCollection()}
          type="primary"
          title="Duplicate collection"
          disabled={!activeCollection}
        />
        <Button
          svgIcon={createIcon}
          onClick={() => onCreateCollection()}
          type='primary'
          title="Create collection"
        />

        <Button
          svgIcon={editIcon}
          onClick={() => activeCollection && setRenameCollection(listFilters[activeCollection].name)}
          type='regular'
          title="Rename collection"
          disabled={!activeCollection}
        />

        {renameCollection !== undefined && activeCollection &&
          <div className={s.RenameWindow}>
            <div className={s.HeadRenameWindow}>
              <span>
                Rename window
              </span>
              <ActionButton
                action={{ type: 'predefined', action: 'close' }}
                onClick={() => setRenameCollection(undefined)}
              />
            </div>
            <Input
              value={renameCollection}
              onChange={(value) => setRenameCollection(value)}
            />
            <div className={s.RenameWindowButtons}>
              <Button
                type="regular"
                onClick={() => setRenameCollection(listFilters[activeCollection].name)}
                disabled={renameCollection === listFilters[activeCollection].name}
                text="Reset"
              />
              <Button
                type="primary"
                onClick={() => onUpdateCollection({ name: renameCollection})}
                disabled={!renameCollection}
                text="Rename"
              />
            </div>
          </div>
        }

      </div>
    </div>
  )
}

export default Collections;