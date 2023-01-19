import React from 'react';
import { useSWRConfig } from 'swr';
import { v4 as uuid } from 'uuid';

import * as pb from '../../../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import Button from '../../../../../../ui/Button/Button';
import * as t from '../../types';
import { Code } from '../../../../../../../grpc-web/google/rpc/code_pb';
import * as Notifications from '../../../../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { swrKeys } from '../../../../../../swrKeys';
import { CollectionsFilters } from '../FiltersEditor';

import s from '../FiltersEditor.module.css';

type Props = {
  entry: string | undefined,
  activeCollection: string | undefined,
  activeFilter: string | undefined,
  listFilters: CollectionsFilters,
  usedFilters: Record<string, t.ChainEntry>,

  onChange: (chain: Record<string, t.ChainEntry>) => void,
  onCreateFilter: (fill: boolean) => void,
  setUsedFilters: (chain: Record<string, t.ChainEntry>) => void,
}

const MainButtons = (props: Props) => {


  const { libraryServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.library.filters._();

  const { entry, activeCollection, activeFilter, listFilters, usedFilters, onCreateFilter, onChange, setUsedFilters} = props;

  const useFilter = () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const newFilter: string = listFilters[activeCollection].filters[activeFilter].filter.value || '';
    const newChain: Record<string, t.ChainEntry> = { ...usedFilters,  [uuid()]: { filter: { value: newFilter } } };
    onChange(newChain);
    setUsedFilters(newChain);
  }

  const onUpdateFilter = async () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const req = new pb.UpdateLibraryItemRequest();
    const libraryItem = new pb.LibraryItem();

    libraryItem.setId(activeFilter);
    libraryItem.setName(listFilters[activeCollection].filters[activeFilter].filter.name);
    libraryItem.setDescription(listFilters[activeCollection].filters[activeFilter].filter.description);
    libraryItem.setVersion("v1-beta");
    libraryItem.setSchemaVersion("v1-beta");

    const accessConfig = new pb.AccessConfig();
    accessConfig.setTopicPatternsList(['']);
    accessConfig.setUserReadRolesList(['']);
    accessConfig.setUserWriteRolesList(['']);
    libraryItem.setAccessConfig(accessConfig);

    const requirement = new pb.Requirement();

    const requir = true;
    if (requir) {
      const npmPackage = new pb.NpmPackageRequirement();
      npmPackage.setScope("Scope");
      npmPackage.setPackageName("Package-1");
      npmPackage.setVersion("v1-beta");

      requirement.setNpmPackage(npmPackage);
    } else {
      // requirement.setAppVersion("v1-beta");
    } 

    libraryItem.setRequirementsList([requirement]);

    const messageFilter = new pb.LibraryItemMessageFilter();
    messageFilter.setCode(listFilters[activeCollection].filters[activeFilter].filter.value || "");
    libraryItem.setMessageFilter(messageFilter);    

    req.setLibraryItem(libraryItem);
    const res = await libraryServiceClient.updateLibraryItem(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to update filter: ${res.getStatus()?.getMessage()}`);
    }

    await mutate(swrKey);
  }

  return (
    <div className={s.MainButtons}>
      <Button
        type='primary'
        text='Save'
        onClick={() => entry != undefined ? onCreateFilter(true) : onUpdateFilter()}
      />
      {entry == undefined &&
        <Button
          type='primary'
          text='Use'
          onClick={() => useFilter()}
        />
      }
    </div>
  )
}

export default MainButtons;