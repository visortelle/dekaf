import { SWRConfiguration } from 'swr';

export const nodesSwrConfiguration: SWRConfiguration = { dedupingInterval: 10000 };

export const NodesUtils = {
  getTopicName: (topicUrl: string): string => {
    const topicUrlParts = topicUrl.split('/');
    return topicUrlParts[topicUrlParts.length - 1];
  },
  squashPartitionedTopics: (topicsNames: string[]): string[] => {
    return Array.from(
      new Set(topicsNames.map((topic: string) => topic.replace(/-partition-\d+$/, "")))
    );
  }
}
