package cache

import org.apache.pulsar.common.policies.data.{BookieAffinityGroupData, AutoSubscriptionCreationOverride, DelayedDeliveryPolicies, DispatchRate, EntryFilters, InactiveTopicPolicies, OffloadPolicies, PersistencePolicies, PublishRate, RetentionPolicies, SchemaCompatibilityStrategy, SubscribeRate, Policies as PulsarPolicies}
import cache.{NamespacePolicies, PoliciesCacheEntry, TopicPolicies}
import org.apache.pulsar.client.api.SubscriptionType

import java.time.Instant
import java.util.{Timer, TimerTask, UUID}
import scala.concurrent.duration.*


type NamespaceAntiAffinityGroup = String
type NamespaceFqn = String
type TopicFqn = String

case class PoliciesCacheEntry(
    namespacePolicies: Option[NamespacePolicies],
    topicPolicies: Option[TopicPolicies],
    expiresAt: Instant
)

object PoliciesClipboardCache:
    private val ttl: FiniteDuration = 10.minutes
    private val ttlTimer = new Timer()
    private val updateTtlTimerTask: TimerTask = new TimerTask {
        override def run(): Unit = {
            val now = Instant.now()
            policiesCache = policiesCache.filter { case (_, entry) => entry.expiresAt.isAfter(now) }
        }
    }

    ttlTimer.scheduleAtFixedRate(updateTtlTimerTask, 0, 1000L)

    private var policiesCache: Map[UUID, PoliciesCacheEntry] = Map.empty

    def add(
        namespacePolicies: Option[NamespacePolicies] = None,
        topicPolicies: Option[TopicPolicies] = None
    ): UUID =
        val id = UUID.randomUUID()
        val expiresAt = Instant.now().plusNanos(ttl.toNanos)
        policiesCache += (id -> PoliciesCacheEntry(namespacePolicies, topicPolicies, expiresAt))
        id

    def update(
        id: UUID,
        namespacePolicies: Option[NamespacePolicies] = None,
        topicPolicies: Option[TopicPolicies] = None
    ): Option[PoliciesCacheEntry] =
        val entry = policiesCache.get(id)
        entry.foreach { entry =>
            val updatedEntry = entry.copy(
                namespacePolicies = namespacePolicies.orElse(entry.namespacePolicies),
                topicPolicies = topicPolicies.orElse(entry.topicPolicies)
            )
            policiesCache += (id -> updatedEntry)
        }
        entry

    def get(id: UUID): Option[PoliciesCacheEntry] =
        policiesCache.get(id)

    def delete(id: UUID): Option[PoliciesCacheEntry] =
        val entry = policiesCache.get(id)
        policiesCache = policiesCache - id
        entry

case class NamespacePolicies(
    namespaceFqn: NamespaceFqn,
    pulsarPolicies: Option[PulsarPolicies],
    namespaceAntiAffinityGroup: Option[NamespaceAntiAffinityGroup],
    bookieAffinityGroupData: Option[BookieAffinityGroupData],
    publishRate: Option[PublishRate],
    dispatchRate: Option[DispatchRate],
    subscribeRate: Option[SubscribeRate],
    subscriptionDispatchRate: Option[DispatchRate],
    replicatorDispatchRate: Option[DispatchRate]
)

case class TopicPolicies(
    topicFqn: TopicFqn,
    isGlobal: Boolean,
    delayedDeliveryPolicy: Option[DelayedDeliveryPolicies],
    retention: Option[RetentionPolicies],
    maxUnackedMessagesOnConsumer: Option[Integer],
    inactiveTopicPolicies: Option[InactiveTopicPolicies],
    offloadPolicies: Option[OffloadPolicies],
    maxUnackedMessagesOnSubscription: Option[Integer],
    persistence: Option[PersistencePolicies],
    deduplicationStatus: Option[java.lang.Boolean],
    dispatchRate: Option[DispatchRate],
    subscriptionDispatchRate: Option[DispatchRate],
    replicatorDispatchRate: Option[DispatchRate],
    compactionThreshold: Option[java.lang.Long],
    publishRate: Option[PublishRate],
    maxConsumersPerSubscription: Option[Integer],
    maxProducers: Option[Integer],
    maxSubscriptionsPerTopic: Option[Integer],
    maxMessageSize: Option[Integer],
    maxConsumers: Option[Integer],
    deduplicationSnapshotInterval: Option[Integer],
    subscriptionTypesEnabled: Option[java.util.Set[SubscriptionType]],
    subscribeRate: Option[SubscribeRate],
    schemaCompatibilityStrategy: Option[SchemaCompatibilityStrategy],
    entryFiltersPerTopic: Option[EntryFilters],
    autoSubscriptionCreation: Option[AutoSubscriptionCreationOverride],
)
