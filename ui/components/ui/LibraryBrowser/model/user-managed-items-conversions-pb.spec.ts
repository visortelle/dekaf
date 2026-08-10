import { managedDateTimeSpecFromPb, managedDateTimeSpecToPb } from "./user-managed-items-conversions-pb";

/**
 * A saved DateTime and the session request built from it must agree. The picker is second-granular,
 * but a Date still carries millis, and `startFromToPb`'s dateTime case floors to whole epoch seconds
 * (`Math.floor(getTime() / 1000)`). If the at-rest value keeps those millis - as `Timestamp.fromDate`
 * would, stashing them in `nanos` - then loading a saved item and starting a session lands earlier
 * than the value on disk, and save-then-load is not a fixed point.
 */
describe("a saved managed DateTime is stored at whole-second granularity", () => {
  it("drops the sub-second part the session request would drop anyway", () => {
    const withMillis = new Date(1_700_000_000_123); // 123 ms past the whole second
    const loaded = managedDateTimeSpecFromPb(managedDateTimeSpecToPb({ dateTime: withMillis }));

    // Equal to what startFromToPb would send for the same Date - the whole second, no millis.
    expect(loaded.dateTime.getTime()).toBe(1_700_000_000_000);
    expect(loaded.dateTime.getMilliseconds()).toBe(0);
  });

  it("writes no nanos, so the timestamp is second-exact on the wire", () => {
    const savedPb = managedDateTimeSpecToPb({ dateTime: new Date(1_700_000_000_999) });

    expect(savedPb.getDateTime()!.getSeconds()).toBe(1_700_000_000);
    // `Timestamp.fromDate` would stash the 999 ms here as 999_000_000 nanos - the richer at-rest
    // value the session then throws away.
    expect(savedPb.getDateTime()!.getNanos()).toBe(0);
  });
});

/**
 * The delivery-order choice must survive save -> load through the MANAGED-LIBRARY protobuf, not
 * just the runtime session request. It used to exist only in the TypeScript spec type, so Play
 * honoured it while a saved and reopened session silently fell back to independent - the setting
 * looked sticky right up until the page reloaded.
 */
