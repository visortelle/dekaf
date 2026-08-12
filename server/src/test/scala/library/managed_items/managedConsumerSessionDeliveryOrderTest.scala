package library.managed_items

import com.tools.teal.pulsar.ui.api.v1.consumer as apiPb
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import zio.test.*

/** The managed-library protobuf is a second compatibility boundary in addition to the runtime
  * session request. Proto3 represents an absent enum as zero, so both old binary items and old JSON
  * items must become the explicit current default when they cross this boundary.
  *
  * That default is GUARANTEED. Owner decision (2026-08-11, direct instruction) - the third move
  * of this default; the plan file's decision log is the record. A saved session that never named
  * a delivery order replays recorded history exactly and auto-pauses when caught up. Explicit
  * Best effort and explicit Fastest are choices and are preserved. */
object managedConsumerSessionDeliveryOrderTest extends ZIOSpecDefault:

    private val ref = "delivery-order-fixture"

    private def specWith(order: Option[apiPb.MessageDeliveryOrder]): ManagedConsumerSessionConfigSpec =
        ManagedConsumerSessionConfigSpec(
            startFrom = ManagedConsumerSessionStartFromValOrRef(value = None, reference = Some(ref)),
            targets = Vector.empty,
            messageFilterChain = ManagedMessageFilterChainValOrRef(value = None, reference = Some(ref)),
            pauseTriggerChain = ManagedConsumerSessionPauseTriggerChainValOrRef(value = None, reference = Some(ref)),
            coloringRuleChain = ManagedColoringRuleChainValOrRef(value = None, reference = Some(ref)),
            valueProjectionList = ManagedValueProjectionListValOrRef(value = None, reference = Some(ref)),
            numDisplayItems = None,
            messageDeliveryOrder = order,
            deliveryOrderKey = None
        )

    /** Which top-level fields the encoded item actually carries. A test that only sets an enum to
      * zero in memory proves nothing about a file written before the field existed; this reads the
      * tags back off the bytes, so "the field is absent" is a statement about the wire. */
    private def wireFieldNumbers(bytes: Array[Byte]): Set[Int] =
        val in      = com.google.protobuf.CodedInputStream.newInstance(bytes)
        val numbers = Set.newBuilder[Int]
        var tag     = in.readTag()
        while tag != 0 do
            // A protobuf tag is (fieldNumber << 3) | wireType.
            numbers += (tag >>> 3)
            in.skipField(tag)
            tag = in.readTag()
        numbers.result()

    /** Field 8 in `ManagedConsumerSessionConfigSpec`. */
    private val deliveryOrderFieldNumber = 8

    def spec = suite(this.getClass.toString)(
        test("an UNSPECIFIED saved value loads as Guaranteed, the default that also covers legacy items") {
            // Pre-existing saved sessions carry no delivery-order field at all. Zero is proto3
            // absence, and absence resolves to the product default - Guaranteed - never to an
            // ordering the saved session never chose. The base spec names explicit BEST EFFORT so
            // the expected result can only come from the UNSPECIFIED mapping, not the fixture.
            val otherwiseValid = ManagedConsumerSessionConfigSpec.toPb(
                specWith(Some(apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME))
            )
            val oldWireItem = otherwiseValid.copy(
                messageDeliveryOrder = apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED
            )

            assertTrue(
                ManagedConsumerSessionConfigSpec.fromPb(oldWireItem).messageDeliveryOrder.contains(
                    apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED
                )
            )
        },
        test("an item SERIALIZED before the field existed carries no delivery-order field and still loads as Guaranteed, the default") {
            // The compatibility case that matters: BYTES on disk, written by a build that had no
            // field 8 at all - not an in-memory model with the enum set to zero.
            val preFieldBytes = ManagedConsumerSessionConfigSpec
                .toPb(specWith(Some(apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME)))
                .copy(messageDeliveryOrder = apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED)
                .toByteArray

            val parsed = pb.ManagedConsumerSessionConfigSpec.parseFrom(preFieldBytes)
            val loaded = ManagedConsumerSessionConfigSpec.fromPb(parsed)

            assertTrue(
                !wireFieldNumbers(preFieldBytes).contains(deliveryOrderFieldNumber),
                parsed.messageDeliveryOrder == apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED,
                loaded.messageDeliveryOrder.contains(apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED)
            ) ?? s"wireFields=${wireFieldNumbers(preFieldBytes)} loaded=${loaded.messageDeliveryOrder}"
        },
        test("a spec built without naming a delivery order carries Guaranteed, not an absent value") {
            // The case-class default itself: every in-process construction that predates the field
            // (and every future one that ignores it) has to land on the same product default.
            val builtWithoutTheField = ManagedConsumerSessionConfigSpec(
                startFrom = ManagedConsumerSessionStartFromValOrRef(value = None, reference = Some(ref)),
                targets = Vector.empty,
                messageFilterChain = ManagedMessageFilterChainValOrRef(value = None, reference = Some(ref)),
                pauseTriggerChain = ManagedConsumerSessionPauseTriggerChainValOrRef(value = None, reference = Some(ref)),
                coloringRuleChain = ManagedColoringRuleChainValOrRef(value = None, reference = Some(ref)),
                valueProjectionList = ManagedValueProjectionListValOrRef(value = None, reference = Some(ref)),
                numDisplayItems = None
            )

            assertTrue(
                builtWithoutTheField.messageDeliveryOrder.contains(
                    apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED
                )
            ) ?? s"messageDeliveryOrder=${builtWithoutTheField.messageDeliveryOrder}"
        },
        test("a missing older JSON value is written back as explicit Guaranteed, the default") {
            val saved = ManagedConsumerSessionConfigSpec.toPb(specWith(None))

            assertTrue(
                saved.messageDeliveryOrder == apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED
            )
        },
        test("an unrecognized future mode falls back to the Guaranteed default, never to Fastest") {
            val saved = ManagedConsumerSessionConfigSpec.toPb(
                specWith(Some(apiPb.MessageDeliveryOrder.Unrecognized(99)))
            )

            assertTrue(
                saved.messageDeliveryOrder == apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED
            )
        },
        test("an explicit Best effort choice round-trips and is never replaced by the Guaranteed default") {
            val saved  = ManagedConsumerSessionConfigSpec.toPb(
                specWith(Some(apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME))
            )
            val loaded = ManagedConsumerSessionConfigSpec.fromPb(saved)

            assertTrue(
                saved.messageDeliveryOrder == apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME,
                loaded.messageDeliveryOrder.contains(apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME)
            )
        },
        test("an explicit Guaranteed choice round-trips - it now coincides with the default, and stays explicit") {
            val saved = ManagedConsumerSessionConfigSpec.toPb(
                specWith(Some(apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED))
            )
            val loaded = ManagedConsumerSessionConfigSpec.fromPb(saved)

            assertTrue(
                saved.messageDeliveryOrder == apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED,
                loaded.messageDeliveryOrder.contains(apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED)
            )
        },
        test("an explicit Fastest choice is preserved, not replaced by the Best effort default") {
            val saved = ManagedConsumerSessionConfigSpec.toPb(
                specWith(Some(apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_AS_RECEIVED))
            )
            val loaded = ManagedConsumerSessionConfigSpec.fromPb(saved)

            assertTrue(
                saved.messageDeliveryOrder == apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_AS_RECEIVED,
                loaded.messageDeliveryOrder.contains(apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_AS_RECEIVED)
            )
        }
    )
