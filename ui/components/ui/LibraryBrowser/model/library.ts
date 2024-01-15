import { ResourceMatcher } from './resource-matchers';
import { ManagedItem } from './user-managed-items';

export type LibraryItemMetadata = {
  updatedAt: string,
  availableForContexts: ResourceMatcher[],
};

export type LibraryItem = {
  metadata: LibraryItemMetadata,
  spec: ManagedItem,
};
