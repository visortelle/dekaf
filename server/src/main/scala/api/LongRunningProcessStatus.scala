package api

import com.tools.teal.pulsar.ui.api.v1.long_running_process_status as pb
import org.apache.pulsar.client.admin.LongRunningProcessStatus as PulsarLongRunningProcessStatus

object Status:
    def fromPb(v: pb.Status): PulsarLongRunningProcessStatus.Status = v match
        case pb.Status.STATUS_NOT_RUN => PulsarLongRunningProcessStatus.Status.NOT_RUN
        case pb.Status.STATUS_RUNNING => PulsarLongRunningProcessStatus.Status.RUNNING
        case pb.Status.STATUS_SUCCESS => PulsarLongRunningProcessStatus.Status.SUCCESS
        case pb.Status.STATUS_ERROR => PulsarLongRunningProcessStatus.Status.ERROR
        case _ => throw new Exception("Unknown LongRunningProcessStatus")

    def toPb(v: PulsarLongRunningProcessStatus.Status): pb.Status = v match
        case PulsarLongRunningProcessStatus.Status.NOT_RUN => pb.Status.STATUS_NOT_RUN
        case PulsarLongRunningProcessStatus.Status.RUNNING => pb.Status.STATUS_RUNNING
        case PulsarLongRunningProcessStatus.Status.SUCCESS => pb.Status.STATUS_SUCCESS
        case PulsarLongRunningProcessStatus.Status.ERROR => pb.Status.STATUS_ERROR

object LongRunningProcessStatus:
    def fromPb(v: pb.LongRunningProcessStatus): PulsarLongRunningProcessStatus = v.lastError match
        case None =>
            PulsarLongRunningProcessStatus.forStatus(Status.fromPb(v.status))
        case Some(err) =>
            PulsarLongRunningProcessStatus.forError(err)

    def toPb(v: PulsarLongRunningProcessStatus): pb.LongRunningProcessStatus =
        pb.LongRunningProcessStatus(
            status = Status.toPb(v.status),
            lastError = Option(v.lastError).filter(_.trim.nonEmpty)
        )
