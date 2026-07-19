package harness

/** Poll an admin-side assertion until it passes or the deadline elapses.
  * Used to wait out admin/gRPC propagation without fixed sleeps. */
object Eventually:
  def eventually[T](timeoutMs: Long = 15000, intervalMs: Long = 300)(op: => T): T =
    val deadline = System.currentTimeMillis() + timeoutMs
    var last: Throwable = new AssertionError("eventually: assertion never evaluated")
    while System.currentTimeMillis() < deadline do
      try return op
      catch
        case t: Throwable =>
          last = t
          Thread.sleep(intervalMs)
    throw last
