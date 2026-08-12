import { partialMessageDescriptorToSerializable, startFromFromPb, startFromToPb } from "./conversions";
import { ConsumerSessionStartFrom, PartialMessageDescriptor } from "../types";
import * as managedPb from "../../../../grpc-web/tools/teal/pulsar/ui/library/v1/managed_items_pb";
import {
  managedConsumerSessionStartFromFromPb,
  managedConsumerSessionStartFromToPb,
} from "../../LibraryBrowser/model/user-managed-items-conversions-pb";
import { consumerSessionStartFromFromValOrRef } from "../../LibraryBrowser/model/resolved-items-conversions";
import { relativeDateTimeValueMax } from "../../RelativeDateTimePicker/relative-date-time";

describe("partialMessageDescriptorToSerializable", () => {
  const testData: {
    message: PartialMessageDescriptor;
    expectedObj: any;
  }[] = [
      {
        message: {
          key: null,
          sessionContextStateJson: null,
          brokerPublishTime: null,
          rawValue: null,
          eventTime: null,
          displayIndex: 0,
          isReplicated: null,
          messageId: null,
          orderingKey: null,
          producerName: null,
          publishTime: null,
          redeliveryCount: null,
          properties: {},
          replicatedFrom: null,
          schemaVersion: null,
          sequenceId: null,
          size: null,
          topic: null,
          value: null,
        },
        expectedObj: {
          key: null,
          brokerPublishTime: null,
          rawValue: null,
          eventTime: null,
          index: 0,
          isReplicated: null,
          messageId: null,
          orderingKey: null,
          producerName: null,
          publishTime: null,
          redeliveryCount: null,
          properties: {},
          replicatedFrom: null,
          schemaVersion: null,
          sequenceId: null,
          size: null,
          topic: null,
        },
      },
      {
        message: {
          key: "key1",
          sessionContextStateJson: JSON.stringify({ a: 1, b: { c: 3 } }),
          brokerPublishTime: 123,
          rawValue: Uint8Array.from([1, 2, 3]),
          eventTime: 123,
          displayIndex: 5,
          isReplicated: true,
          messageId: Uint8Array.from([1, 2, 3]),
          orderingKey: Uint8Array.from([1, 2, 3]),
          producerName: "producer",
          publishTime: 123,
          redeliveryCount: 1,
          properties: { a: "A", b: "B" },
          replicatedFrom: "cluster",
          schemaVersion: 1,
          sequenceId: 1,
          size: 100,
          topic: "topic1",
          value: JSON.stringify({ a: 2, b: { c: 4 } }),
        },
        expectedObj: {
          key: "key1",
          sessionContextStateJson: { a: 1, b: { c: 3 } },
          brokerPublishTime: 123,
          rawValue: [1, 2, 3],
          eventTime: 123,
          index: 5,
          isReplicated: true,
          messageId: [1, 2, 3],
          orderingKey: [1, 2, 3],
          producerName: "producer",
          publishTime: 123,
          redeliveryCount: 1,
          properties: { a: "A", b: "B" },
          replicatedFrom: "cluster",
          schemaVersion: 1,
          sequenceId: 1,
          size: 100,
          topic: "topic1",
          value: { a: 2, b: { c: 4 } },
        },
      },
      {
        message: {
          displayIndex: 1,
        },
        expectedObj: { index: 1 },
      },
    ];

  it.each(testData)(
    "encodes MessageDescriptor to JSON",
    ({ message, expectedObj }) => {
      const gotObj = partialMessageDescriptorToSerializable(message);
      expect(gotObj).toEqual(expectedObj);
    }
  );
});

