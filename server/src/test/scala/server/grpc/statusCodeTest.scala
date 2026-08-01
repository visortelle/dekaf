package server.grpc

import com.google.rpc.code.Code
import zio.test.*

/** The number that actually goes on the wire for a `google.rpc.Status`.
  *
  * `google/rpc/code.proto` DECLARES ITS ENUM OUT OF NUMERIC ORDER - `UNAUTHENTICATED = 16` sits
  * ninth, between `PERMISSION_DENIED = 7` and `RESOURCE_EXHAUSTED = 8`. ScalaPB's `.index` is the
  * DECLARATION POSITION and `.value` is the proto number, so the two agree only for the first eight
  * codes and diverge for every one after them:
  *
  * {{{
  *   position:  8 UNAUTHENTICATED(16)  9 RESOURCE_EXHAUSTED(8)  10 FAILED_PRECONDITION(9)  ...
  * }}}
  *
  * Sending `.index` therefore mislabels every status from `UNAUTHENTICATED` onwards - a
  * FAILED_PRECONDITION goes out as 10, which is ABORTED, and an INTERNAL goes out as 14, which is
  * UNAVAILABLE. It stayed invisible because clients that only ask "is this OK?" get the right answer
  * either way; it surfaces the moment one tests for a SPECIFIC non-OK code, as the Topic Positions
  * tab does when it distinguishes "the session has not been started" from a real fault.
  */
object statusCodeTest extends ZIOSpecDefault:

    def spec = suite("google.rpc.Status codes")(
        test("value is the PROTO NUMBER, which is what a client compares against") {
            assertTrue(Code.OK.value == 0) &&
            assertTrue(Code.INVALID_ARGUMENT.value == 3) &&
            assertTrue(Code.NOT_FOUND.value == 5) &&
            assertTrue(Code.FAILED_PRECONDITION.value == 9) &&
            assertTrue(Code.INTERNAL.value == 13) &&
            assertTrue(Code.UNAUTHENTICATED.value == 16)
        },
        test("index is the DECLARATION POSITION and DIVERGES past the first eight codes") {
            // This is the trap, written down. If a future ScalaPB or a re-ordered code.proto ever
            // makes these agree, this test fails and the warning above can be retired.
            assertTrue(Code.FAILED_PRECONDITION.index == 10) &&
            assertTrue(Code.FAILED_PRECONDITION.index != Code.FAILED_PRECONDITION.value) &&
            assertTrue(Code.INTERNAL.index != Code.INTERNAL.value) &&
            assertTrue(Code.UNAUTHENTICATED.index != Code.UNAUTHENTICATED.value) &&
            // ...and agree for the first eight, which is why `.index` looked correct for years.
            assertTrue(Code.OK.index == Code.OK.value) &&
            assertTrue(Code.INVALID_ARGUMENT.index == Code.INVALID_ARGUMENT.value)
        },
        test("no service builds a Status out of .index any more") {
            // The whole-tree guard: `.value` is correct for every code, `.index` only for the first
            // eight, so the safe rule is that `.index` never reaches a Status at all.
            import scala.jdk.CollectionConverters.*
            val sources = java.nio.file.Files
                .walk(java.nio.file.Paths.get("src/main/scala"))
                .iterator
                .asScala
                .filter(p => p.toString.endsWith(".scala"))
                .toVector

            val offenders = sources.flatMap { path =>
                java.nio.file.Files
                    .readAllLines(path)
                    .asScala
                    .zipWithIndex
                    .filter((line, _) => line.contains("Code.") && line.contains(".index"))
                    // A commented-out line is not code.
                    .filterNot((line, _) => line.trim.startsWith("//"))
                    .map((line, i) => s"${path.getFileName}:${i + 1}: ${line.trim}")
            }

            assertTrue(offenders.isEmpty) || assertTrue(offenders.mkString("\n").isEmpty)
        }
    )
