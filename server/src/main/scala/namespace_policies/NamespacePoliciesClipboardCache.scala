package namespace_policies

import org.apache.pulsar.common.policies.data.{BookieAffinityGroupData, DispatchRate, PublishRate, SubscribeRate, Policies as PulsarPolicies}

import java.time.Instant
import java.util.{TimerTask, UUID}

type NamespaceAntiAffinityGroup = String

case class NamespacePoliciesClipboardCacheEntry(
    namespaceFqn: String,
    pulsarPolicies: Option[PulsarPolicies],
    namespaceAntiAffinityGroup: Option[NamespaceAntiAffinityGroup],
    bookieAffinityGroupData: Option[BookieAffinityGroupData],
    publishRate: Option[PublishRate],
    dispatchRate: Option[DispatchRate],
    subscribeRate: Option[SubscribeRate],
    subscriptionDispatchRate: Option[DispatchRate],
    replicatorDispatchRate: Option[DispatchRate],
    expiresAt: Instant
)

object NamespacePoliciesClipboardCache:
    private val ttl = scala.concurrent.duration.Duration(10, scala.concurrent.duration.MINUTES)
    private val ttlTimer = new java.util.Timer()
    private val updateTtlTimerTask: TimerTask = new TimerTask:
        override def run(): Unit =
            val now = Instant.now()
            policiesCache = policiesCache.filter { case (_, entry) => entry.expiresAt.isAfter(now) }

    ttlTimer.scheduleAtFixedRate(updateTtlTimerTask, 0, 1000L)

    private var policiesCache: Map[UUID, NamespacePoliciesClipboardCacheEntry] = Map.empty

    def add(
        namespaceFqn: String,
        pulsarPolicies: Option[PulsarPolicies],
        namespaceAntiAffinityGroup: Option[NamespaceAntiAffinityGroup],
        bookieAffinityGroupData: Option[BookieAffinityGroupData],
        publishRate: Option[PublishRate],
        dispatchRate: Option[DispatchRate],
        subscribeRate: Option[SubscribeRate],
        subscriptionDispatchRate: Option[DispatchRate],
        replicatorDispatchRate: Option[DispatchRate]
    ): UUID =
        val id = UUID.randomUUID()
        policiesCache = policiesCache + (id -> NamespacePoliciesClipboardCacheEntry(
          namespaceFqn,
          pulsarPolicies,
          namespaceAntiAffinityGroup,
          bookieAffinityGroupData,
          publishRate,
          dispatchRate,
          subscribeRate,
          subscriptionDispatchRate,
          replicatorDispatchRate,
          Instant.now().plusSeconds(ttl.toSeconds)
        ))

        id

    def get(id: UUID): Option[NamespacePoliciesClipboardCacheEntry] =
        policiesCache.get(id)

    def delete(id: UUID): Option[NamespacePoliciesClipboardCacheEntry] =
        policiesCache.get(id) match
            case Some(value) =>
                policiesCache = policiesCache - id
                Some(value)
            case None => None
