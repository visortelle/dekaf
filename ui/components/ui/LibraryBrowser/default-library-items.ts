import { themeBackgroundColorName, themeForegroundColorName } from "../ConsumerSession/SessionConfiguration/ColoringRulesInput/ColoringRuleInput/ColorPickerButton/ColorPicker/color-palette";
import { LibraryItem } from "./model/library";
import { LibraryContext, resourceMatcherFromContext } from "./model/library-context";
import { ManagedBasicMessageFilterTarget, ManagedColoringRule, ManagedColoringRuleChain, ManagedConsumerSessionConfig, ManagedConsumerSessionStartFrom, ManagedConsumerSessionTarget, ManagedDeserializer, ManagedItem, ManagedItemMetadata, ManagedItemType, ManagedMarkdownDocument, ManagedMessageFilterChain, ManagedTopicSelector, ManagedValueProjection, ManagedValueProjectionList } from "./model/user-managed-items";
import { v4 as uuid } from 'uuid';

export function getDefaultManagedItemMetadata(itemType: ManagedItemType): ManagedItemMetadata {
  return {
    id: uuid(),
    descriptionMarkdown: '',
    name: '',
    type: itemType
  }
}

export function getDefaultManagedItem(itemType: ManagedItemType, libraryContext: LibraryContext): ManagedItem {
  const metadata = getDefaultManagedItemMetadata(itemType);

  switch (itemType) {
    case "consumer-session-config": {
      const v: ManagedConsumerSessionConfig = {
        metadata,
        spec: {
          targets: [
            {
              type: "value",
              val: getDefaultManagedItem("consumer-session-target", libraryContext) as ManagedConsumerSessionTarget
            }
          ],
          coloringRuleChain: {
            type: "value",
            val: getDefaultManagedItem("coloring-rule-chain", libraryContext) as ManagedColoringRuleChain
          },
          messageFilterChain: {
            type: "value",
            val: getDefaultManagedItem("message-filter-chain", libraryContext) as ManagedMessageFilterChain
          },
          startFrom: {
            type: "value",
            val: getDefaultManagedItem("consumer-session-start-from", libraryContext) as ManagedConsumerSessionStartFrom
          },
          pauseTriggerChain: {
            type: "value",
            val: {
              metadata: getDefaultManagedItemMetadata("consumer-session-pause-trigger-chain"),
              spec: {
                events: [],
                mode: "all"
              }
            }
          },

          valueProjectionList: {
            type: "value",
            val: getDefaultManagedItem("value-projection-list", libraryContext) as ManagedValueProjectionList
          },
          numDisplayItems: undefined
        }
      }

      return v;
    }
    case "consumer-session-target": {
      const v: ManagedConsumerSessionTarget = {
        metadata,
        spec: {
          isEnabled: true,
          consumptionMode: {
            type: 'consumer-session-target-consumption-mode',
            mode: {
              type: 'regular-consumption-mode'
            }
          },
          messageValueDeserializer: {
            type: 'value',
            val: getDefaultManagedItem("deserializer", libraryContext) as ManagedDeserializer
          },
          topicSelector: {
            type: "value",
            val: getDefaultManagedItem("topic-selector", libraryContext) as ManagedTopicSelector
          },
          coloringRuleChain: {
            type: "value",
            val: getDefaultManagedItem("coloring-rule-chain", libraryContext) as ManagedColoringRuleChain
          },
          messageFilterChain: {
            type: "value",
            val: getDefaultManagedItem("message-filter-chain", libraryContext) as ManagedMessageFilterChain
          },
          valueProjectionList: {
            type: "value",
            val: getDefaultManagedItem("value-projection-list", libraryContext) as ManagedValueProjectionList
          }
        }
      }

      return v;
    }
    case "message-filter": {
      return {
        metadata,
        spec: {
          isEnabled: true,
          isNegated: false,
          targetField: {
            type: "value",
            val: {
              metadata: getDefaultManagedItemMetadata("basic-message-filter-target"),
              spec: {
                target: {
                  type: "BasicMessageFilterTarget",
                  target: {
                    type: "BasicMessageFilterValueTarget"
                  }
                }
              }
            }
          },
          filter: {
            type: "BasicMessageFilter",
            op: {
              type: "BasicMessageFilterOp",
              isEnabled: true,
              isNegated: false,
              reactKey: uuid(),
              op: {
                type: "AnyTestOp",
                op: {
                  type: "TestOpContainsJson",
                  containsJson: '',
                  isCaseInsensitive: false
                }
              }
            }
          }
        }
      }
    }
    case "message-filter-chain": {
      const v: ManagedMessageFilterChain = {
        metadata,
        spec: {
          isEnabled: true,
          isNegated: false,
          filters: [],
          mode: "all"
        }
      };

      return v;
    }
    case "consumer-session-start-from": {
      const v: ManagedConsumerSessionStartFrom = {
        metadata,
        spec: {
          startFrom: {
            type: "latestMessage"
          }
        }
      };

      return v;
    }
    case "topic-selector": {
      const v: ManagedTopicSelector = {
        metadata,
        spec: libraryContext.pulsarResource.type === 'topic' ? {
          topicSelector: {
            type: "current-topic"
          }
        } : {
          topicSelector: {
            type: "multi-topic-selector",
            topicFqns: []
          }
        }
      };

      return v;
    }
    case "coloring-rule": {
      const v: ManagedColoringRule = {
        metadata,
        spec: {
          isEnabled: true,
          backgroundColor: themeBackgroundColorName,
          foregroundColor: themeForegroundColorName,
          messageFilterChain: {
            type: "value",
            val: getDefaultManagedItem("message-filter-chain", libraryContext) as ManagedMessageFilterChain
          }
        }
      }

      return v;
    }
    case "coloring-rule-chain": {
      const v: ManagedColoringRuleChain = {
        metadata,
        spec: {
          isEnabled: true,
          coloringRules: []
        }
      }

      return v;
    }
    case "markdown-document": {
      const v: ManagedMarkdownDocument = {
        metadata,
        spec: {
          markdown: ''
        }
      }

      return v;
    }
    case "basic-message-filter-target": {
      const v: ManagedBasicMessageFilterTarget = {
        metadata,
        spec: {
          target: {
            type: "BasicMessageFilterTarget",
            target: {
              type: "BasicMessageFilterValueTarget",
            }
          },
        }
      }

      return v;
    }
    case "value-projection": {
      const v: ManagedValueProjection = {
        metadata,
        spec: {
          isEnabled: true,
          target: {
            type: "value",
            val: getDefaultManagedItem("basic-message-filter-target", libraryContext) as ManagedBasicMessageFilterTarget
          },
          shortName: 'value',
          width: undefined
        }
      }

      return v;
    }
    case "value-projection-list": {
      const v: ManagedValueProjectionList = {
        metadata,
        spec: {
          isEnabled: true,
          projections: []
        }
      }

      return v;
    }
    case "deserializer": {
      const v: ManagedDeserializer = {
        metadata,
        spec: {
          deserializer: {
            type: 'deserializer',
            deserializer: {
              type: 'use-latest-topic-schema'
            }
          }
        }
      }

      return v;
    }

    default: throw new Error(`Unable to create default managed item. Unsupported item type: ${itemType}`);
  }
}

export function getDefaultLibraryItem(itemType: ManagedItemType, libraryContext: LibraryContext): LibraryItem {
  return {
    metadata: {
      availableForContexts: [resourceMatcherFromContext(libraryContext, 'derive-from-context')],
      updatedAt: new Date().toISOString()
    },
    spec: getDefaultManagedItem(itemType, libraryContext)
  }
}
