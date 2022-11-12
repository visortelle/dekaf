package childrencount

import _root_.client.adminClient
import ch.qos.logback.classic.AsyncAppender

import scala.concurrent.{Await, ExecutionContext, Future}
import scala.concurrent.duration.Duration
import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*
import scala.jdk.OptionConverters.*
import java.util.concurrent.TimeUnit
import com.tools.teal.pulsar.ui.childrencount.v1.childrencount as pb
import com.typesafe.scalalogging.Logger
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import org.apache.pulsar.common.naming.{TopicDomain}

import scala.concurrent.Future

class TenantServiceImpl extends pb.ChildrenCountServiceGrpc.ChildrenCountService:
    val logger: Logger = Logger(getClass.getName)

    override def getChildrenCount(request: pb.GetChildrenCountRequest): Future[pb.GetChildrenCountResponse] =
        logger.debug(s"getChildrenCount: $request")

        try {
            val instanceTenantsCount = request.isIncludeInstanceTenantsCount match
                case true  => Some(adminClient.tenants.getTenants.size)
                case false => None

            val tenantNamespacesFutures = request.tenantFqns
                .map(adminClient.namespaces.getNamespacesAsync(_))
                .map(_.asScala)
            val namespacePersistentTopicsFutures = request.topicsFqns
                .map(adminClient.topics.getListAsync(_, TopicDomain.persistent))
                .map(_.asScala)
            val namespaceNonPersistentTopicsFutures = request.topicsFqns
                .map(adminClient.topics.getListAsync(_, TopicDomain.non_persistent))
                .map(_.asScala)

            val allFutures = tenantNamespacesFutures
                ++ namespacePersistentTopicsFutures
                ++ namespaceNonPersistentTopicsFutures

            given ExecutionContext = ExecutionContext.global
            val allResults = Await.result(Future.sequence(allFutures), Duration(1, TimeUnit.MINUTES))

            val status: Status = Status(code = Code.OK.index)
            Future.successful(
              pb.GetChildrenCountResponse(
                status = Some(status),
                instanceTenantsCount,
                tenantNamespacesCount = ???,
                namespacePersistentTopicsCount = ???,
                namespaceNonPersistentTopicsCount = ???,
                topicSubscriptionsCount = ???
              )
            )
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetChildrenCountResponse(status = Some(status)))
        }