describe("a saved consumer-session config keeps its delivery order", () => {
  const { managedConsumerSessionConfigSpecFromPb, managedConsumerSessionConfigSpecToPb } =
    require("./user-managed-items-conversions-pb");
  const { getDefaultManagedItem } = require("../default-library-items");

  const libraryContext = {
    pulsarResource: {
      type: 'topic',
      tenant: 'public',
      namespace: 'default',
      topicPersistency: 'persistent',
      topic: 'a-topic',
    },
  };

  const defaultSpec = () => getDefaultManagedItem('consumer-session-config', libraryContext).spec;

  // Owner decision (2026-08-09, direct instruction): the default is Best effort - supersedes the
  // review-findings P1.1 note that said Guaranteed.
  it("writes the new managed-item default as best-effort order", () => {
    const saved = managedConsumerSessionConfigSpecToPb(defaultSpec());
    const loaded = managedConsumerSessionConfigSpecFromPb(saved);
    expect(saved.getMessageDeliveryOrder()).toBe(
      require('../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb')
        .MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME
    );
    expect(loaded.messageDeliveryOrder).toBe('best-effort');
  });

  it("normalizes an older UNSPECIFIED field to the best-effort default", () => {
    const consumerPb = require('../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb');
    const saved = managedConsumerSessionConfigSpecToPb(defaultSpec());
    // Set the protobuf field itself to zero after building an otherwise-valid object. Going
    // through our writer here would canonicalize a missing JSON value to explicit BEST_EFFORT and
    // would not exercise the legacy wire value at all.
    saved.setMessageDeliveryOrder(
      consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED
    );
    const loaded = managedConsumerSessionConfigSpecFromPb(saved);
    expect(saved.getMessageDeliveryOrder()).toBe(
      consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED
    );
    expect(loaded.messageDeliveryOrder).toBe('best-effort');
  });

  it("loads an item SERIALIZED before the field existed - field absent in the bytes - as best-effort", () => {
    // The compatibility case that actually ships: BYTES written by a build with no field 8 at
    // all, not an in-memory object whose enum happens to read zero. Proto3 omits a zero enum, so
    // round-tripping through serializeBinary produces exactly those pre-field bytes.
    const jspb = require('google-protobuf');
    const managedPb = require('../../../../grpc-web/tools/teal/pulsar/ui/library/v1/managed_items_pb');
    const consumerPb = require('../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb');

    const written = managedConsumerSessionConfigSpecToPb(defaultSpec());
    written.setMessageDeliveryOrder(consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED);
    const preFieldBytes = written.serializeBinary();

    // Read the tags back off the bytes: "field 8 is absent" has to be a statement about the
    // ENCODING, not about a getter that happily synthesizes the proto3 zero.
    const reader = new jspb.BinaryReader(preFieldBytes);
    const encodedFields: number[] = [];
    while (reader.nextField() && !reader.isEndGroup()) {
      encodedFields.push(reader.getFieldNumber());
      reader.skipField();
    }
    expect(encodedFields.length).toBeGreaterThan(0);
    expect(encodedFields).not.toContain(8);

    const parsed = managedPb.ManagedConsumerSessionConfigSpec.deserializeBinary(preFieldBytes);
    expect(parsed.getMessageDeliveryOrder())
      .toBe(consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED);
    expect(managedConsumerSessionConfigSpecFromPb(parsed).messageDeliveryOrder).toBe('best-effort');
  });

  it("writes a missing older JSON value as the explicit best-effort default", () => {
    const legacy = { ...defaultSpec(), messageDeliveryOrder: undefined };
    const saved = managedConsumerSessionConfigSpecToPb(legacy);
    expect(saved.getMessageDeliveryOrder()).toBe(
      require('../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb')
        .MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME
    );
  });

  it("an explicit Best effort choice round-trips - it now coincides with the default, and stays explicit", () => {
    const spec = { ...defaultSpec(), messageDeliveryOrder: 'best-effort' };
    const saved = managedConsumerSessionConfigSpecToPb(spec);
    expect(saved.getMessageDeliveryOrder()).toBe(
      require('../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb')
        .MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME
    );
    expect(managedConsumerSessionConfigSpecFromPb(saved).messageDeliveryOrder).toBe('best-effort');
  });

  it("an explicit Fastest choice round-trips and stays distinct from the default", () => {
    const spec = { ...defaultSpec(), messageDeliveryOrder: 'as-received' };
    const loaded = managedConsumerSessionConfigSpecFromPb(managedConsumerSessionConfigSpecToPb(spec));
    expect(loaded.messageDeliveryOrder).toBe('as-received');
  });

  it("an explicit Guaranteed choice round-trips and is never replaced by the best-effort default", () => {
    const spec = { ...defaultSpec(), messageDeliveryOrder: 'guaranteed' };
    const saved = managedConsumerSessionConfigSpecToPb(spec);
    expect(saved.getMessageDeliveryOrder()).toBe(
      require('../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb')
        .MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED
    );
    expect(managedConsumerSessionConfigSpecFromPb(saved).messageDeliveryOrder).toBe('guaranteed');
  });

  it("the selected order time round-trips, and its absence stays absent", () => {
    const bare = managedConsumerSessionConfigSpecFromPb(managedConsumerSessionConfigSpecToPb(defaultSpec()));
    expect(bare.deliveryOrderKey).toBeUndefined();

    const withKey = { ...defaultSpec(), messageDeliveryOrder: 'guaranteed', deliveryOrderKey: 'broker-publish-time' };
    const loaded = managedConsumerSessionConfigSpecFromPb(managedConsumerSessionConfigSpecToPb(withKey));
    expect(loaded.deliveryOrderKey).toBe('broker-publish-time');

    const eventKey = { ...defaultSpec(), messageDeliveryOrder: 'best-effort', deliveryOrderKey: 'event-time' };
    expect(managedConsumerSessionConfigSpecFromPb(managedConsumerSessionConfigSpecToPb(eventKey)).deliveryOrderKey).toBe('event-time');
  });
});
