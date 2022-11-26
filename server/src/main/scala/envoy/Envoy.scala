package envoy

import org.apache.commons.lang3.SystemUtils

type OS = WINDOWS | LINUX | MAC | UNKNOWN

val arch = SystemUtils.OS_ARCH
