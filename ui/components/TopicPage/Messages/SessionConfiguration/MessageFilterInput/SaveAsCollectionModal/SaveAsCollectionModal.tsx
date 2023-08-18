import React, {useCallback, useState} from "react";
import * as Modals from "../../../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../../../app/contexts/Notifications";
import * as GrpcClient from "../../../../../app/contexts/GrpcClient/GrpcClient";
import {
  RawFiltersCollection,
  RawMessageFilter,
  SaveRawFiltersCollectionRequest
} from "../../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import {Code} from "../../../../../../grpc-web/google/rpc/code_pb";
import {ChainEntry} from "../types";
import Input from "../../../../../ui/Input/Input";
import Button from "../../../../../ui/Button/Button";
import s from "./SaveAsCollectionModal.module.css"
import { v4 as uuid } from 'uuid';
import {filterToPb} from "../conversions";

type SaveAsCollectionModalProps = {
  filters: Record<string, ChainEntry>;
  onDone: () => void;
}

const SaveAsCollectionModal: React.FC<SaveAsCollectionModalProps> = (props) => {
  const modals = Modals.useContext();
  const { notifyError, notifyInfo, notifySuccess } = Notifications.useContext();
  const {consumerServiceClient} = GrpcClient.useContext();
  const [collectionInput, setCollectionInput] = useState("");

  const onFilterSave = useCallback(async () => {
    if(!collectionInput) {
      notifyInfo("Please enter the name for new collection.");
      return;
    }

    const req = new SaveRawFiltersCollectionRequest();
    const newRawCollection = new RawFiltersCollection();

    newRawCollection.setCollectionId(uuid())
    newRawCollection.setCollectionName(collectionInput);
    Object.entries(props.filters)
        .map(entry => {
          const key = entry[0];
          const filter = entry[1].filter;

          const rawFilter = filterToPb(filter);

          newRawCollection.getFiltersMapMap().set(key, rawFilter);
        })

    req.setRawCollection(newRawCollection);

    const res = await consumerServiceClient.saveRawFiltersCollection(req, null)
      .catch(err => notifyError(`Unable to save filters to collection. Collection name: ${collectionInput}. Error: ${err}`));

    if(!res) {
      notifyError(`Unable to save filters to collection due to server problem. Collection: ${collectionInput}.`)
      return;
    }

    if(res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to save filters to collection. Collection name: ${collectionInput}. Error: ${res.getStatus()?.getMessage()}`)
      return;
    }

    notifySuccess(`Successfully saved filters to new collection: "${collectionInput}".`);
    props.onDone();
    return;
  }, [collectionInput]);

  return (
    <div className={s.SaveAsCollection}>
        <div className={s.CollectionInputWrapper}>
            <span>Collection name</span>
            <Input
                value={collectionInput}
                onChange={setCollectionInput}
                placeholder="exampleCollection"
                focusOnMount
            />
        </div>
        <div className={s.CollectionInputButtonsWrapper}>
            <Button
                onClick={() => onFilterSave()}
                type={'primary'}
                text="Create"
            />
        </div>
    </div>
  );
}

export default SaveAsCollectionModal;
