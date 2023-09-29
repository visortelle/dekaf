import { ConsumerSessionConfig } from "../../TopicPage/Messages/types";
import { MessageFilter, MessageFilterChain } from "../../TopicPage/Messages/types";

export type LibraryItemType =
  "consumer-session-config" | "message-filter" | "message-filter-chain";

export type LibraryItemDescriptor = {
  type: "consumer-session-config",
  value: ConsumerSessionConfig,
} | {
  type: "message-filter",
  value: MessageFilter,
} | {
  type: "message-filter-chain",
  value: MessageFilterChain,
};

export type LibraryItem = {
  id: string,
  revision: string,
  updatedAt: string,
  isEditable: boolean,
  name: string,
  descriptionMarkdown: string,
  tags: string[],
  descriptor: LibraryItemDescriptor,
}
