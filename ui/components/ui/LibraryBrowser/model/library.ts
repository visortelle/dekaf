import { ResourceMatcher } from './resource-matchers';
import { UserManagedItem } from './user-managed-items';

export type LibraryItemMetadata = {
  updatedAt: string,
  tags: string[],
  availableForContexts: ResourceMatcher[],
};

export type LibraryItem = {
  metadata: LibraryItemMetadata,
  spec: UserManagedItem,
};