describe("startFrom wire mapping", () => {
  // startFromToPb wrote nthMessageAfterEarliest/nthMessageBeforeLatest while startFromFromPb had no
  // case for them, so the mapping was one-way: saving a "skip first n" session worked and loading it
  // back threw "Unknown StartFrom value case". Per-mode tests are what let that survive - a mode with
  // no test simply has no failing test. So this is keyed by the union's own `type`, which makes
  // TypeScript refuse to compile the file if a new mode is added without a fixture here.
  const fixtures: Record<ConsumerSessionStartFrom["type"], ConsumerSessionStartFrom> = {
    earliestMessage: { type: "earliestMessage" },
    latestMessage: { type: "latestMessage" },
    nthMessageAfterEarliest: { type: "nthMessageAfterEarliest", n: 42 },
    nthMessageBeforeLatest: { type: "nthMessageBeforeLatest", n: 7 },
    // The two approximate modes carry the SAME payload, so the round trip CANNOT tell a SYMMETRIC
    // oneof swap - both directions consistently reaching for the wrong case - from a correct
    // mapping: fromPb(toPb(x)) still equals x while a stored item would flip modes on load. The
    // asymmetric pin below ("write their own oneof field") is what actually catches that, by
    // checking the raw pb one direction only.
    approximateEntryPosition: { type: "approximateEntryPosition", fraction: 0.6 },
    approximatePublishTimePosition: { type: "approximatePublishTimePosition", fraction: 0.6 },
    messageId: { type: "messageId", hexString: "a1 b2 c3" },
    // Whole seconds only: startFromToPb floors to epoch seconds, so sub-second input cannot survive.
    dateTime: { type: "dateTime", dateTime: new Date(1_700_000_000_000) },
    relativeDateTime: {
      type: "relativeDateTime",
      relativeDateTime: { unit: "hour", value: 3, isRoundedToUnitStart: true },
    },
  };

  it.each(Object.entries(fixtures))("round-trips %s through protobuf", (_type, startFrom) => {
    expect(startFromFromPb(startFromToPb(startFrom))).toEqual(startFrom);
  });

  it("preserves n rather than defaulting it to zero", () => {
    // n rides a wrapper message, so a branch that returned the right `type` with a dropped payload
    // would still satisfy a test that only checked the discriminant.
    const skip = startFromFromPb(startFromToPb({ type: "nthMessageAfterEarliest", n: 1234 }));
    const latest = startFromFromPb(startFromToPb({ type: "nthMessageBeforeLatest", n: 5678 }));
    expect(skip).toEqual({ type: "nthMessageAfterEarliest", n: 1234 });
    expect(latest).toEqual({ type: "nthMessageBeforeLatest", n: 5678 });
  });

  it("round-trips n = 0, which is also the protobuf int default", () => {
    expect(startFromFromPb(startFromToPb({ type: "nthMessageAfterEarliest", n: 0 })))
      .toEqual({ type: "nthMessageAfterEarliest", n: 0 });
    expect(startFromFromPb(startFromToPb({ type: "nthMessageBeforeLatest", n: 0 })))
      .toEqual({ type: "nthMessageBeforeLatest", n: 0 });
  });

  // The round trip above is blind to a symmetric oneof swap between the two approximate modes: they
  // carry the same one-double payload, so a startFromToPb that wrote the wrong case AND a
  // startFromFromPb that read the same wrong case would round-trip cleanly while silently flipping
  // the mode of every stored item on load. Pin the WRITE side against the raw protobuf, one
  // direction, so such a swap in startFromToPb cannot hide behind a matching read.
  describe("the approximate modes write their own oneof field", () => {
    it("sets the entry-position case for approximateEntryPosition, and only it", () => {
      const pbValue = startFromToPb({ type: "approximateEntryPosition", fraction: 0.6 });
      expect(pbValue.hasStartFromApproximateEntryPosition()).toBe(true);
      expect(pbValue.hasStartFromApproximatePublishTimePosition()).toBe(false);
      expect(pbValue.getStartFromApproximateEntryPosition()!.getFraction()).toBe(0.6);
    });

    it("sets the publish-time-position case for approximatePublishTimePosition, and only it", () => {
      const pbValue = startFromToPb({ type: "approximatePublishTimePosition", fraction: 0.6 });
      expect(pbValue.hasStartFromApproximatePublishTimePosition()).toBe(true);
      expect(pbValue.hasStartFromApproximateEntryPosition()).toBe(false);
      expect(pbValue.getStartFromApproximatePublishTimePosition()!.getFraction()).toBe(0.6);
    });
  });
});

