package testing

object TestRuntime:
    def isUseExistingPulsar: Boolean = sys.env.get("TEST_IS_USE_EXISTING_PULSAR").contains("true")
    def isOpenBrowser: Boolean = sys.env.get("TEST_IS_OPEN_BROWSER").contains("true")
