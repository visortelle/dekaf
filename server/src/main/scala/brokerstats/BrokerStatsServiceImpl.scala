package brokerstats

import com.tools.teal.pulsar.ui.brokerstats.v1.brokerstats as pb
import _root_.client.{adminClient, client}
import com.typesafe.scalalogging.Logger

import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code

class BrokerStatsServiceImpl extends pb.BrokerStatsServiceGrpc.BrokerStatsService:
    val logger: Logger = Logger(getClass.getName)

    override def getBrokerStatsJson(request: pb.GetBrokerStatsJsonRequest): Future[pb.GetBrokerStatsJsonResponse] =
        try {
            val statsJson = adminClient.brokerStats.getMetrics
            Future.successful(
                pb.GetBrokerStatsJsonResponse(status = Some(Status(code = Code.OK.index)), statsJson)
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetBrokerStatsJsonResponse(status = Some(status)))
        }
