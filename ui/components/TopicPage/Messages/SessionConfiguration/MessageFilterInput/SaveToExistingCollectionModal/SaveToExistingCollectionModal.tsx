import React, {useCallback, useState} from "react";
import {
  GetFiltersCollectionsInfoRequest,
  RawMessageFilter,
  SaveToExistingFiltersCollectionRequest
} from "../../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import {Code} from "../../../../../../grpc-web/google/rpc/code_pb";
import * as Modals from "../../../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../../../app/contexts/Notifications";
import * as GrpcClient from "../../../../../app/contexts/GrpcClient/GrpcClient";
import s from "./SaveToExistingCollectionModal.module.css";
import NothingToShow from "../../../../../ui/NothingToShow/NothingToShow";
import useSWR from "swr";
import {swrKeys} from "../../../../../swrKeys";
import {ChainEntry, CollectionInfo} from "../types";
import SmallButton from "../../../../../ui/SmallButton/SmallButton";
import {collectionInfoFromPb, filterToPb} from "../conversions";
import {isEqual} from "lodash";
import { H3 } from "../../../../../ui/H/H";

type SaveToExistingCollectionModalProps = {
  filters: Record<string, ChainEntry>;
  onDone: () => void;
  isSingleFilterSave?: boolean;
}

const SaveToExistingCollectionModal: React.FC<SaveToExistingCollectionModalProps> = (props) => {
  Modals.useContext();
  const { notifyError, notifyInfo, notifySuccess } = Notifications.useContext();
  const {consumerServiceClient} = GrpcClient.useContext();
  const [activeCollectionInfo, setActiveCollectionInfo] = useState<CollectionInfo>();

  const {data: filtersCollectionsInfo, error: filtersCollectionsInfoError, isLoading: filtersCollectionsInfoIsLoading} =
    useSWR(
      swrKeys.pulsar.batch.getFiltersCollectionsInfo,
      async () => {
        const req = new GetFiltersCollectionsInfoRequest();

        const res = await consumerServiceClient.getFiltersCollectionsInfo(req, null)
          .catch(err => notifyError("Unable to get filters collections names. Error: ", err));

        if (!res) {
          return;
        }

        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Unable to get filters collections names. ${res.getStatus()?.getMessage()}`);
          return;
        }

        return res.getCollectionsInfoList();
      });

  const onFilterSaveToExistingCollection = useCallback(async () => {
    if(!activeCollectionInfo) {
      notifyInfo("Please choose the collection to save to.");
      return;
    }

    const req = new SaveToExistingFiltersCollectionRequest();
    req.setCollectionId(activeCollectionInfo.id);
    Object.entries(props.filters)
      .map(entry => {
        const key = entry[0];
        const filter = entry[1].filter;

        const rawFilter = filterToPb(filter);

        req.getFiltersMapMap().set(key, rawFilter);
      })

    const res = await consumerServiceClient.saveToExistingFiltersCollection(req, null)
      .catch(err => notifyError(`Unable to save filters to existing collection. Collection: ${activeCollectionInfo.name}. Error: ${err}`));

    if(!res) {
      notifyError(`Unable to save filters to existing collection due to server problem. Collection: ${activeCollectionInfo.name}.`)
      return;
    }

    if(res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to save filters to existing collection. Collection: ${activeCollectionInfo.name}.`)
      return;
    }

    notifySuccess(`Successfully added filters to collection "${activeCollectionInfo.name}".`);
    props.onDone();
    return;
  }, [activeCollectionInfo]);

  return (
    <>
      {filtersCollectionsInfoIsLoading && <NothingToShow reason={'loading-in-progress'}/>}
      {filtersCollectionsInfoError && <NothingToShow reason={'server-error'}/>}
      {!filtersCollectionsInfoIsLoading && !filtersCollectionsInfoError && filtersCollectionsInfo &&
        <div className={s.SaveToExistingCollection}>
          <H3>Choose collection:</H3>
          <div className={s.Collections}>
            <div>
              {filtersCollectionsInfo
                .map(collectionInfo => (
                  <span
                    key={collectionInfo.getCollectionId()}
                    onClick={() => setActiveCollectionInfo(collectionInfoFromPb(collectionInfo))}
                    className={`${s.Collection} ${s.Inactive} ${activeCollectionInfo && isEqual(activeCollectionInfo, collectionInfoFromPb(collectionInfo)) && s.Active}`}
                  >
                    {collectionInfo.getCollectionName()}
                  </span>
                ))
              }
            </div>
            <div className={s.SaveToExistingCollectionButtonWrapper}>
              <SmallButton
                onClick={() => onFilterSaveToExistingCollection()}
                type={'primary'}
                text="Add filters"
              />
            </div>
          </div>
        </div>
      }
    </>
  );
}

export default SaveToExistingCollectionModal;
