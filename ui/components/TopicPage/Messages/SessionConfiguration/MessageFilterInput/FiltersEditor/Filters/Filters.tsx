import React from 'react';
import { useSWRConfig } from 'swr';

import Button from '../../../../../../ui/Button/Button';
import { H3 } from '../../../../../../ui/H/H';
import * as pb from '../../../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { Code } from '../../../../../../../grpc-web/google/rpc/code_pb';
import * as Notifications from '../../../../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { swrKeys } from '../../../../../../swrKeys';
import { CollectionsFilters } from '../FiltersEditor';

import deleteIcon from '../../icons/delete.svg';
import createIcon from '../../icons/create.svg';
import duplicateIcon from '../../icons/duplicate.svg';

import s from '../FiltersEditor.module.css';

type Props = {
  activeCollection: string | undefined,
  activeFilter: string | undefined,
  listFilters: CollectionsFilters,
  entry?: string,

  setActiveFilter: (filter: undefined | string) => void,
  onCreateFilter: (filled?: boolean) => void,
}

const Filters = (props: Props) => {

  const { libraryServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.filters._();

  const { activeCollection, listFilters, activeFilter, entry, setActiveFilter, onCreateFilter } = props;

  const onDuplicateFilter = async () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const req = new pb.CreateLibraryItemRequest();
    const libraryItem = new pb.LibraryItem();

    libraryItem.setName(listFilters[activeCollection].filters[activeFilter].filter.name);
    libraryItem.setDescription(listFilters[activeCollection].filters[activeFilter].filter.description);
    libraryItem.setVersion(listFilters[activeCollection].filters[activeFilter].version);
    libraryItem.setSchemaVersion(listFilters[activeCollection].filters[activeFilter].schemaVersion);

    const accessConfig = new pb.AccessConfig();
    accessConfig.setTopicPatternsList(listFilters[activeCollection].filters[activeFilter].accessConfig.topicPatterns);
    accessConfig.setUserReadRolesList(listFilters[activeCollection].filters[activeFilter].accessConfig.userReadRoles);
    accessConfig.setUserWriteRolesList(listFilters[activeCollection].filters[activeFilter].accessConfig.userWriteRoles);
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
    req.setCollectionId(activeCollection);
    const res = await libraryServiceClient.createLibraryItem(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to duplicate filter: ${res.getStatus()?.getMessage()}`);
    }

    await mutate(swrKey);
  }

  const onDeleteFilter = async () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const req = new pb.DeleteLibraryItemRequest();
    req.setId(activeFilter);
    req.setCollectionId(activeCollection);

    const res = await libraryServiceClient.deleteLibraryItem(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to delete filter: ${res.getStatus()?.getMessage()}`);
    }

    setActiveFilter(undefined);
    await mutate(swrKey);
  }

  return (
    <div className={`${s.Column}`}>
      <div className={`${s.Filters}`}>
        <H3>
          Filters
        </H3>
        {activeCollection && listFilters[activeCollection].filters &&
          Object.keys(listFilters[activeCollection].filters).map(filter => (
            <span
              key={filter}
              onClick={() => { entry == undefined && setActiveFilter(filter) }}
              className={`${s.Inactive} ${activeFilter === filter && s.Active} ${filter.length === 0 && s.Empty}`}
            >
              {listFilters[activeCollection].filters[filter].filter.name}
              {listFilters[activeCollection].filters[filter].filter.name.length === 0 && 'write filter name'}
            </span>
          ))
        }
      </div>
      <div className={`${s.Buttons}`}>
        <Button
          svgIcon={deleteIcon}
          onClick={() => onDeleteFilter()}
          type="danger"
          title="Delete filter"
          disabled={!activeFilter || entry != undefined}
        />
        <Button
          svgIcon={duplicateIcon}
          onClick={() => onDuplicateFilter()}
          type="primary"
          title="Duplicate filter"
          disabled={!activeFilter || entry != undefined}
        />
        <Button
          svgIcon={createIcon}
          onClick={() => onCreateFilter()}
          type='primary'
          title="Create filter"
          disabled={!activeCollection || entry != undefined}
        />
      </div>
    </div>
  )
}

export default Filters;