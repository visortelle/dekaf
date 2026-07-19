package harness

import java.nio.file.{Path, Paths}

/** Env-driven configuration. Defaults match the shipped local stack (Dekaf on :8090; Pulsar
  * standalone from `scripts/stack-up.sh` publishes admin on :18080, broker on :6650). */
object Config:
  private def env(key: String, default: String): String = sys.env.getOrElse(key, default)

  /** Lenient boolean: accepts 1/true/yes/on (any case). Avoids `"1".toBoolean` throwing. */
  private def envFlag(key: String): Boolean =
    sys.env.get(key).map(_.trim.toLowerCase).exists(Set("1", "true", "yes", "on"))

  val baseUrl: String          = env("DEKAF_BASE_URL", "http://localhost:8090")
  val pulsarAdminUrl: String   = env("PULSAR_ADMIN_URL", "http://localhost:18080")
  val pulsarServiceUrl: String = env("PULSAR_SERVICE_URL", "pulsar://localhost:6650")

  // Headed when explicitly asked, or whenever the Playwright Inspector is on.
  val headed: Boolean = envFlag("HEADED") || sys.env.contains("PWDEBUG")
  val slowMoMs: Double = env("SLOWMO", "0").toDouble

  enum TraceMode:
    case On, Off, RetainOnFailure

  val trace: TraceMode = env("TRACE", "retain-on-failure").toLowerCase match
    case "on"  => TraceMode.On
    case "off" => TraceMode.Off
    case _     => TraceMode.RetainOnFailure

  val tracesDir: Path = Paths.get("target", "traces")
