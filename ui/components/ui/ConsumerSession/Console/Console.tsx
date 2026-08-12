import React from 'react';
import useLocalStorage from 'use-local-storage-state';

import Producer from './Producer/Producer';
import { MessageDescriptor, ConsumerSessionConfig, SessionState } from '../types';
import Tabs, { Tab } from '../../Tabs/Tabs';

import s from './Console.module.css'
import DebugLogs from './ContextLogs/ContextLogs';
import ExpressionInspector from './ContextRepl/ContextRepl';
import TopicPositions from './TopicPositions/TopicPositions';
import { LibraryContext } from '../../LibraryBrowser/model/library-context';
import PaneResizeHandle, { PaneResizeHandleKeyboardTarget } from '../../resizable/PaneResizeHandle';
import ActionButton from '../../ActionButton/ActionButton';
import { localStorageKeys } from '../../../local-storage-keys';

export type ConsoleProps = {
  isShow: boolean;
  onClose: () => void;
  sessionKey: number;
  sessionSubscriptionName: string;
  sessionConfig: ConsumerSessionConfig | undefined;
  sessionState: SessionState;
  onSessionStateChange: (state: SessionState) => void;
  messages: MessageDescriptor[];
  consumerName: string;
  currentTopic: string | undefined;
  libraryContext: LibraryContext;
  onResizeStart: (startClientY: number, renderedHeight?: number) => void;
  /** The panel's pane, for the resize handle's keyboard half (arrows/Home/End + ARIA value). */
  resizePane?: PaneResizeHandleKeyboardTarget;
};

type TabKey = 'producer' | 'context-logs' | 'context-repl' | 'topic-positions';

const defaultTab: TabKey = 'topic-positions';

const Console: React.FC<ConsoleProps> = (props) => {
  // Topic Positions leads and is the default: it is the tab that answers "where am I?", which
  // is the first question on an open session - and unlike 'producer' it exists on EVERY page
  // (the Produce tab only renders on topic pages, so a producer default pointed at a missing
  // tab everywhere else).
  // Read as `unknown` on purpose: localStorage outlives releases, so a tab removed by a future
  // build can leave an arbitrary old key behind. Unknown keys fall back safely and are healed.
  const [storedActiveTab, setStoredActiveTab] = useLocalStorage<unknown>(localStorageKeys.consumerSessionToolsTab, {
    defaultValue: defaultTab
  });
  const hasProducerTab = props.libraryContext.pulsarResource.type === 'topic';
  // Assigned after the actual tab list is built below. Render callbacks close over this binding
  // and run only after the assignment.
  let activeTab: TabKey = defaultTab;

  let tabs: Tab<TabKey>[] = [
    {
      key: 'topic-positions',
      title: 'Topic Positions',
      testId: 'console-tab-topic-positions',
      // Rendered always, like its siblings - but it is handed `isVisible` and polls nothing
      // while hidden, which is what keeps a debug view off the broker for everyone not looking
      // at it.
      isRenderAlways: true,
      render: () => (
        <TopicPositions
          consumerName={props.consumerName}
          sessionState={props.sessionState}
          // BOTH gates: the tab being the selected one AND the panel being open. As the default
          // tab, selection alone is true from page load - without the isShow half this would
          // poll the broker with the panel shut, for every visitor of every session page.
          isVisible={props.isShow && activeTab === 'topic-positions'}
        />
      )
    }
  ];

  if (hasProducerTab) {
    tabs = tabs.concat([{
      key: 'producer',
      title: 'Produce',
      testId: 'console-tab-produce',
      isRenderAlways: true,
      render: () => {
        if (props.sessionConfig === undefined) {
          return;
        }

        return (
          <Producer
            preset={{
              topic: props.currentTopic,
              key: ''
            }}
          />
        )
      }
    }]);
  }

  tabs = tabs.concat([

    {
      key: 'context-repl',
      title: 'Context REPL',
      testId: 'console-tab-repl',
      isRenderAlways: true,
      render: () => (
        <ExpressionInspector
          consumerName={props.consumerName}
          sessionState={props.sessionState}
          isVisible={props.isShow && activeTab === 'context-repl'}
        />
      )
    },
    {
      key: 'context-logs',
      title: 'Context Logs',
      testId: 'console-tab-logs',
      isRenderAlways: true,
      render: () => (
        <DebugLogs
          messages={props.messages}
          sessionState={props.sessionState}
          isVisible={props.isShow && activeTab === 'context-logs'}
        />
      )
    }
  ]);

  // Validate against the tabs that THIS BUILD actually rendered, not a second hard-coded list.
  // Removing a tab therefore makes an old saved key fall back automatically. Produce is the one
  // contextual exception: it is absent on namespace pages but may return on the next topic page,
  // so keep that preference instead of erasing it there.
  const storedTab = typeof storedActiveTab === 'string' ? storedActiveTab : undefined;
  const availableStoredTab = tabs.find((tab) => tab.key === storedTab);
  const isStoredTabAvailable = availableStoredTab !== undefined;
  const isTemporarilyUnavailableProducer = storedTab === 'producer' && !hasProducerTab;
  activeTab = availableStoredTab?.key ?? defaultTab;

  React.useEffect(() => {
    if (!isStoredTabAvailable && !isTemporarilyUnavailableProducer) {
      setStoredActiveTab(defaultTab);
    }
  }, [storedActiveTab, isStoredTabAvailable, isTemporarilyUnavailableProducer, setStoredActiveTab]);

  if (props.sessionConfig === undefined) {
    return null;
  }

  return (
    <div className={`${s.Console} ${props.isShow ? s.VisibleConsole : ''}`} data-testid="cs-console">
      {props.isShow && (
        <PaneResizeHandle
          resizeAxis="vertical"
          className={s.ResizeHandle}
          testId="cs-tools-resize-handle"
          title="Drag to resize More tools"
          onResizeStart={props.onResizeStart}
          pane={props.resizePane}
        />
      )}
      {props.isShow && (
        <div className={s.CloseConsole}>
          <ActionButton
            testId="cs-tools-close"
            onClick={props.onClose}
            title="Close More tools"
            action={{ type: 'predefined', action: 'close' }}
            buttonProps={{ appearance: 'borderless-semitransparent' }}
          />
        </div>
      )}
      <Tabs<TabKey>
        activeTab={activeTab}
        onActiveTabChange={setStoredActiveTab}
        tabs={tabs}
      />
    </div>
  );
}

export default Console;
