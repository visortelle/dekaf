import { ReactElement } from "react";
import { ManagedItemType } from "../model/user-managed-items";
import { getReadableItemType } from "../get-readable-item-type";

export const help: Partial<Record<ManagedItemType, ReactElement>> = {
  "consumer-session-config": (
    <div>
      <p>
        <strong>{getReadableItemType("consumer-session-config")}</strong> allows to define one or multiple targets to consume.
      </p>
      <p>
        Each target is a set of one or multiple topics, plus related objects like message filters and coloring rules.
      </p>
    </div>
  ),
  "message-filter": (
    <div>
      <p>
        <strong>{getReadableItemType("message-filter")}</strong> allows you to find messages in a topic.

        <ul>
          <li>
            Use <strong>basic</strong> filter if you aren't familiar with writing code, or just want to filter messages by a simple condition.
          </li>
          <li>
            Use <strong>JavaScript</strong> filter for complex filtering.
            <br /><br />
            Additionally, by JavaScript filters, you can modify {getReadableItemType("consumer-session-config")} state. It allows you to accumulate data from messages and make simple calculations. For example, you may want to calculate the median value of all new orders over last week, or count failed events.
          </li>
        </ul>
      </p>
    </div>
  ),
  "consumer-session-start-from": (
    <div>
      <p>
        <strong>{getReadableItemType("consumer-session-start-from")}</strong> allows you to specify the starting point for a consumer session.
      </p>

      <p>
        You can save it to <strong>Library</strong> and reuse later.
      </p>
    </div>
  ),
  "message-filter-chain": (
    <div>
      <p>
        <strong>{getReadableItemType("message-filter-chain")}</strong> is a list of filters that are sequentially applied to each message.
      </p>
    </div>
  ),
  "topic-selector": (
    <div>
      <p>
        <strong>{getReadableItemType("topic-selector")}</strong> allows to select one or more topics.
      </p>
      <p>
        Analyzing multiple topics simultaneously can be valuable to identify message patterns that may be difficult to notice by inspecting each topic in isolation.
      </p>
    </div>
  ),
  "consumer-session-target": (
    <div>
      <p>
        <strong>{getReadableItemType("consumer-session-target")}</strong> allows to group topic(s) and related objects like message filter chain and coloring rule chain.
      </p>
      <p>
        Each <strong>{getReadableItemType("consumer-session-config")}</strong> can have one or more targets.
      </p>
    </div>
  ),
  "coloring-rule": (
    <div>
      <p>
        <strong>{getReadableItemType("coloring-rule")}</strong> allows you to highlight messages that match a certain condition.
      </p>
    </div>
  ),
  "coloring-rule-chain": (
    <div>
      <p>
        <strong>{getReadableItemType("coloring-rule-chain")}</strong> is a list of coloring rules that are sequentially applied to each message.
      </p>
      <p>
        First rule that matches the message will be applied.
      </p>
    </div>
  ),
  "markdown-document": (
    <div>
      <p>
        <strong>{getReadableItemType("markdown-document")}</strong> allows to attach any useful information in markdown format to Pulsar resources like tenant, namespace, or topic.
      </p>
      <p>
        It may be a resource description, documentation, responsible person contact info, etc.
      </p>
      <p>
        <a target="_blank" href="https://github.github.com/gfm/">Markdown reference</a>
      </p>
    </div>
  ),
  "basic-message-filter-target": (
    <div>
      <p>
        <strong>{getReadableItemType("basic-message-filter-target")}</strong> allows you to specify an object field to use.
      </p>
      <p>
        Optionally, you can post-process this field.
      </p>
    </div>
  ),
  "value-projection": (
    <div>
      <p>
        <strong>{getReadableItemType("value-projection")}</strong> allows you to map any message field to a table column, or use it as a value source in visualization charts.
      </p>
    </div>
  ),
  "value-projection-list": (
    <div>
      <p>
        <strong>{getReadableItemType("value-projection-list")}</strong> is a list of <strong>{getReadableItemType("value-projection")}</strong> items.
      </p>
      <p>
        <strong>{getReadableItemType("value-projection")}</strong> allows you to map any message field to a table column, or use it as a value source in visualization charts.
      </p>
    </div>
  ),
  "deserializer": (
    <div>
      Deserializer converts raw message value bytes to JSON.
      <br />
      By default the latest topic schema is used.
      <br />
      Choose an another deserializer in case if the topic doesn't have schema or you use a custom serialization that isn't supported by Pulsar out of the box.
    </div>
  ),
  "message-generator": (
    <div>
      <p>
        <strong>{getReadableItemType("message-generator")}</strong> allows you to generate messages.
      </p>
      <p>
        You can generate messages from a fixed JSON, a random JSON, or generate it dynamically using JavaScript.
      </p>
    </div>
  ),
  "producer-task": (
    <div>
      <p>
        <strong>{getReadableItemType("producer-task")}</strong> allows you to define a task for the producer.
      </p>
      <p>
        It includes the topic selector, message generator, Pulsar producer configuration, and other settings.
      </p>
    </div>
  ),
  "producer-session-config": (
    <div>
      <p>
        <strong>{getReadableItemType("producer-session-config")}</strong> allows you to define one or multiple producer tasks.
      </p>
    </div>
  ),
} as const;
