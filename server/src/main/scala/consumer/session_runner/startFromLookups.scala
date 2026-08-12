package consumer.session_runner

import org.apache.pulsar.client.admin.PulsarAdminException

import scala.util.{Failure, Success, Try}

/** The broker could not answer a question the requested start position depends on.
  *
  * Distinct from "the log holds nothing there", which is an ANSWER. A session that cannot be put
  * where the user asked for it must fail to be created, rather than start somewhere else and report
  * success.
  */
final class StartFromUnresolvableException(message: String, cause: Throwable) extends RuntimeException(message, cause)

/** The two phrases the broker answers "there is nothing there" with. Lower-cased at the point of
  * comparison, so a version that changes the capitalisation still matches. */
private val emptyLogPhrases: Vector[String] = Vector("total message is zero", "incorrect parameter input")

/** HTTP 412: `examinemessage`'s only precondition is that the log holds something. */
private val preconditionFailed: Int = 412

private def causeChain(err: Throwable): Vector[Throwable] =
    // Bounded: a cause chain that references itself is not unheard of, and this runs on the session
    // creation path.
    Iterator.iterate(err)(_.getCause).takeWhile(_ != null).take(10).toVector

private def saysEmptyLog(message: String): Boolean =
    Option(message).map(_.toLowerCase).exists(text => emptyLogPhrases.exists(text.contains))

/** Whether an admin failure is the broker SAYING THERE IS NOTHING THERE, rather than failing to
  * answer at all.
  *
  * `PulsarAdmin.topics.examineMessage` has no "empty" answer: both of its legitimate "no such
  * entry" outcomes arrive as failures, and everything else that can go wrong arrives the same way.
  * Erasing all of them into one `None` is what turned a transient broker error into a DIFFERENT
  * VALID START POSITION - "Latest 5" quietly showed the entire backlog, and creation reported
  * success.
  *
  * MEASURED against the Pulsar this repo runs its e2e against (3.2.1), through `PulsarAdmin`
  * itself, on a non-partitioned persistent topic holding 3 unbatched messages:
  *
  *   - EMPTY TOPIC, `earliest/1`: `PreconditionFailedException`, statusCode 412, message and
  *     httpError both "Could not examine messages due to the total message is zero".
  *   - PAST THE START, `latest/99`: `ServerSideErrorException`, statusCode 500, message and
  *     httpError both "... Message: Incorrect parameter input error code: -14 ...
  *     org.apache.bookkeeper.mledger.ManagedLedgerException ...".
  *   - MISSING TOPIC: `NotFoundException`, statusCode 404, "Topic ... not found".
  *   - UNREACHABLE BROKER: plain `PulsarAdminException`, **statusCode 500**, httpError NULL,
  *     message "...RetryException: Could not complete the operation. Number of retries has been
  *     exhausted...".
  *   - PAST THE END, `earliest/4` and `earliest/99`: HTTP 200, silently CLAMPED to the last entry.
  *     That is why only the `latest` side is ever walked, and why [[resolveLatestN]] guards the
  *     clamp with a repeated-entry check rather than relying on a failure.
  *
  * THE STATUS CODE ALONE CANNOT CLASSIFY, and that last measurement is why: a broker that cannot be
  * reached at all reports the same 500 as a walk that ran off the start of the log. Only 412 is
  * unambiguous; the 500 has to be told apart by what it says. Both `getMessage` and `getHttpError`
  * are checked because the admin client fills them from the same server reason but leaves
  * `httpError` null when the failure never reached the server.
  *
  * EVERYTHING ELSE IS AN OPERATIONAL FAILURE: a timeout, a 401/403, a 404, a broker restarting
  * mid-request, a 500 that says something else. None of those means the log is empty, and none of
  * them may be answered with a position the user did not ask for.
  *
  * PURE, so every one of these shapes is pinned by test.
  */
def isEmptyLogAnswer(err: Throwable): Boolean =
    causeChain(err).exists {
        case admin: PulsarAdminException =>
            admin.getStatusCode == preconditionFailed || saysEmptyLog(admin.getMessage) || saysEmptyLog(admin.getHttpError)
        case other => saysEmptyLog(other.getMessage)
    }

/** Ask the broker one question about a topic's log, keeping "there is nothing there" and "it could
  * not say" apart.
  *
  * `Some(answer)` - the broker answered. `None` - the broker answered, and the answer is that there
  * is nothing at that position. A throw - the broker could not answer, and the start position the
  * user asked for cannot be resolved, so the session must not be created.
  *
  * `question` and `topicFqn` are for the message the client is shown; they are the only way a user
  * can tell "your topic is empty" from "the broker is unwell".
  */
def brokerAnswer[A](question: String, topicFqn: String)(lookup: => A): Option[A] =
    Try(lookup) match
        case Success(value)                        => Some(value)
        case Failure(err) if isEmptyLogAnswer(err) => None
        case Failure(err) =>
            throw StartFromUnresolvableException(
                s"Could not resolve the requested start-from position: $question failed for $topicFqn. ${err.getMessage}",
                err
            )
