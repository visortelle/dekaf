# Start positions and modes - comparison

A consumer session has three independent choices:

1. **Start from** - where in the topic the session begins.
2. **Delivery order** - how messages from several topics or partitions are combined into one stream.
3. **Consumption mode** (per target) - whether the session reads the raw log or the compacted view.

This page compares the options and what they are compatible with.

## Start from

| Mode | What you get | Exact? | Speed | Notes |
|---|---|---|---|---|
| Earliest message | Everything the topic still retains | Exact | Instant | |
| Latest message | Only messages published after Play | Exact | Instant | The only mode available on non-persistent topics |
| Skip first n messages | Everything except the globally-oldest n (by publish time, across all partitions) | Exact - counts real messages, not storage entries | Proportional to n; a progress bar appears for very large skips | For jumping deep into a huge topic, a time-based or percentage mode is instant instead |
| Latest n messages | Exactly the globally-newest n (by publish time, across all partitions) | Exact | Fast at any topic size (walks only the tail) | |
| Message with specific ID | From one exact message | Exact | Instant | |
| Specific time | From a moment in time | To the millisecond | Instant at any topic size | |
| Relative time ago | Same, phrased as "2 hours ago" | To the millisecond | Instant | Optional rounding to the unit start |
| Approximate position (% of data) | Roughly this far through the stored data | Approximate - counted in storage entries, so batching skews the message percentage | Instant at any topic size - it asks the broker a fixed number of questions however much the topic holds | Each topic and partition is positioned independently |
| Approximate position (% of time) | Roughly this far between the oldest and newest publish times | Approximate - producer clocks set the timestamps | Instant at any topic size | One shared cutoff instant for the whole session, so multi-topic sessions align |

## Compatibility: start from x what you are reading

| Start from | Non-persistent topic | Read-compacted target | Topic with chunked messages | Partitioned topic |
|---|---|---|---|---|
| Earliest message | disabled - nothing is retained | yes | yes | yes |
| Latest message | **yes - the only mode** | yes | yes | yes |
| Skip first n | disabled | yes - counts what is actually delivered | yes - a chunked message counts as one message | yes - the skipped n are global, not per partition |
| Latest n | disabled | **refused** - it counts the raw log, which compaction rewrites | **refused** - storage entries are not messages there; the error names the alternatives | yes - the n are global, not n per partition |
| Message ID | disabled | yes | yes | yes |
| Specific / Relative time | disabled | yes | yes | yes |
| % of data | disabled | **refused** - it measures the raw log | yes, but chunk entries skew the percentage | yes - each partition positioned independently |
| % of time | disabled | **refused** - its range comes from the raw log | yes | yes - one shared cutoff across all partitions |

A refused combination fails with a message naming the reason and a working alternative - it never
silently returns a different result than asked for.

## Delivery order (when a session merges several topics or partitions)

| | Fastest | Best effort | Guaranteed (the default) |
|---|---|---|---|
| Order claim | None - messages appear as they arrive | Sorted by the selected timestamp, waiting up to ~0.75 s for stragglers | An exact replay of everything recorded up to Play (of what retention still holds), strictly sorted; it auto-pauses when caught up, and "Load new messages up to now" extends the replay to the present |
| A partition goes silent | No effect | After the grace, delivery continues; a straggler arriving later is shown late and counted | Silence itself does not matter - the replay delivers each stream's recorded range and auto-pauses at the boundary; a silent stream holds delivery only while part of its recorded range is still undelivered |
| A silent partition stays silent | No effect | Delivery simply continues without it; only while a counted start position (Skip first n) is still resolving does a ~30 s give-up set the stream aside and mark the start position approximate | If a stream's recorded range can no longer be delivered - trimmed away by retention, or the start position seeked past its end - no caught-up fires: the session discloses the wait and offers a one-click switch to Best effort. Otherwise the caught-up pause stands, and "Load new messages up to now" replays whatever was recorded since |
| Late/out-of-order messages | Shown as they come | Delivered and counted, never dropped | Cannot occur within a replay chunk; across a pause seam a producer-clock reversal is delivered flagged (row marker + counter), never silently |
| Non-persistent topics | yes | yes | Single stream only - nothing is retained, so Play announces caught-up instantly; merging non-persistent topics is refused |
| Best for | Raw throughput, single topics | Everyday browsing and live following | Forensic reading of recorded history where order matters more than immediacy |

**Order by** applies to Best effort and Guaranteed: publish time (producer clock), broker publish
time (broker clock, entry metadata), or event time (application-set). A message missing the chosen
timestamp falls back to publish time, and the session reports how often that happened.

**Latest message x Guaranteed** replays nothing - a replay of recorded history starting at "now"
has nothing behind it. The combination is selectable; Play simply answers caught-up immediately,
and the caught-up panel offers the two ways on (load what has arrived since, or switch to Best
effort and follow live).

## Consumption mode (per target)

| | Regular | Read compacted |
|---|---|---|
| What you read | The raw log - every retained message | The newest message per key up to the compaction horizon, then the raw tail |
| Use it for | Everything by default | Key-value style topics where only the latest value per key matters |
| Start-from limits | None | Latest n and both percentage modes are refused (they measure the raw log); Earliest, Latest, Skip first n, Message ID and the time modes work |

## See also

- [Consumer sessions overview](./index.md)
- [Consumer session tutorial](./consumer-session-tutorial.md)
