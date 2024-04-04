import React from 'react';
import s from './ProducerSession.module.css'
import ProducerSessionConfigInput from './producer-session-config/ProducerSessionConfigInput/ProducerSessionConfigInput';
import { ManagedProducerSessionConfigValOrRef } from '../LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../LibraryBrowser/model/library-context';
import { LibraryBrowserPanelProps } from '../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';

export type ProducerSessionProps = {
  libraryContext: LibraryContext;
  isReadOnly?: boolean;
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const defaultConf: ManagedProducerSessionConfigValOrRef = {
  type: 'value',
  val: {
    metadata: {
      id: 'producer-session-config',
      descriptionMarkdown: 'Descrition of the producer session configuration',
      name: 'Namesasdfsdf asd',
      type: 'producer-session-config',
    },
    spec: {
      tasks: [
        {
          task: {
            type: 'producer-task',
            task: {
              type: 'value',
              val: {
                metadata: {
                  id: 'producer-task',
                  descriptionMarkdown: 'Description of the producer task',
                  name: 'Name',
                  type: 'producer-task',
                },
                spec: {
                  numMessages: undefined,
                  producerConfig: undefined,
                  topicSelector: {
                    type: 'value',
                    val: {
                      metadata: {
                        id: 'topic-selector',
                        descriptionMarkdown: 'Description of the topic selector',
                        name: 'Name',
                        type: 'topic-selector',
                      },
                      spec: {
                        topicSelector: {
                          type: 'multi-topic-selector',
                          topicFqns: [
                            'persistent://public/default/abc',
                          ]
                        }
                      }
                    }
                  },
                  intervalNanos: 1000000000,
                  limitDurationNanos: 1000000000,
                  messageGenerator: {
                    type: 'value',
                    val: {
                      metadata: {
                        id: 'message-generator',
                        descriptionMarkdown: 'Description of the message generator',
                        name: 'Name',
                        type: 'message-generator',
                      },
                      spec: {
                        generator: {
                          type: 'message-generator',
                          deliverAfterGenerator: undefined,
                          deliverAtGenerator: undefined,
                          eventTimeGenerator: undefined,
                          keyGenerator: undefined,
                          orderingKeyGenerator: undefined,
                          propertiesGenerator: undefined,
                          sequenceIdGenerator: undefined,
                          valueGenerator: {
                            type: 'value-generator',
                            generator: {
                              type: 'from-json',
                              generator: {
                                type: 'json-generator',
                                generator: {
                                  type: 'fixed-json-generator',
                                  json: '{}'
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
              }
            }
          }
        }
      ]
    }
  }
};

// Duplicate same tasks
defaultConf.val.spec.tasks.push(defaultConf.val.spec.tasks[0]);
defaultConf.val.spec.tasks.push(defaultConf.val.spec.tasks[0]);
defaultConf.val.spec.tasks.push(defaultConf.val.spec.tasks[0]);
defaultConf.val.spec.tasks.push(defaultConf.val.spec.tasks[0]);


const ProducerSession: React.FC<ProducerSessionProps> = (props) => {
  const [config, setConfig] = React.useState<ManagedProducerSessionConfigValOrRef>(defaultConf);

  return (
    <div className={s.ProducerSession}>
      <ProducerSessionConfigInput
        value={config}
        onChange={setConfig}
        libraryContext={props.libraryContext}
        isReadOnly={props.isReadOnly}
        libraryBrowserPanel={props.libraryBrowserPanel}
      />
    </div>
  );
}

export default ProducerSession;