/**
 * A relative start position that was SAVED, not typed.
 *
 * The picker refuses anything the model cannot carry, so no in-memory fixture built through the UI
 * can hold a bad value - but the library can. Its `ManagedRelativeDateTimeSpec.value` is an int64
 * while the request's `RelativeDateTime.value` is an int32, and older builds wrote whatever they
 * were given. So these cases are built as bytes and loaded back the way a stored item actually
 * arrives, which is the only shape that can represent the defect at all.
 */
describe("a relative start position loaded from the library", () => {
  const savedRelativeStartFrom = (value: number): ConsumerSessionStartFrom => {
    const savedPb = managedConsumerSessionStartFromToPb({
      metadata: { type: "consumer-session-start-from", id: "sf-1", name: "Saved", descriptionMarkdown: "" },
      spec: {
        startFrom: {
          type: "relativeDateTime",
          relativeDateTime: {
            type: "value",
            val: {
              metadata: { type: "relative-date-time", id: "rel-1", name: "Saved", descriptionMarkdown: "" },
              spec: { unit: "hour", value: 1, isRoundedToUnitStart: false },
            },
          },
        },
      },
    });

    // The number as stored. The field is an int64, so every one of these genuinely survives a save
    // and comes back on load.
    savedPb.getSpec()!.getStartFromRelativeDateTime()!.getVal()!.getSpec()!.setValue(value);

    // Bytes in, model out - exactly how a library item reaches the session.
    const restored = managedPb.ManagedConsumerSessionStartFrom.deserializeBinary(savedPb.serializeBinary());
    return consumerSessionStartFromFromValOrRef({
      type: "value",
      val: managedConsumerSessionStartFromFromPb(restored),
    });
  };

  it.each([
    // Subtracting a negative is an instant in the FUTURE, under a label that reads "ago". It
    // serializes cleanly, so nothing downstream ever questions it.
    ["a negative value", -1],
    // Past int32 the generated serializer fails an internal assertion while the request is being
    // written - Play dies with a message about protobuf internals, on a session the user cannot
    // see anything wrong with.
    ["a value the request field cannot carry", relativeDateTimeValueMax + 1],
  ])("is refused with an actionable message when it is %s", (_case, value) => {
    const startFrom = savedRelativeStartFrom(value);

    expect(() => startFromToPb(startFrom)).toThrow(/relative start position/i);
    expect(() => startFromToPb(startFrom)).toThrow(String(value));
  });

  it.each([
    ["zero - a position the user can ask for on purpose", 0],
    ["the largest value the model carries", relativeDateTimeValueMax],
  ])("still starts a session from %s", (_case, value) => {
    const startFrom = savedRelativeStartFrom(value);

    const request = startFromToPb(startFrom);
    expect(request.getStartFromRelativeDateTime()!.getValue()).toBe(value);
    // ...and the request survives the write. A value the field cannot hold fails HERE, deep inside
    // generated code, which is why it has to be refused before it gets this far.
    expect(() => request.serializeBinary()).not.toThrow();
  });

  // Fractions and NaN cannot ride an int64 field, so they cannot come back from the library - but
  // the same boundary is what stands between any other producer of this value and a request that
  // dies in the serializer, so it refuses them too.
  it.each([
    ["a fraction", 1.5],
    ["not a number", Number.NaN],
  ])("refuses %s at the same boundary", (_case, value) => {
    const startFrom: ConsumerSessionStartFrom = {
      type: "relativeDateTime",
      relativeDateTime: { unit: "hour", value, isRoundedToUnitStart: false },
    };

    expect(() => startFromToPb(startFrom)).toThrow(/relative start position/i);
  });
});
