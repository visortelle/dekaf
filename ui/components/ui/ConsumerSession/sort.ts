import { partition } from "lodash";
import { MessageDescriptor } from "./types";

export type SortKey =
  | "index"
  | "publishTime"
  | "key"
  | "sessionTargetIndex"
  | "topic"
  | "producerName"
  | "value"
  | "schemaVersion"
  | "size"
  | "properties"
  | "eventTime"
  | "brokerPublishTime"
  | "messageId"
  | "sequenceId"
  | "orderingKey"
  | "redeliveryCount"
  | "sessionContextStateJson"
  | ({
    type: "sessionValueProjection",
    projectionIndex: number
  })
  | ({
    type: "sessionTargetValueProjection",
    targetIndex: number,
    projectionIndex: number
  });

export type Sort = { key: SortKey; direction: "asc" | "desc" };

export const sortMessages = (
  messages: MessageDescriptor[],
  sort: Sort
): MessageDescriptor[] => {
  type SortFn = (a: MessageDescriptor, b: MessageDescriptor) => number;

  function s(
    defs: MessageDescriptor[],
    undefs: MessageDescriptor[],
    sortFn: SortFn
  ): MessageDescriptor[] {
    let result = defs.sort(sortFn);
    result = sort.direction === "asc" ? result : result.reverse();
    return result.concat(undefs);
  }

  if (sort.key === "index") {
    const sortFn: SortFn = (a, b) => a.displayIndex - b.displayIndex;
    return s(messages, [], sortFn);
  }

  if (sort.key === "publishTime") {
    const [defs, undefs] = partition(
      messages,
      (m) => m.publishTime !== undefined
    );
    const sortFn: SortFn = (a, b) =>
      (a.publishTime || 0) - (b.publishTime || 0);
    return s(defs, undefs, sortFn);
  }

  if (sort.key === "key") {
    const sortFn: SortFn = (a, b) =>
      (a.key || "").localeCompare(b.key || "", "en", { numeric: true });
    return s(messages, [], sortFn);
  }

  if (sort.key === "sessionTargetIndex") {
    const sortFn: SortFn = (a, b) =>
      (a.sessionTargetIndex || 0) - (b.sessionTargetIndex || 0)
    return s(messages, [], sortFn);
  }

  if (sort.key === "topic") {
    const sortFn: SortFn = (a, b) =>
      (a.topic || "").localeCompare(b.topic || "", "en", { numeric: true });
    return s(messages, [], sortFn);
  }

  if (sort.key === "producerName") {
    const sortFn: SortFn = (a, b) =>
      (a.producerName || "").localeCompare(b.producerName || "", "en", {
        numeric: true,
      });
    return s(messages, [], sortFn);
  }

  if (sort.key === "value") {
    const sortFn: SortFn = (a, b) =>
      (a.value || "").localeCompare(b.value || "", "en", {
        numeric: true,
      });
    return s(messages, [], sortFn);
  }

  if (sort.key === "schemaVersion") {
    const sortFn: SortFn = (a, b) =>
      (a.schemaVersion || 0) - (b.schemaVersion || 0);
    return s(messages, [], sortFn);
  }

  if (sort.key === "size") {
    const sortFn: SortFn = (a, b) => (a.size || 0) - (b.size || 0);
    return s(messages, [], sortFn);
  }

  if (sort.key === "properties") {
    const sortFn: SortFn = (a, b) => {
      const aStr = JSON.stringify(a.properties);
      const bStr = JSON.stringify(b.properties);
      return aStr.localeCompare(bStr, "en", { numeric: true });
    };

    return s(messages, [], sortFn);
  }

  if (sort.key === "eventTime") {
    const [defs, undefs] = partition(
      messages,
      (m) => m.eventTime !== undefined
    );
    const sortFn: SortFn = (a, b) => (a.eventTime || 0) - (b.eventTime || 0);
    return s(defs, undefs, sortFn);
  }

  if (sort.key === "brokerPublishTime") {
    const [defs, undefs] = partition(
      messages,
      (m) => m.brokerPublishTime !== undefined
    );
    const sortFn: SortFn = (a, b) =>
      (a.brokerPublishTime || 0) - (b.brokerPublishTime || 0);
    return s(defs, undefs, sortFn);
  }

  if (sort.key === "sequenceId") {
    const sortFn: SortFn = (a, b) => (a.sequenceId || 0) - (b.sequenceId || 0);
    return s(messages, [], sortFn);
  }

  if (sort.key === "redeliveryCount") {
    const sortFn: SortFn = (a, b) =>
      (a.redeliveryCount || 0) - (b.redeliveryCount || 0);
    return s(messages, [], sortFn);
  }

  if (sort.key === "sessionContextStateJson") {
    const sortFn: SortFn = (a, b) => {
      const aStr = JSON.stringify(a.sessionContextStateJson);
      const bStr = JSON.stringify(b.sessionContextStateJson);
      return aStr.localeCompare(bStr, "en", { numeric: true });
    };

    return s(messages, [], sortFn);
  }

  if (typeof sort.key !== 'string' && sort.key.type === "sessionValueProjection") {
    const projectionIndex = sort.key.projectionIndex;

    const [defs, undefs] = partition(
      messages,
      (m) => m.sessionValueProjectionListResult[projectionIndex].displayValue !== undefined
    );

    const sortFn: SortFn = (a, b) =>
      (a.sessionValueProjectionListResult[projectionIndex].displayValue || "")
        .localeCompare(b.sessionValueProjectionListResult[projectionIndex].displayValue || "",
          "en",
          { numeric: true }
        );

    return s(defs, undefs, sortFn);
  }

  if (typeof sort.key !== 'string' && sort.key.type === "sessionTargetValueProjection") {
    const targetIndex = sort.key.targetIndex;
    const projectionIndex = sort.key.projectionIndex;

    const [defs, undefs] = partition(
      messages,
      (m) => m.sessionTargetIndex === targetIndex &&
        m.sessionTargetValueProjectionListResult[projectionIndex].displayValue !== undefined
    );

    const sortFn: SortFn = (a, b) => {
      if (a.sessionTargetIndex !== targetIndex) {
        return 1;
      }

      if (b.sessionTargetIndex !== targetIndex) {
        return -1;
      }

      return (a.sessionTargetValueProjectionListResult[projectionIndex].displayValue || "")
        .localeCompare(b.sessionTargetValueProjectionListResult[projectionIndex].displayValue || "",
          "en",
          { numeric: true }
        );
    }

    return s(defs, undefs, sortFn);
  }

  return messages;
};
