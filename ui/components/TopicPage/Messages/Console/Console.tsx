import React, {useMemo, useState} from 'react';

import SubscriptionsCursors from './SubscriptionsCursors/SubscriptionsCursors';
import Producer, {ValueType} from './Producer/Producer';
import Visualization from './Visualization/Visualization';
import MessagesExporter from './MessagesExporter/MessagesExporter';
import { MessageDescriptor, SessionConfig, SessionState } from '../types';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import EnteringFromBottomDiv from '../../../ui/animations/EnteringFromBottomDiv';
import Tabs from '../../../ui/Tabs/Tabs';

import s from './Console.module.css'
import DebugLogs from './FilterLogs/FilterLogs';
import ExpressionInspector from './FilterRepl/FilterRepl';
import NothingToShow from '../../../ui/NothingToShow/NothingToShow';
import * as AsyncTasks from "../../../app/contexts/AsyncTasks";
import {ReprocessMessagePayload} from "../Message/ReprocessMessage/ReprocessMessage";

export type ConsoleProps = {
  isShow: boolean;
  onClose: () => void;
  sessionKey: number;
  sessionSubscriptionName: string;
  sessionConfig: SessionConfig;
  sessionState: SessionState;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
  onSessionStateChange: (state: SessionState) => void;
  messages: MessageDescriptor[];
  consumerName: string;
};

type TabKey = 'producer' | 'cursors' | 'visualize' | 'filter-logs' | 'filter-repl' | 'export';

const Console: React.FC<ConsoleProps> = (props) => {
  const asyncTasks = AsyncTasks.useContext();
  const [activeTab, setActiveTab] = useState<TabKey>(
    asyncTasks.tasks['reprocess-message'] === undefined ? 'export' : 'producer'
  );
  const [_reprocessMessageTask, _setReprocessMessageTask] = useState(
    asyncTasks.tasks['reprocess-message'] !== undefined ? (
      JSON.parse(asyncTasks.tasks['reprocess-message']) as ReprocessMessagePayload
    ) : undefined
  );
  const reprocessMessageTask: ReprocessMessagePayload | undefined = useMemo(() => _reprocessMessageTask, [_reprocessMessageTask]);


  return (
    <EnteringFromBottomDiv
      className={`${s.Console} ${props.isShow ? s.VisibleConsole : ''}`}
      isVisible={props.isShow}
      motionKey='consumer-console'
    >
      <Tabs<TabKey>
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        onClose={props.onClose}
        tabs={{
          'producer': {
            title: 'Produce',
            isRenderAlways: true,
            render: () => {
              if (asyncTasks.tasks['reprocess-message'] !== undefined) {
                const reprocessMessageTask: ReprocessMessagePayload = JSON.parse(asyncTasks.tasks['reprocess-message']);
                asyncTasks.finishTask('reprocess-message');

                return (
                  <Producer
                    preset={{
                      topic: props.sessionConfig.topicsSelector.type === 'by-names' ? props.sessionConfig.topicsSelector.topics[0] : undefined,
                      key: reprocessMessageTask.message.key ?? '',
                      value: reprocessMessageTask.message.value ? JSON.stringify(JSON.parse(reprocessMessageTask.message.value)) : '',
                      valueType: 'json',
                      eventTime: reprocessMessageTask.message.eventTime ? new Date(reprocessMessageTask.message.eventTime) : undefined,
                      propertiesJsonMap: reprocessMessageTask.message.properties ? JSON.stringify(reprocessMessageTask.message.properties) : '{}',
                    }}
                  />
                );
              } else {
                return (
                  <Producer
                    preset={{
                      topic: props.sessionConfig.topicsSelector.type === 'by-names' ? props.sessionConfig.topicsSelector.topics[0] : undefined,
                      key: '',
                      value: '',
                      valueType: 'json',
                      eventTime: undefined,
                      propertiesJsonMap: '{}',
                    }}
                  />
                );
              }
            }
          },
          'visualize': {
            title: 'Visualize',
            isRenderAlways: true,
            render: () => (
              <Visualization
                messages={props.messages}
                isVisible={activeTab === 'visualize'}
                sessionState={props.sessionState}
              />
            )
          },
          'filter-repl': {
            title: 'Filter REPL',
            isRenderAlways: true,
            render: () => (
              <ExpressionInspector
                consumerName={props.consumerName}
                sessionState={props.sessionState}
                isVisible={activeTab === 'filter-repl'}
              />
            )
          },
          'filter-logs': {
            title: 'Filter logs',
            isRenderAlways: true,
            render: () => (
              <DebugLogs
                messages={props.messages}
                sessionState={props.sessionState}
                isVisible={activeTab === 'filter-logs'}
              />
            )
          },
          'cursors': {
            title: 'Cursors',
            isRenderAlways: true,
            render: () => (
              <CursorsTab {...props} />
            ),
          },
          'export': {
            title: 'Export',
            isRenderAlways: true,
            render: () => (
              <MessagesExporter
                messages={props.messages}
                sessionState={props.sessionState}
                isVisible={activeTab === 'export'}
              />
            )
          }
        }}
      />
    </EnteringFromBottomDiv>
  );
}

const CursorsTab: React.FC<ConsoleProps> = (props) => {
  return (
    <>
      {!(props.sessionState === 'running' || props.sessionState === 'paused') && (
        <NothingToShow content={"Run session to see cursors list."} />
      )}
      {props.sessionConfig.topicsSelector.type === 'by-names' && (
        <>
          <div className={s.SubscriptionsCursors} style={{
            visibility: (props.sessionState === 'running' || props.sessionState === 'paused') ? 'visible' : 'hidden'
          }}>
            <SubscriptionsCursors
              sessionKey={props.sessionKey}
              sessionSubscriptionName={props.sessionSubscriptionName}
              sessionState={props.sessionState}
              sessionConfig={props.sessionConfig}
              onSessionStateChange={props.onSessionStateChange}
              selector={props.sessionConfig.topicsSelector.topics.reduce((acc, topic) => ({ ...acc, [topic]: [props.sessionSubscriptionName] }), {})}
              topicsInternalStats={props.topicsInternalStats}
            />
          </div>
        </>
      )}
    </>
  );
}

export default Console;
