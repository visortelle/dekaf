import React, { useEffect } from 'react';
import s from './TopicSelectorInfo.module.css'
import { TopicSelector } from '../../topic-selector';
import * as GrpcClient from '../.../../../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../.../../../../../../app/contexts/Notifications';
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { useDebounce } from 'use-debounce';
import { topicSelectorToPb } from '../../../conversions/conversions';
import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';
import { tooltipId } from '../../../../../ui/Tooltip/Tooltip';
import { renderToStaticMarkup } from 'react-dom/server';

export type TopicSelectorInfoProps = {
  topicSelector: TopicSelector;
};

const TopicSelectorInfo: React.FC<TopicSelectorInfoProps> = (props) => {
  const { consumerServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [topicFqns, setTopicFqns] = React.useState<string[]>([]);
  const [topicSelectorDebounced] = useDebounce(props.topicSelector, 500);

  useEffect(() => {
    async function refreshTopicFqns() {
      const req = new pb.ResolveTopicSelectorRequest();
      const topicSelectorPb = topicSelectorToPb(topicSelectorDebounced);
      req.setTopicSelector(topicSelectorPb);

      const res = await consumerServiceClient.resolveTopicSelector(req, {})
        .catch((err) => notifyError(`Failed to resolve topic selector: ${err.message}`));

      if (res === undefined) {
        setTopicFqns([]);
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        setTopicFqns([]);
        return;
      }

      setTopicFqns(res.getTopicFqnsList());
    }

    refreshTopicFqns();
  }, [topicSelectorDebounced]);

  const tooltipContent = topicFqns.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).length > 0 ? (
    <ul style={{ maxHeight: '200rem', overflow: 'auto', padding: '12rem' }}>
      {topicFqns.map((topicFqn, i) => (
        <li key={i}>{topicFqn}</li>
      ))}
    </ul>
  ) : undefined;

  return (
    <div className={s.TopicSelectorInfo}>
      {topicFqns.length === 0 && <div className={s.Topics}>No topics found</div>}
      {topicFqns.length > 0 && (
        <div
          className={s.Topics}
          data-tooltip-id={tooltipId}
          data-tooltip-html={tooltipContent === undefined ? undefined : renderToStaticMarkup(tooltipContent)}
        >
          Non-partitioned topic{topicFqns.length > 1 ? 's' : ''} found:&nbsp;<strong>{topicFqns.length}</strong>
        </div>
      )}
    </div>
  );
}

export default TopicSelectorInfo;
