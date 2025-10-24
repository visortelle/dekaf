# Consume Messages

Dekaf allows you to explore Apache Pulsar topic data by using **consumer sessions**.

## Features

- Browse live stream data
- Consume multiple topics at once
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
