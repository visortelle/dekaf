package namespace

import com.tools.teal.pulsar.ui.namespace.v1.namespace.{
    ClearBundleBacklogRequest,
    ClearBundleBacklogResponse,
    ClearNamespaceBacklogRequest,
    ClearNamespaceBacklogResponse,
    CreateNamespaceRequest,
    CreateNamespaceResponse,
    DeleteNamespaceRequest,
    DeleteNamespaceResponse,
    GetBundlesRequest,
    GetBundlesResponse,
    GetPermissionOnSubscriptionRequest,
    GetPermissionOnSubscriptionResponse,
    GetPermissionsRequest,
    GetPermissionsResponse,
    GetPropertiesRequest,
    GetPropertiesResponse,
    GetTopicsCountRequest,
    GetTopicsCountResponse,
    GrantPermissionOnSubscriptionRequest,
    GrantPermissionOnSubscriptionResponse,
    GrantPermissionsRequest,
    GrantPermissionsResponse,
    ListNamespacesRequest,
    ListNamespacesResponse,
    NamespaceServiceGrpc,
    RevokePermissionOnSubscriptionRequest,
    RevokePermissionOnSubscriptionResponse,
    RevokePermissionsRequest,
    RevokePermissionsResponse,
    SetPropertiesRequest,
    SetPropertiesResponse,
    SplitNamespaceBundleRequest,
    SplitNamespaceBundleResponse,
    UnloadNamespaceBundleRequest,
    UnloadNamespaceBundleResponse,
    UnloadNamespaceRequest,
    UnloadNamespaceResponse
}
import com.tools.teal.pulsar.ui.namespace.v1.namespace as pb
import com.typesafe.scalalogging.Logger
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.common.policies.data.BacklogQuota.{builder as BacklogQuotaBuilder, BacklogQuotaType, RetentionPolicy}
import org.apache.pulsar.common.policies.data.{
    AuthAction,
    AutoSubscriptionCreationOverride,
    AutoTopicCreationOverride,
    BookieAffinityGroupData,
    BundlesData,
    DelayedDeliveryPolicies,
    DispatchRate,
    InactiveTopicDeleteMode,
    InactiveTopicPolicies,
    OffloadedReadPriority,
    OffloadPolicies,
    PersistencePolicies,
    Policies,
    PublishRate,
    RetentionPolicies,
    SubscribeRate,
    SubscriptionAuthMode
}
import pulsar_auth.RequestContext

import java.util.concurrent.TimeUnit
import scala.jdk.FutureConverters.*
import scala.jdk.CollectionConverters.*
import scala.concurrent.{Await, ExecutionContext, Future}
import java.util.concurrent.{CompletableFuture, TimeUnit}
import scala.concurrent.duration.Duration

