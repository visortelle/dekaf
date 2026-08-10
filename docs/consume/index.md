# Consume Messages

Dekaf allows you to explore Apache Pulsar topic data by using **consumer sessions**.

## Features

- Browse live stream data
- Consume multiple topics at once
- Choose how Dekaf combines multiple topics or partitions. Pulsar itself does not guarantee order
  across topics.
  - **Guaranteed** is an exact replay: it delivers everything recorded up to Play (of what
    retention still holds) in strict selected-timestamp order, then auto-pauses with a caught-up
    banner; Resume extends the replay to now, and an ordering violation across a pause seam
    (producer clock skew) is delivered loudly flagged - a row marker plus a session counter -
    never silently. Multi-stream sessions require persistent topics.
  - **Best effort** (the default) merges by the selected timestamp within ~0.75 s. Late messages can
    appear out of order; none are dropped.
  - **Fastest** delivers each topic or partition independently, with no reordering delay.
  - See the [comparison of start positions and modes](./modes-comparison.md) for how every
    start-from mode, delivery order and consumption mode combine.
- **Order by** uses Pulsar timestamps: publish time is added automatically by the producer, broker
  publish time is broker entry metadata recorded when a message arrives, and event time is an
  optional timestamp set by the application. Missing broker publish time or event time falls back
  to publish time and is reported.
- Filter messages using user-friendly basic, or advanced JavaScript filters
- Search for specific value in loaded messages
- Map specific message field to the search results table column
- Apply colorization rules
- Consume compacted topics
- Start consuming at specific date-time, from specific message id, or from latest `n` messages
- Export loaded messages
- Save consumer sessions in library for further reuse
- Quick access to consumer sessions saved in context of a topic, namespace, or tenant

## Limitations

The amount of messages that can be processed during the consumer session is unlimited, but the amount of messages that are loaded and displayed in the user-faced UI at once has limits.

By default this limit equals to `10,000` messages. Depending on the average message size, you can configure this number for specific topic.

Operations that user can perform on the loaded data (e.g. sorting, export, or search in found) are limited to these messages.

We're looking for the best way to get rid of this limitation.

### Pausing loses nothing only on persistent topics

Pausing closes the session's intake and hands back the messages it had already prefetched, so on a
persistent topic the broker redelivers them and the session picks up where it stopped. A
non-persistent topic stores nothing, so there is nothing for the broker to redeliver: whatever is
published while the session is paused - including the messages it had already prefetched and handed
back - is gone, and resuming shows only what is published from then on. A paused session says so on
screen whenever it reads such topics.

### A session affects retention while it exists

Dekaf browses through its own non-durable subscription, so the broker holds a live cursor at the
position the session has read up to, and a topic's data cannot be reclaimed ahead of that cursor.
An open session therefore delays ledger deletion and storage reclamation on the topics it reads
whenever its cursor sits behind data the broker would otherwise be free to drop - and it keeps
doing so for as long as the session stays open. The window is longest where you would expect: a
session that is paused - including one auto-paused at its **Guaranteed** replay boundary - or that
started from an old position holds its cursor where it is until it moves on.

Other consumers are not affected: every other subscription keeps its own cursor and backlog, and no
topic or subscription policy is changed. Stopping or deleting the session removes its subscription,
and the cursor with it. A session nobody is watching any more - a closed tab whose cleanup never
reached the server - is stopped automatically after 1 hour without a live stream, which is the
longest an abandoned session can hold a cursor.
