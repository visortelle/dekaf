package harness

import org.scalatest.funsuite.AnyFunSuite

import java.nio.file.{Files, Path, Paths}
import scala.jdk.CollectionConverters.*

/** The shell scripts that bring the stack up and take it down - the one part of the harness that no
  * UI test can reach, because a test cannot run them without destroying the stack it is running on.
  *
  * Scoped tightly to what is testable in isolation: `scripts/fresh-data-dir.sh`, which exists so
  * that `run-dekaf.sh` and `stack-down.sh` agree on the throwaway `DEKAF_DATA_DIR` path - one per
  * STACK, derived from the same `DEKAF_PORT` / `PULSAR_CONTAINER_NAME` both ends already read.
  *
  * Why it needs pinning at all: `run-dekaf.sh` ends in `exec sbt run`, so the process that creates
  * the tree is replaced by the server, and CI then kills that whole process tree - no trap, atexit
  * or JVM shutdown hook in the server's own lifetime can ever fire. Cleanup therefore has to come
  * from OUTSIDE, from a step that knows the path without being told, and the previous `mktemp -d`
  * made that impossible: a fresh unguessable name every build, one abandoned tree per build, forever,
  * on a self-hosted runner nobody wipes.
  *
  * No `DekafSuite` here on purpose - these need no browser, no Pulsar and no Dekaf.
  */