class NamespaceServiceImpl extends NamespaceServiceGrpc.NamespaceService:
    val logger: Logger = Logger(getClass.getName)

    override def createNamespace(request: CreateNamespaceRequest): Future[CreateNamespaceResponse] =
        logger.info(s"Creating namespace ${request.namespaceName}")
        val adminClient = RequestContext.pulsarAdmin.get()

        val bundlesData = BundlesData.builder.numBundles(request.numBundles).build
        val policies = new Policies
        policies.bundles = bundlesData
        policies.replication_clusters = request.replicationClusters.toSet.asJava
        policies.properties = request.properties.asJava

        try {
            adminClient.namespaces.createNamespace(request.namespaceName, policies)

            val status = Status(code = Code.OK.index)
            Future.successful(CreateNamespaceResponse(status = Some(status)))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateNamespaceResponse(status = Some(status)))
        }

    override def deleteNamespace(request: DeleteNamespaceRequest): Future[DeleteNamespaceResponse] =
        logger.info(s"Deleting namespace ${request.namespaceName}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.namespaces.deleteNamespace(request.namespaceName, request.force)

            val status = Status(code = Code.OK.index)
            Future.successful(DeleteNamespaceResponse(status = Some(status)))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteNamespaceResponse(status = Some(status)))
        }

    override def listNamespaces(request: ListNamespacesRequest): Future[ListNamespacesResponse] =
        logger.debug(s"List namespaces. Tenant: ${request.tenant}")
        val adminClient = RequestContext.pulsarAdmin.get()

        val namespaces =
            try
                adminClient.namespaces.getNamespaces(request.tenant).asScala
            catch {
                case err: Exception =>
                    val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                    return Future.successful(pb.ListNamespacesResponse(status = Some(status)))
            }

        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.ListNamespacesResponse(status = Some(status), namespaces = namespaces.toSeq))

    override def getTopicsCount(request: GetTopicsCountRequest): Future[GetTopicsCountResponse] =
        import org.apache.pulsar.common.naming.TopicDomain

        val adminClient = RequestContext.pulsarAdmin.get()

        given ExecutionContext = ExecutionContext.global

        try {
            val getTopicsOptions = org.apache.pulsar.client.admin.ListTopicsOptions.builder
                .includeSystemTopic(request.isIncludeSystemTopics)
                .build

            val getPersistentTopicsFutures = request.namespaces.map(t => adminClient.topics().getListAsync(t, TopicDomain.persistent, getTopicsOptions).asScala)
            val getNonPersistentTopicsFutures =
                request.namespaces.map(t => adminClient.topics().getListAsync(t, TopicDomain.non_persistent, getTopicsOptions).asScala)
            val getPartitionedTopicsFutures = request.namespaces.map(t => adminClient.topics().getPartitionedTopicListAsync(t, getTopicsOptions).asScala)

            val nonPartitionedTopicsPerNamespace = request.namespaces.zip(
                Await.result(
                    Future.sequence(getPersistentTopicsFutures ++ getNonPersistentTopicsFutures),
                    Duration(1, TimeUnit.MINUTES)
                ).map(_.asScala.toVector).toVector
            ).toMap

            val partitionedTopicsPerNamespace = request.namespaces.zip(
                Await.result(
                    Future.sequence(getPartitionedTopicsFutures),
                    Duration(1, TimeUnit.MINUTES)
                ).map(_.asScala.toVector).toVector
            ).toMap

            val PartitionRegexPattern = """^(.*)(-partition-)(\d+)$"""
            val partitionsPerNamespace = nonPartitionedTopicsPerNamespace.map {
                case (k, v) => (k, v.filter(_.matches(PartitionRegexPattern)))
            }

            val topicCount: Map[String, Int] = request.namespaces.map(ns =>
                val count = nonPartitionedTopicsPerNamespace(ns).size + partitionedTopicsPerNamespace(ns).size
                (ns, count)
            ).toMap

            val topicCountExcludingPartitions: Map[String, Int] = request.namespaces.map(ns =>
                val count = nonPartitionedTopicsPerNamespace(ns).size -
                    partitionsPerNamespace(ns).size +
                    partitionedTopicsPerNamespace(ns).size
                (ns, count)
            ).toMap

            val topicCountPersistent: Map[String, Int] = request.namespaces.map(ns =>
                val partitionedTopics = partitionedTopicsPerNamespace(ns).filter(_.startsWith("persistent://"))
                val nonPartitionedTopics = nonPartitionedTopicsPerNamespace(ns)
                    .filter(t => !t.matches(PartitionRegexPattern) && t.startsWith("persistent://"))

                val count = partitionedTopics.size + nonPartitionedTopics.size
                (ns, count)
            ).toMap

            val topicCountNonPersistent: Map[String, Int] = request.namespaces.map(ns =>
                val partitionedTopics = partitionedTopicsPerNamespace(ns).filter(_.startsWith("non-persistent://"))
                val nonPartitionedTopics = nonPartitionedTopicsPerNamespace(ns)
                    .filter(t => !t.matches(PartitionRegexPattern) && t.startsWith("non-persistent://"))

                val count = partitionedTopics.size + nonPartitionedTopics.size
                (ns, count)
            ).toMap

            val status = Status(code = Code.OK.index)
            Future.successful(
                GetTopicsCountResponse(
                    status = Some(status),
                    topicCount = topicCount,
                    topicCountExcludingPartitions = topicCountExcludingPartitions,
                    topicCountPersistent = topicCountPersistent,
                    topicCountNonPersistent = topicCountNonPersistent
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetTopicsCountResponse(status = Some(status)))
        }

    override def getPermissions(request: GetPermissionsRequest): Future[GetPermissionsResponse] =
        logger.debug(s"Getting permissions for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        def authActionToPb(authAction: AuthAction): pb.AuthAction =
            authAction match
                case AuthAction.produce   => pb.AuthAction.AUTH_ACTION_PRODUCE
                case AuthAction.consume   => pb.AuthAction.AUTH_ACTION_CONSUME
                case AuthAction.functions => pb.AuthAction.AUTH_ACTION_FUNCTIONS
                case AuthAction.sources   => pb.AuthAction.AUTH_ACTION_SOURCES
                case AuthAction.sinks     => pb.AuthAction.AUTH_ACTION_SINKS
                case AuthAction.packages  => pb.AuthAction.AUTH_ACTION_PACKAGES
        try {
            val permissions = Option(adminClient.namespaces.getPermissions(request.namespace).asScala.toMap) match
                case None =>
                    val status = Status(code = Code.INTERNAL.index)
                    return Future.successful(GetPermissionsResponse(status = Some(status)))
                case Some(v) =>
                    v.map(x => x._1 -> new pb.AuthActions(authActions = x._2.asScala.toList.map(authActionToPb)))
            Future.successful(
                GetPermissionsResponse(
                    status = Some(Status(code = Code.OK.index)),
                    permissions
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetPermissionsResponse(status = Some(status)))
        }
    override def grantPermissions(request: GrantPermissionsRequest): Future[GrantPermissionsResponse] =
        logger.debug(s"Granting permissions for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        def authActionFromPb(authAction: pb.AuthAction): AuthAction =
            authAction match
                case pb.AuthAction.AUTH_ACTION_PRODUCE   => AuthAction.produce
                case pb.AuthAction.AUTH_ACTION_CONSUME   => AuthAction.consume
                case pb.AuthAction.AUTH_ACTION_FUNCTIONS => AuthAction.functions
                case pb.AuthAction.AUTH_ACTION_SOURCES   => AuthAction.sources
                case pb.AuthAction.AUTH_ACTION_SINKS     => AuthAction.sinks
                case pb.AuthAction.AUTH_ACTION_PACKAGES  => AuthAction.packages
        try {
            val permissions = adminClient.namespaces.getPermissions(request.namespace).asScala.toMap

            if permissions.exists(_._1 == request.role && request.existenceCheck) then
                val status = Status(
                    code = Code.FAILED_PRECONDITION.index,
                    message = s"There are already granted permissions for this role: ${request.role}. Please choose another role name."
                )
                return Future.successful(GrantPermissionsResponse(status = Some(status)))

            adminClient.namespaces.grantPermissionOnNamespace(request.namespace, request.role, request.authActions.toList.map(authActionFromPb).toSet.asJava)

            Future.successful(
                GrantPermissionsResponse(
                    status = Some(Status(code = Code.OK.index))
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GrantPermissionsResponse(status = Some(status)))
        }

    override def revokePermissions(request: RevokePermissionsRequest): Future[RevokePermissionsResponse] =
        logger.debug(s"Revoke permissions for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.namespaces.revokePermissionsOnNamespace(request.namespace, request.role)

            Future.successful(
                RevokePermissionsResponse(
                    status = Some(Status(code = Code.OK.index))
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RevokePermissionsResponse(status = Some(status)))
        }

    override def getPermissionOnSubscription(request: GetPermissionOnSubscriptionRequest): Future[GetPermissionOnSubscriptionResponse] =
        logger.debug(s"Getting subscription permissions for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val permissions = Option(adminClient.namespaces.getPermissionOnSubscription(request.namespace).asScala.toMap) match
                case None =>
                    val status = Status(code = Code.INTERNAL.index)
                    return Future.successful(GetPermissionOnSubscriptionResponse(status = Some(status)))
                case Some(v) =>
                    v.collect {
                        case x if x._2.asScala.toList.length > 0 =>
                            x._1 -> new pb.Roles(roles = x._2.asScala.toList)
                    }
            val roles = adminClient.namespaces.getPermissions(request.namespace).asScala.toMap.map(x => x._1).toSeq

            Future.successful(
                GetPermissionOnSubscriptionResponse(
                    status = Some(Status(code = Code.OK.index)),
                    permissions,
                    roles
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetPermissionOnSubscriptionResponse(status = Some(status)))
        }

    override def grantPermissionOnSubscription(request: GrantPermissionOnSubscriptionRequest): Future[GrantPermissionOnSubscriptionResponse] =
        logger.debug(s"Granting subscription permissions for subscription ${request.subscription} for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val permissions = adminClient.namespaces.getPermissionOnSubscription(request.namespace).asScala.toMap

            if permissions.exists(_._1 == request.subscription && request.existenceCheck) then
                val status = Status(
                    code = Code.FAILED_PRECONDITION.index,
                    message = s"There are already assigned roles for this subscription: ${request.subscription}. Please choose another subscription name."
                )
                return Future.successful(GrantPermissionOnSubscriptionResponse(status = Some(status)))

            adminClient.namespaces.grantPermissionOnSubscription(request.namespace, request.subscription, request.roles.toSet.asJava)
            Future.successful(
                GrantPermissionOnSubscriptionResponse(
                    status = Some(Status(code = Code.OK.index))
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GrantPermissionOnSubscriptionResponse(status = Some(status)))
        }

    override def revokePermissionOnSubscription(request: RevokePermissionOnSubscriptionRequest): Future[RevokePermissionOnSubscriptionResponse] =
        logger.debug(s"Revoke roles for subscription ${request.subscription} for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.namespaces.grantPermissionOnSubscription(request.namespace, request.subscription, Set().asJava)

            Future.successful(
                RevokePermissionOnSubscriptionResponse(
                    status = Some(Status(code = Code.OK.index))
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RevokePermissionOnSubscriptionResponse(status = Some(status)))
        }

    override def getProperties(request: GetPropertiesRequest): Future[GetPropertiesResponse] =
        logger.debug(s"Get properties for namespace.")
        val adminClient = RequestContext.pulsarAdmin.get()

        given ExecutionContext = ExecutionContext.global

        try {
            val getPropertiesFutures = request.namespaces.map(ns => adminClient.namespaces.getPropertiesAsync(ns).asScala)
            val propertiesPerNs = Await
                .result(Future.sequence(getPropertiesFutures), Duration(1, TimeUnit.MINUTES))
                .map(ps => pb.Properties(properties = ps.asScala.toMap))
            val properties = request.namespaces.zip(propertiesPerNs).toMap

            Future.successful(
                GetPropertiesResponse(
                    status = Some(Status(code = Code.OK.index)),
                    properties
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetPropertiesResponse(status = Some(status)))
        }
    override def setProperties(request: SetPropertiesRequest): Future[SetPropertiesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val properties = request.properties.asJava

            val existingProperties = adminClient.namespaces.getProperties(request.namespace)

            existingProperties.asScala.map((key, _) => if properties.get(key) == null then adminClient.namespaces.removeProperty(request.namespace, key))

            adminClient.namespaces.setProperties(request.namespace, request.properties.asJava)

            Future.successful(
                SetPropertiesResponse(
                    status = Some(Status(code = Code.OK.index))
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetPropertiesResponse(status = Some(status)))
        }

    override def unloadNamespace(request: UnloadNamespaceRequest): Future[UnloadNamespaceResponse] =
        logger.debug(s"Unload namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.namespaces.unload(request.namespace)

            Future.successful(
                UnloadNamespaceResponse(
                    status = Some(Status(code = Code.OK.index))
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UnloadNamespaceResponse(status = Some(status)))
        }

    override def unloadNamespaceBundle(request: UnloadNamespaceBundleRequest): Future[UnloadNamespaceBundleResponse] =
        logger.debug(s"Unload namespace bundle: ${request.bundle}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.namespaces.unloadNamespaceBundle(request.namespace, request.bundle)

            Future.successful(
                UnloadNamespaceBundleResponse(
                    status = Some(Status(code = Code.OK.index))
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UnloadNamespaceBundleResponse(status = Some(status)))
        }

    override def clearNamespaceBacklog(request: ClearNamespaceBacklogRequest): Future[ClearNamespaceBacklogResponse] =
        logger.debug(s"Clear backlog for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.namespaces.clearNamespaceBacklog(request.namespace)

            Future.successful(
                ClearNamespaceBacklogResponse(
                    status = Some(Status(code = Code.OK.index))
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(ClearNamespaceBacklogResponse(status = Some(status)))
        }

    override def clearBundleBacklog(request: ClearBundleBacklogRequest): Future[ClearBundleBacklogResponse] =
        logger.debug(s"Clear backlog for bundle: ${request.bundle} in namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.namespaces.clearNamespaceBundleBacklog(request.namespace, request.bundle)

            Future.successful(
                ClearBundleBacklogResponse(
                    status = Some(Status(code = Code.OK.index))
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(ClearBundleBacklogResponse(status = Some(status)))
        }

    override def splitNamespaceBundle(request: SplitNamespaceBundleRequest): Future[SplitNamespaceBundleResponse] =
        logger.debug(s"Split bundle: ${request.bundle} in namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient
                .namespaces()
                .splitNamespaceBundle(
                    request.namespace,
                    request.bundle,
                    request.unloadSplitBundles,
                    request.splitAlgorithm
                )

            Future.successful(
                SplitNamespaceBundleResponse(
                    status = Some(Status(code = Code.OK.index))
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SplitNamespaceBundleResponse(status = Some(status)))
        }

    override def getBundles(request: GetBundlesRequest): Future[GetBundlesResponse] =
        logger.debug(s"Get bundles for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val bundles = adminClient.namespaces.getBundles(request.namespace)

            Future.successful(
                GetBundlesResponse(
                    status = Some(Status(code = Code.OK.index)),
                    bundles = bundles.getBoundaries.asScala.toSeq.sliding(2).map { case List(a, b) => s"${a}_$b" }.toSeq
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetBundlesResponse(status = Some(status)))
        }
