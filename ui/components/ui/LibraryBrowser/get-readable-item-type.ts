import { ManagedItemType } from "./model/user-managed-items";

export function getReadableItemType(managedItemType: ManagedItemType): string {
  switch (managedItemType) {
    case "coloring-rule": return "Coloring Rule";
    case "coloring-rule-chain": return "Coloring Rule Chain";
    case "consumer-session-config": return "Consumer Session";
    case "consumer-session-event": return "Consumer Session Event";
    case "consumer-session-pause-trigger-chain": return "Consumer Session Pause Trigger Chain";
    case "consumer-session-start-from": return "Start From";
    case "consumer-session-target": return "Consumer Target";
    case "date-time": return "Date Time";
    case "markdown-document": return "Note";
    case "message-filter": return "Message Filter";
    case "message-filter-chain": return "Message Filter Chain";
    case "message-id": return "Message ID";
    case "producer-session-config": return "Producer Session";
    case "relative-date-time": return "Relative Date Time";
    case "topic-selector": return "Topic Selector";
    case "value-projection": return "Projection";
    case "value-projection-list": return "Projection List";
  }
}
