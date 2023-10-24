package producer

case class LocalScheduleRecurs(n: Long)
case class LocalScheduleSpaced(durationNanos: Long)
case class LocalScheduleFixed(durationNanos: Long)
case class LocalScheduleExponential(baseDurationNans: Long, factor: Long)
case class LocalScheduleFibonacci(baseDurationNanos: Long)

enum LocalScheduleCombinator:
    case Union, Intersection, Sequencing

case class LocalScheduleJittering(min: Int, max: Int) // from 0.0 to 1.0

case class LocalScheduleEntry(
    schedule: LocalScheduleRecurs | LocalScheduleSpaced | LocalScheduleFixed | LocalScheduleExponential | LocalScheduleFibonacci,
    combinator: LocalScheduleCombinator,
    jittering: LocalScheduleJittering
)

case class LocalSchedule(entries: Vector[LocalScheduleEntry])