package consumer.session_runner

import consumer.session_config.MessageDeliveryOrder

/** What a request to change a LIVE session's delivery order resolves to.
  *
  * Split out as a pure decision so the whole matrix - which direction is honoured, which is
  * refused and with what reason - is pinned by test without a session, a broker or an RPC, and so
  * the service and the runner cannot disagree about it.
  */
enum DeliveryOrderSwitch:
    /** The session already delivers in the requested order. A no-op, answered OK: a repeated
      * click, or two clients asking for the same thing, must not become an error. */
    case AlreadyThere

    /** Guaranteed -> Best effort on a live session: the one transition that is honestly
      * deliverable mid-stream. */
    case RelaxToBestEffort

    /** Refused, with the reason the client is shown. */
    case Refused(reason: String)

/** Decide what a live delivery-order change means.
  *
  * ONLY ONE TRANSITION IS HONOURED: Guaranteed -> Best effort. That is the whole point of the
  * operation - Guaranteed (the product default since 2026-08-11) can wait forever on a stream
  * whose recorded range cannot be delivered (trimmed by retention, or seeked past the end), so
  * the disclosed stall needs an action that does not throw the session away.
  *
  * WHY THE OTHER DIRECTIONS ARE REFUSED RATHER THAN FAKED:
  *
  *   - ANYTHING -> GUARANTEED is a promotion, and Guaranteed is strictly stronger: it promises
  *     that Dekaf introduced no cross-stream disorder into what the user has seen. A session that
  *     has been running under Best effort has already emitted heads past streams that were silent,
  *     and no future behaviour can un-emit them - the promise would be false for this session's
  *     output the moment it was made. Honouring the request would therefore be a lie about
  *     messages already on screen, so it is refused and the client is told to restart the session
  *     to get the guarantee from the beginning.
  *
  *   - ANYTHING -> AS_RECEIVED (Fastest) is not a weaker ordering of the merged stream, it is the
  *     ABSENCE of the merge. The same merge object also resolves a counted start-from cut (skip
  *     first n is decided over the merged stream, not over any one log), so dismantling it while a
  *     cut is unresolved would silently change WHICH messages the cut selects - the exact failure
  *     mode that made recreating the session unacceptable in the first place. It also owns the
  *     per-stream flow control and the late-delivery accounting. Fastest therefore stays a
  *     configuration choice that takes effect on the next Play, and Best effort - which already
  *     has an unconditional liveness escape - is the live remedy.
  *
  * `current` is the order the session is delivering in RIGHT NOW, which after an earlier switch is
  * no longer the one its saved configuration names.
  */
def deliveryOrderSwitchFor(current: MessageDeliveryOrder, requested: MessageDeliveryOrder): DeliveryOrderSwitch =
    if current == requested then DeliveryOrderSwitch.AlreadyThere
    else
        (current, requested) match
            case (MessageDeliveryOrder.Guaranteed, MessageDeliveryOrder.BestEffort) =>
                DeliveryOrderSwitch.RelaxToBestEffort
            case (_, MessageDeliveryOrder.Guaranteed) =>
                DeliveryOrderSwitch.Refused(
                    "This session cannot be switched to Guaranteed ordering while it is running: it has already delivered " +
                        "messages without waiting for every stream, and that cannot be undone. Start the session again with " +
                        "Guaranteed selected."
                )
            case (_, MessageDeliveryOrder.AsReceived) =>
                DeliveryOrderSwitch.Refused(
                    "Fastest is not a weaker ordering, it is no ordering at all - the same layer also resolves a counted " +
                        "start-from position, so removing it mid-session could change which messages this session shows. " +
                        "Select Fastest in the session configuration; it takes effect the next time you press Play."
                )
            // Unreachable today - AsReceived and Guaranteed are matched above and equality is
            // matched first, so nothing else can arrive here - but stated rather than left to a
            // MatchError if a fourth mode is ever added.
            case _ =>
                DeliveryOrderSwitch.Refused(
                    s"Changing the delivery order from $current to $requested is not supported on a running session."
                )
