package harness

import org.scalatest.funsuite.AnyFunSuite

import java.nio.file.{Files, Path, Paths}
import scala.jdk.CollectionConverters.*

/** The README's countable claims about this suite, checked against the suite.
  *
  * `e2e/README.md` is the catalog, and several of its statements are facts about the source rather
  * than prose: how many tests are `ignore`d, how many are `pending`, how many carry the `KnownBug`
  * tag, how many `assume(...)` (and where), and how many tags `build.sbt` excludes from the green
  * lane. Every one of those is a way coverage can be dropped from `sbt test` WITHOUT the run going
  * red, so every one is pinned here against a machine-readable marker the README carries:
  *
  * {{{
  * <!-- suite-facts: ignored=0 pending=0 known-bug=0 assume=4 excluded-tags=1 -->
  * }}}
  *
  * The point is not to correct a sentence once but to make the numbers derivable, so the next edit
  * that adds a lane has to say so in the README or fail here. The lanes and why each hides coverage:
  *
  *   - `ignore(...)` - a test that never runs and reports neither pass nor fail;
  *   - `pending` / `pendingUntilFixed` - reported yellow, i.e. neither passed nor failed;
  *   - `test("name", KnownBug)` (or `taggedAs KnownBug`) - excluded from `sbt test` by build.sbt.
  *     `known-bug=0` is also the standing rule that the bug lane stays EMPTY: the tag exists for a bug
  *     that is genuinely open, and tagging a red test to get a run green is the misuse it invites;
  *   - `assume(...)` - RUNTIME-cancels the test when its predicate is false, so on the wrong stack it
  *     just vanishes from the run, neither failing nor reported as ignored. Legitimate for the two
  *     topic-policy specs, which adapt to the broker's `topicLevelPoliciesEnabled` and therefore
  *     always cancel one branch - but ONLY there, which is why both the count and the location are
  *     pinned;
  *   - a second `-l <tag>` exclusion in build.sbt - drops a whole tag from `sbt test` the same way
  *     KnownBug is dropped, without any test looking ignored or tagged.
  *
  * This spec's OWN source is excluded from the scan: it holds every pattern below as a string
  * literal (e.g. the bare word `pending`), so scanning it would count the patterns themselves. It
  * declares no lane of its own, so nothing is lost by skipping it.
  */
