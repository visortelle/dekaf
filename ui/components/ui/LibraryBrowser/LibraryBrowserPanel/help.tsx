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
            Use <strong>JS Filter</strong> for complex filtering.
            <br /><br />
            Additionally, JS filters support the <strong>Accumulator</strong> feature. It allows you to accumulate data from messages and make simple calculations. For example, you may want to calculate the median value of all new orders over last week; or count failure events grouped by it's reason.
          </li>
        </ul>
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
  )
} as const;
