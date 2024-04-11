package testing

val isDebug = !sys.env.get("CI").contains("true")

