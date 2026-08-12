package harness

import features.consumersession.DeliveredMessages
import org.scalatest.funsuite.AnyFunSuite

/** The fact the pause/flow specs' "zero loss" claim rests on: that their ORACLE can tell a correct
  * delivery from a merely plausible one.
  *
  * `CsPauseLoopSpec` and `CsFlowControlSpec` used to conclude "nothing was lost, nothing was
  * duplicated" from the final message COUNT. This suite runs that count, and the exact-set
  * comparison that replaced it, over the SAME wrong data - a stream that lost one message and
  * delivered another twice - and shows the count accepting it. That is the whole content of the
  * finding, made executable and permanent: the browser-driven specs cannot demonstrate it (they
  * would have to be fed a broken server), and without it a future edit could quietly relax the set
  * assertion back to a count and nothing would go red.
  *
  * Pure - no browser, no broker, no Dekaf. It runs in the same lane as everything else.
  */
class DeliveredMessagesSpec extends AnyFunSuite:

  /** A well-behaved 5,000-message delivery: every produced value, exactly once. */
  private val produced: Vector[String] = (1 to 5000).map(i => s"bk-$i").toVector

  /** The same delivery with ONE message never delivered and ONE delivered twice. The size is
    * unchanged - that is the point. */
  private val lostOneDuplicatedOne: Vector[String] =
    produced.filterNot(_ == "bk-17").appended("bk-4242")

  test("SET-1: the exact-set oracle accepts a correct delivery, in any order") {
    assert(DeliveredMessages.difference(produced, produced).isEmpty)
    // Order is deliberately not part of the contract - a message refused at a closed pause gate is
    // nacked and can come back behind a newer one - so a shuffle must still pass.
    assert(DeliveredMessages.difference(scala.util.Random.shuffle(produced), produced).isEmpty)
  }

  test("SET-2: THE DEFECT - a count accepts one loss plus one duplicate; the exact set does not") {
    // Both halves of the same arrangement, on one line each, because their disagreement IS the
    // finding: the count is blind here, and blindness is exactly what let the branch's original
    // delivery bug survive its own regression test.
    assert(
      lostOneDuplicatedOne.size == produced.size,
      "arrangement error: the wrong delivery must have the same SIZE as the right one, or the " +
        "count would catch it and there would be nothing to demonstrate"
    )
    val text = DeliveredMessages.difference(lostOneDuplicatedOne, produced).getOrElse(
      fail("the exact-set oracle accepted a delivery that lost bk-17 and repeated bk-4242")
    )
    // And it must say WHICH IS WHICH on the right line: a report that only says "not equal" over
    // 5,000 values is not usable, and the two failures have unrelated causes (a message the closed
    // gate dropped vs. a redelivery shown a second time).
    def line(classification: String): String =
      text.linesIterator.find(_.contains(classification)).getOrElse(fail(s"no $classification line in:\n$text"))
    assert(line("MISSING").contains("bk-17"), s"the lost message is not reported as missing: $text")
    assert(line("DUPLICATED").contains("bk-4242"), s"the repeated message is not reported as duplicated: $text")
  }

  test("SET-3: a message from the WRONG stream is reported as foreign, not as a duplicate") {
    // The cut-and-merge specs assert which messages survived, across topics whose payloads now
    // carry distinct prefixes for this reason: a message delivered from the stream that should
    // have been dropped entirely is a different defect from a repeat, and reads differently.
    val fromTheOtherTopic = produced.filterNot(_ == "bk-17").appended("b-17")
    val text = DeliveredMessages.difference(fromTheOtherTopic, produced).getOrElse(
      fail("a message from another topic passed the exact-set oracle")
    )
    assert(text.contains("FOREIGN"), s"the report does not classify the stray message: $text")
    assert(!text.contains("DUPLICATED"), s"a stray message is not a duplicate: $text")
  }

  test("SET-4: the failure report stays bounded when everything is wrong") {
    // 55,000 mismatches must not print 55,000 lines - an unreadable report is a report nobody
    // reads, and this oracle exists for sets that big.
    val nothingInCommon = (1 to 55000).map(i => s"other-$i")
    val text = DeliveredMessages.difference(nothingInCommon, produced).getOrElse(fail("disjoint sets compared equal"))
    assert(text.linesIterator.size <= 6, s"the report is unbounded:\n$text")
    assert(text.contains("delivered 55000 message(s), expected 5000"), s"the report does not state the sizes: $text")
    assert(text.contains("more)"), s"the report does not say how much it elided: $text")
  }