class SuiteFactsSpec extends AnyFunSuite:

  private val e2eRoot: Path =
    Seq(Paths.get("."), Paths.get("e2e"))
      .find(p => Files.isRegularFile(p.resolve("README.md")) && Files.isDirectory(p.resolve("src/test/scala")))
      .getOrElse(fail(s"cannot locate the e2e project from ${Paths.get("").toAbsolutePath}"))

  /** Drop comment lines from a source file: this spec's prose - and the README-quoting comments in
    * the specs - would otherwise count as occurrences and a check could never fail for the real
    * reason. */
  private def stripComments(source: String): String =
    source.linesIterator
      .filterNot(line => { val t = line.trim; t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") })
      .mkString("\n")

  /** Every spec source except THIS one, with comment lines dropped. See the class doc for why this
    * file is excluded. */
  private lazy val specs: List[(Path, String)] =
    val root = e2eRoot.resolve("src/test/scala")
    Files.walk(root).iterator().asScala
      .filter(p => Files.isRegularFile(p) && p.toString.endsWith(".scala"))
      .filterNot(_.getFileName.toString == "SuiteFactsSpec.scala")
      .toList.sortBy(_.toString)
      .map(p => p -> stripComments(Files.readString(p)))

  private lazy val readme: String = Files.readString(e2eRoot.resolve("README.md"))

  /** The declared counts, parsed out of the README's marker. */
  private lazy val declared: Map[String, Int] =
    val body = """<!--\s*suite-facts:([^>]*)-->""".r.findFirstMatchIn(readme).map(_.group(1)).getOrElse(
      fail("e2e/README.md has no `<!-- suite-facts: ... -->` marker - see §3")
    )
    """(\S+)=(\d+)""".r.findAllMatchIn(body).map(m => m.group(1) -> m.group(2).toInt).toMap

  private def countIn(pattern: String): List[(Path, Int)] =
    val re = pattern.r
    specs.map((path, code) => path -> re.findAllMatchIn(code).size).filter(_._2 > 0)

  private def total(counts: List[(Path, Int)]): Int = counts.map(_._2).sum

  private def declaredEquals(key: String, counts: List[(Path, Int)], noun: String): Unit =
    assert(
      declared.get(key).contains(total(counts)),
      s"e2e/README.md declares $key=${declared.get(key)} but the suite has ${total(counts)} $noun" +
        s"${if counts.isEmpty then "" else s" in ${counts.map(_._1)}"}. Update BOTH the marker in §3 and " +
        "the prose in §3/§6 - a change in this count is a change in what coverage a reader can rely on."
    )

  test("FACTS-1: the README's `ignored` count is the number of ignored tests") {
    // Bare `ignore(` only: a ScalaTest ignored test is called as a statement, so anything reached
    // through a receiver (`x.ignore(...)`) is a different method and not what the README counts.
    declaredEquals("ignored", countIn("""(^|[^A-Za-z0-9_.`"])ignore\s*\("""), "ignored test(s)")
  }

  test("FACTS-2: the README's `known-bug` count is the number of tagged tests, and the lane is EMPTY") {
    // Both ways ScalaTest can carry a tag: the FunSuite tag argument this suite uses,
    // `test("name", KnownBug) { ... }`, and the `taggedAs` form the other styles use - the latter
    // with OR without parentheses (`taggedAs KnownBug` is a legal infix call), because either would
    // take a test out of the green lane. Matching the usage rather than the bare identifier keeps an
    // `import harness.KnownBug` from counting as a test.
    val counts =
      countIn("""(?s)\btest\s*\(\s*"(?:[^"\\]|\\.)*"\s*,\s*KnownBug""") ++ countIn("""taggedAs\s*\(?\s*KnownBug""")
    declaredEquals("known-bug", counts, "tagged test(s)")
    assert(
      total(counts) == 0,
      s"the KnownBug lane is meant to be empty - a tag is for a bug that is genuinely OPEN, never a way to " +
        s"take a red test out of the green run. Tagged: ${counts.map(_._1)}"
    )
  }

  test("FACTS-3: nothing in the suite is `pending`") {
    // A `pending` (or `pendingUntilFixed`) test is reported neither passed nor failed - yellow, not
    // red - so it removes coverage as surely as an ignored one while a `sbt test` run still goes
    // green. The README owns that count.
    declaredEquals("pending", countIn("""\bpending(?:UntilFixed)?\b"""), "`pending` marker(s)")
  }

  /** The only specs allowed to carry an `assume(...)`. Both adapt to whether the broker has
    * `topicLevelPoliciesEnabled`, so exactly one branch runs per stack and the other runtime-cancels
    * - legitimate config-gated coverage, but cancellation all the same, so it lives here and nowhere
    * else. */
  private val assumeAllowedFiles = Set("TopicPolicySpec.scala", "TopicPolicyBreadthSpec.scala")

  test("FACTS-4: `assume(...)` cancellation is confined to the known policy specs and counted") {
    // Bare `assume(` (statement form), guarded against a receiver call the same way `ignore` is.
    val counts = countIn("""(^|[^A-Za-z0-9_.`"])assume\s*\(""")
    val stray = counts.filterNot((path, _) => assumeAllowedFiles.contains(path.getFileName.toString))
    assert(
      stray.isEmpty,
      s"`assume(...)` outside the known policy specs $assumeAllowedFiles: ${stray.map(_._1)}. assume " +
        "RUNTIME-cancels a test - on the wrong broker config it vanishes from the run, neither failing " +
        "nor reported as ignored. If this is deliberate it belongs beside a documented config axis (like " +
        "topicLevelPoliciesEnabled), not as a way to quiet a red test."
    )
    declaredEquals("assume", counts, "`assume(...)` call(s)")
  }

  test("FACTS-5: build.sbt excludes exactly the KnownBug tag from the green lane, nothing else") {
    // A `-l <tag>` in build.sbt drops that whole tag from `sbt test`. Exactly one is expected
    // (KnownBug); a second is a way to remove tests from the green run without ignoring or tagging
    // them - the very lane this census closes.
    val code = stripComments(Files.readString(e2eRoot.resolve("build.sbt")))
    val excluded = "\"-l\"\\s*,\\s*\"([^\"]+)\"".r.findAllMatchIn(code).map(_.group(1)).toList
    assert(
      declared.get("excluded-tags").contains(excluded.size),
      s"e2e/README.md declares excluded-tags=${declared.get("excluded-tags")} but build.sbt has " +
        s"${excluded.size} `-l <tag>` exclusion(s): $excluded. Update the marker in §3."
    )
    assert(
      excluded.toSet == Set("KnownBug"),
      s"build.sbt's green lane excludes $excluded; only KnownBug may be excluded from `sbt test`."
    )
  }
