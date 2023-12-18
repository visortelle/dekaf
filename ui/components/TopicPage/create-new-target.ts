import { v4 as uuid } from 'uuid';
import { ManagedConsumerSessionTargetValOrRef } from "../ui/LibraryBrowser/model/user-managed-items";

export function createNewTarget(): ManagedConsumerSessionTargetValOrRef {
  return {
    type: 'value',
    val: {
      metadata: {
        id: uuid(),
        name: '',
        descriptionMarkdown: '',
        type: 'consumer-session-target'
      },
      spec: {
        topicSelector: {
          type: 'value',
          val: {
            metadata: {
              id: uuid(),
              name: '',
              descriptionMarkdown: '',
              type: 'topic-selector'
            },
            spec: {
              topicSelector: {
                type: 'current-topic'
              }
            }
          }
        },
        coloringRuleChain: {
          type: 'value',
          val: {
            metadata: {
              id: uuid(),
              name: '',
              descriptionMarkdown: '',
              type: 'coloring-rule-chain'
            },
            spec: {
              isEnabled: true,
              coloringRules: []
            }
          }
        },
        messageFilterChain: {
          type: 'value',
          val: {
            metadata: {
              id: uuid(),
              name: '',
              descriptionMarkdown: '',
              type: 'message-filter-chain'
            },
            spec: {
              isEnabled: true,
              isNegated: false,
              filters: [],
              mode: 'all'
            }
          }
        }
      }
    }
  }
}
