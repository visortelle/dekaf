export const help = {
  consumerSessionConfig: (
    <div>
      <p>
        <strong>Consumer Session Config</strong> is a set of configuration parameters like:
      </p>

      <ul>
        <li>Start From</li>
        <li>Message Filter Chain</li>
        <li>etc...</li>
      </ul>

      <p>
        You can save it to <strong>Library</strong> and reuse later.
      </p>
    </div>
  ),
  messageFilter: (
    <div>
      <p>
        <strong>Message Filter</strong> allows you to find messages in a topic.

        <ul>
          <li>
            Use <strong>Basic Filter</strong> if you aren't familiar with writing code, or just want to filter messages by a simple condition.
          </li>
          <li>
            Use <strong>JavaScript Filter</strong> for complex filtering.
            <br /><br />
            Additionally, JavaScript filters support the <strong>Consumer Session State</strong> feature. It allows you to accumulate data from messages and make simple calculations. For example, you may want to calculate the median value of all new orders over last week; or count failure events grouped by it's reason.
          </li>
        </ul>
      </p>

      <p>
        You can save it to <strong>Library</strong> and reuse later.
      </p>
    </div>
  ),
  consumerSessionStartFrom: (
    <div>
      <p>
        <strong>Start From</strong> allows you to specify the starting point for a consumer session.
      </p>

      <p>
        You can save it to <strong>Library</strong> and reuse later.
      </p>
    </div>
  ),
  messageFilterChain: (
    <div>
      <p>
        <strong>Message Filter Chain</strong> is a list of filters that are sequentially applied to each message.
      </p>

      <p>
        You can save it to <strong>Library</strong> and reuse later.
      </p>
    </div>
  ),
  topicSelector: (
    <div>
      <p>
        <strong>Topic Selector</strong> allows to select one or more topics.
      </p>
      <p>
        Analyzing multiple topics simultaneously can be valuable to identify message patterns that may be difficult to notice by inspecting each topic in isolation.
      </p>
      <p>
        You can save it to <strong>Library</strong> and reuse later.
      </p>
    </div>
  ),
  consumerSessionTarget: (
    <div>
      <p>
        Consumer Session Topic(s)
      </p>
    </div>
  ),
  coloringRule: (
    <div>
      <p>
        <strong>Coloring Rule</strong> allows you to highlight messages that match a certain condition.
      </p>
      <p>
        You can save it to <strong>Library</strong> and reuse later.
      </p>
    </div>
  ),
  coloringRuleChain: (
    <div>
      <p>
        <strong>Coloring Rule Chain</strong> is a list of coloring rules that are sequentially applied to each message.
      </p>
      <p>
        First rule that matches the message will be applied.
      </p>

      <p>
        You can save it to <strong>Library</strong> and reuse later.
      </p>
    </div>
  ),
  markdownDocument: (
    <p>
      <a target="_blank" href="https://github.github.com/gfm/">Markdown language reference</a>
    </p>
  )
} as const;