class StackScriptsSpec extends AnyFunSuite:

  /** The scripts dir. sbt forks tests with the project base (`e2e/`) as the working directory; the
    * repo-root fallback keeps the spec runnable from an IDE that chose differently. */
  private val scripts: Path =
    Seq(Paths.get("scripts"), Paths.get("e2e/scripts"))
      .find(p => Files.isDirectory(p))
      .getOrElse(fail(s"cannot locate e2e/scripts from ${Paths.get("").toAbsolutePath}"))

  private def run(script: String, args: Seq[String], env: Map[String, String]): (Int, String) =
    val pb = new ProcessBuilder((Seq("bash", scripts.resolve(script).toString) ++ args).asJava)
    pb.redirectErrorStream(true)
    env.foreach((k, v) => pb.environment().put(k, v))
    val process = pb.start()
    val out = new String(process.getInputStream.readAllBytes(), "UTF-8")
    (process.waitFor(), out.trim)

  /** The environment of one stack: its runner temp plus the two variables that identify it. Both are
    * already read by the scripts on either end (`run-dekaf.sh` serves on `DEKAF_PORT`,
    * `stack-down.sh` removes `PULSAR_CONTAINER_NAME`), which is what lets startup and teardown agree
    * on a path without anything being passed between them. */
  private def stackEnv(runnerTemp: Path, dekafPort: String, container: String): Map[String, String] =
    Map("RUNNER_TEMP" -> runnerTemp.toString, "DEKAF_PORT" -> dekafPort, "PULSAR_CONTAINER_NAME" -> container)

  private def freshDataDirWith(env: Map[String, String]): String =
    val (code, out) = run("fresh-data-dir.sh", Seq("path"), env)
    assert(code == 0, s"fresh-data-dir.sh path exited $code: $out")
    out

  private def freshDataDir(runnerTemp: Path): String =
    freshDataDirWith(Map("RUNNER_TEMP" -> runnerTemp.toString))

  test("STACK-1: the fresh data dir is a DETERMINISTIC path under $RUNNER_TEMP") {
    val runnerTemp = Files.createTempDirectory("stack-1-runner-temp")
    try
      // Deterministic: asking twice gives the same answer. This is the whole property - `mktemp -d`
      // answered differently every time, which is what made the tree unfindable afterwards.
      val first = freshDataDir(runnerTemp)
      val second = freshDataDir(runnerTemp)
      assert(first == second, s"the path is not stable across invocations: $first then $second")

      // ... and it lives under the runner-scoped temp dir it was given, not somewhere of its own
      // choosing. A path that ignored RUNNER_TEMP would be stable AND still outlive the job.
      assert(
        first.startsWith(runnerTemp.toString + "/"),
        s"$first is not under the RUNNER_TEMP it was given ($runnerTemp)"
      )

      // A different runner temp really moves it - so the value is read, not merely mentioned.
      val elsewhere = Files.createTempDirectory("stack-1-other-runner-temp")
      try assert(freshDataDir(elsewhere) != first, s"the path ignores RUNNER_TEMP: $first for both $runnerTemp and $elsewhere")
      finally Files.deleteIfExists(elsewhere)
    finally Files.deleteIfExists(runnerTemp)
  }

  test("STACK-2: `clean` removes the data tree, and succeeds when there is nothing to remove") {
    val runnerTemp = Files.createTempDirectory("stack-2-runner-temp")
    try
      val dir = Paths.get(freshDataDir(runnerTemp))
      // Seed something shaped like what run-dekaf.sh puts there - nested, non-empty, so a `rmdir`
      // or a single-file delete would not be enough.
      Files.createDirectories(dir.resolve("library"))
      Files.createDirectories(dir.resolve("js/dist"))
      Files.writeString(dir.resolve("js/dist/libs.js"), "// seeded by STACK-2")
      assert(Files.isDirectory(dir), s"the fixture did not create $dir")

      val (code, out) = run("fresh-data-dir.sh", Seq("clean"), Map("RUNNER_TEMP" -> runnerTemp.toString))
      assert(code == 0, s"clean exited $code: $out")
      assert(!Files.exists(dir), s"$dir survived the clean: $out")

      // Teardown runs with `if: always()`, including on runs that never created the tree, so a
      // second clean must not fail the job.
      val (againCode, againOut) = run("fresh-data-dir.sh", Seq("clean"), Map("RUNNER_TEMP" -> runnerTemp.toString))
      assert(againCode == 0, s"a second clean exited $againCode: $againOut")
    finally Files.deleteIfExists(runnerTemp)
  }

  /** Recursive rm for this spec's fixtures - the trees it seeds are nested, and one half of STACK-4
    * is deliberately NOT removed by the script under test. */
  private def deleteTree(dir: Path): Unit =
    if Files.exists(dir) then
      Files.walk(dir).sorted(java.util.Comparator.reverseOrder()).iterator().asScala.foreach(Files.deleteIfExists)

  test("STACK-4: each stack gets its OWN tree, and tearing one down leaves the other's live data alone") {
    // The defect this pins: the path used to be one constant name per machine, while run-dekaf.sh
    // `rm -rf`s it at startup and stack-down.sh `rm -rf`s it at teardown. Two stacks side by side -
    // which is exactly how a second Dekaf is run against the same box - therefore destroyed each
    // other's LIVE data dir, and nothing in STACK-1/2 could notice: determinism and removal are both
    // still true of a path that every stack shares.
    val runnerTemp = Files.createTempDirectory("stack-4-runner-temp")
    try
      val a = stackEnv(runnerTemp, dekafPort = "8090", container = "dekaf-e2e-pulsar")
      // Differs from `a` only by PORT: two Dekafs against ONE Pulsar container is a real shape (this
      // repo runs one on :8090 and one on :8091), and it is the case a container-only identity misses.
      val bSamePulsar = stackEnv(runnerTemp, dekafPort = "8091", container = "dekaf-e2e-pulsar")
      // ... and differs only by CONTAINER, the case a port-only identity misses.
      val cSamePort = stackEnv(runnerTemp, dekafPort = "8090", container = "dekaf-e2e-pulsar-2")

      val stacks = List("a" -> a, "b(same pulsar, other port)" -> bSamePulsar, "c(same port, other pulsar)" -> cSamePort)
      val paths = stacks.map((name, env) => name -> freshDataDirWith(env))
      assert(
        paths.map(_._2).distinct.size == stacks.size,
        s"two distinct stacks resolved to the SAME data dir, so one would delete the other's live data: $paths"
      )
      // Still deterministic PER STACK - asking twice must agree, or teardown could not find the tree
      // startup made, which is the whole reason this script exists (STACK-1 checks the same property
      // for one stack; an identity built from a timestamp or a PID would pass that and fail here).
      stacks.zip(paths).foreach { case ((name, env), (_, path)) =>
        val again = freshDataDirWith(env)
        assert(again == path, s"stack $name's path is not stable across invocations: $path then $again")
      }

      // Now the real proof: two live trees, tear ONE down, and the other must survive byte for byte.
      val dirA = Paths.get(paths.head._2)
      val dirB = Paths.get(paths(1)._2)
      def seed(dir: Path, marker: String): Unit =
        Files.createDirectories(dir.resolve("library"))
        Files.writeString(dir.resolve("library/item.json"), marker)
      seed(dirA, "stack A's library item")
      seed(dirB, "stack B's library item")

      val (code, out) = run("fresh-data-dir.sh", Seq("clean"), a)
      assert(code == 0, s"clean exited $code: $out")
      assert(!Files.exists(dirA), s"stack A's own tree survived its own teardown: $out")
      assert(Files.isRegularFile(dirB.resolve("library/item.json")), s"tearing stack A down deleted stack B's data dir ($dirB): $out")
      assert(
        Files.readString(dirB.resolve("library/item.json")) == "stack B's library item",
        s"tearing stack A down rewrote stack B's live data: ${Files.readString(dirB.resolve("library/item.json"))}"
      )
      // The one hazard per-stack paths introduce is the opposite of the old one: a teardown run
      // without its stack's variables now LEAKS a tree rather than destroying a live one. `clean`
      // has to name what it left, or that leak is as invisible as the `mktemp -d` one was.
      assert(out.contains(dirB.toString), s"clean did not report the tree it left behind ($dirB):\n$out")

      // Symmetric: B's own teardown removes B. (A one-way property would be satisfied by a script
      // that simply never removed anything but its first argument's tree.)
      val (bCode, bOut) = run("fresh-data-dir.sh", Seq("clean"), bSamePulsar)
      assert(bCode == 0, s"clean exited $bCode: $bOut")
      assert(!Files.exists(dirB), s"stack B's own tree survived its own teardown: $bOut")
    finally deleteTree(runnerTemp)
  }

  test("STACK-3: run-dekaf.sh and stack-down.sh both go through the shared path") {
    // STATIC on purpose. The behaviour above is executed; this pins the WIRING, which cannot be:
    // `run-dekaf.sh` installs npm dependencies, builds the UI and ends in `exec sbt run`, and
    // `stack-down.sh` deletes the Pulsar container the rest of this suite is running against. The
    // check is here rather than nowhere because the deterministic path is worthless if either end
    // stops using it - and each of them would still pass its own tests.
    def source(name: String): String = Files.readString(scripts.resolve(name))

    val runDekaf = source("run-dekaf.sh")
    assert(
      runDekaf.contains("""fresh_data="$("$here/fresh-data-dir.sh" path)""""),
      "run-dekaf.sh no longer takes its DEKAF_FRESH_DATA directory from fresh-data-dir.sh"
    )
    // Comments are excluded deliberately: the script EXPLAINS why it is no longer on mktemp, and a
    // whole-file search would match that sentence and never be able to fail for the real reason.
    val runDekafCode = runDekaf.linesIterator.filterNot(_.trim.startsWith("#")).mkString("\n")
    assert(
      !runDekafCode.contains("mktemp"),
      "run-dekaf.sh is back on mktemp - the tree becomes unfindable and leaks on every CI run"
    )
    assert(
      runDekaf.contains("""export DEKAF_DATA_DIR="$fresh_data""""),
      "run-dekaf.sh no longer points DEKAF_DATA_DIR at that directory"
    )
    assert(
      source("stack-down.sh").contains("""fresh-data-dir.sh" clean"""),
      "stack-down.sh no longer removes the fresh data dir - CI's teardown step is the only thing that can"
    )

    // Cheap correctness gate on all three: an edit that broke the syntax would otherwise only
    // surface on CI, where these run once each and nothing else exercises them.
    Seq("fresh-data-dir.sh", "run-dekaf.sh", "stack-down.sh").foreach { name =>
      val pb = new ProcessBuilder(Seq("bash", "-n", scripts.resolve(name).toString).asJava)
      pb.redirectErrorStream(true)
      val process = pb.start()
      val out = new String(process.getInputStream.readAllBytes(), "UTF-8")
      assert(process.waitFor() == 0, s"$name does not parse: $out")
    }
  }
