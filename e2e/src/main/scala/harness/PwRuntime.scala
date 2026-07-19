package harness

import com.microsoft.playwright.{Browser, BrowserType, Playwright}

/** One Playwright + Browser shared across the whole run (initialized on first use, closed on JVM exit).
  * Each test gets its own BrowserContext (see DekafSuite), so isolation is per-test while the expensive
  * browser launch happens once. */
object PwRuntime:
  private val playwright: Playwright = Playwright.create()

  private val browserInstance: Browser =
    val opts = BrowserType.LaunchOptions().setHeadless(!Config.headed)
    if Config.slowMoMs > 0 then opts.setSlowMo(Config.slowMoMs)
    playwright.chromium().launch(opts)

  Runtime.getRuntime.addShutdownHook(new Thread(() =>
    try browserInstance.close()
    finally playwright.close()
  ))

  def browser: Browser = browserInstance
