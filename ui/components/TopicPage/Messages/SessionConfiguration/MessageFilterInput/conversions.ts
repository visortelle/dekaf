import * as pb from "../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import {Collection, CollectionInfo, Filter} from "./types";
import {TopicType} from "../../Message/ReprocessMessage/types";

export const collectionInfoFromPb = (collectionInfoPb: pb.CollectionInfo): CollectionInfo => {
  return {
    id: collectionInfoPb.getCollectionId(),
    name: collectionInfoPb.getCollectionName()
  };
}

export const collectionFromPb = (rawCollectionPb: pb.RawFiltersCollection): Collection => {
  return {
    id: rawCollectionPb.getCollectionId(),
    name: rawCollectionPb.getCollectionName(),
    filters: Object.fromEntries(
      Array.from(rawCollectionPb.getFiltersMapMap().entries())
        .map(([key, value]) =>
          [key, filterFromPb(value)]
        )
    )
  };
}

export const collectionToPb = (collection: Collection): pb.RawFiltersCollection => {
  const rawCollection = new pb.RawFiltersCollection();

  rawCollection.setCollectionId(collection.id);
  rawCollection.setCollectionName(collection.name);

  Object.entries(collection.filters).forEach(([id, filter]) => {
        rawCollection.getFiltersMapMap().set(id, filterToPb(filter));
      }
  );

  return rawCollection;
}

export const filterFromPb = (rawMessageFilter: pb.RawMessageFilter): Filter => {
  const scope = rawMessageFilter.getScope();

  return {
    value: rawMessageFilter.getValue(),
    description: rawMessageFilter.getDescription(),
    name: rawMessageFilter.getName(),
    scope: {
      tenant: scope?.getTenant(),
      namespace: scope?.getNamespace(),
      topicName: scope?.getTopicName(),
      topicType: scope?.getTopicType() as TopicType
    }
  }
}

export const filterToPb = (filter: Filter): pb.RawMessageFilter => {
  const rawMessageFilter = new pb.RawMessageFilter();
  const rawScope = new pb.Scope();

  rawScope.setTenant(filter.scope?.tenant ?? "")
  rawScope.setNamespace(filter.scope?.namespace ?? "");
  rawScope.setTopicName(filter.scope?.topicName ?? "");
  rawScope.setTopicType(filter.scope?.topicType ?? "");

  rawMessageFilter.setValue(filter.value ?? "");
  rawMessageFilter.setDescription(filter.description);
  rawMessageFilter.setName(filter.name);
  rawMessageFilter.setScope(rawScope);

  return rawMessageFilter;
}


