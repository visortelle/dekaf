package harness

import net.datafaker.Faker
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.{PulsarClient, Schema}
import org.apache.pulsar.common.policies.data.{ClusterData, ResourceGroup, TenantInfo}

import scala.collection.mutable
import scala.jdk.CollectionConverters.*

/** Per-suite Pulsar admin + client, unique-name minting, and a teardown registry.
  * `PulsarAdmin` is the oracle for every mutation; `PulsarClient` generates test messages
  * (schema'd / keyed / delayed) - the JVM clients are why we stayed all-JVM. */
class PulsarFixtures:
  private val faker = new Faker()

  val admin: PulsarAdmin =
    PulsarAdmin.builder().serviceHttpUrl(Config.pulsarAdminUrl).build()

  PulsarFixtures.sweepStaleClusters(admin)

  // Opened lazily - only tests that produce messages pay the connection cost.
  private var clientOpt: Option[PulsarClient] = None
  def client: PulsarClient =
    clientOpt.getOrElse:
      val c = PulsarClient.builder().serviceUrl(Config.pulsarServiceUrl).build()
      clientOpt = Some(c)
      c

  private val createdTenants = mutable.ListBuffer.empty[String]
  private val createdClusters = mutable.ListBuffer.empty[String]
  private val createdResourceGroups = mutable.ListBuffer.empty[String]
  private val extraCleanups = mutable.ListBuffer.empty[() => Unit]
  // Cleanup is best-effort per test (teardown must never fail the OWNING test), but failures leak
  // resources that can contaminate later tests - so they accumulate here and the suite surfaces
  // them at the end (see DekafSuite.afterAll) instead of vanishing into stderr.
  private val cleanupFailures = mutable.ListBuffer.empty[String]
  def cleanupFailuresSnapshot: List[String] = cleanupFailures.synchronized(cleanupFailures.toList)

  def unique(prefix: String): String =
    s"$prefix-${System.currentTimeMillis()}-${faker.number().numberBetween(1000L, 9999L)}"

  /** Register a tenant created through the UI (not via `createTenant`) for teardown. */
  def trackTenant(name: String): Unit = createdTenants += name

  /** Register an arbitrary best-effort cleanup action (e.g. delete a resource group). */
  def onCleanup(f: () => Unit): Unit = extraCleanups += f

  /** The real serving cluster - never a test-registered `cluster-*` peer. Plain `get(0)` is
    * order-unstable once a geo-rep test registers a second cluster, which would drop the serving
    * cluster from a tenant's allowed set and break namespace creation. */
  def firstCluster: String =
    val all = admin.clusters().getClusters.asScala
    all.find(!_.startsWith("cluster-")).getOrElse(all.head)

  /** Create an isolated tenant (registered for teardown) and return its name. `extraClusters` widens
    * the tenant's allowed-clusters beyond the local one - needed to exercise geo-replication, whose
    * replication set must be a subset of the tenant's allowed clusters. */
  def createTenant(extraClusters: String*): String =
    val tenant = unique("t")
    admin.tenants().createTenant(
      tenant,
      TenantInfo.builder()
        .adminRoles(Set("admin").asJava)
        .allowedClusters((firstCluster +: extraClusters).toSet.asJava)
        .build()
    )
    createdTenants += tenant
    tenant

  /** Register a second cluster so multi-cluster UI paths (geo-replication) can be driven. The
    * service URL is deliberately UNROUTABLE (`.invalid` TLD, RFC 2606): pointing it at the live
    * broker's own admin URL would make any topic produced into a geo-replicated namespace spin up a
    * real replicator against an alias of the same broker (loop or ever-growing cursor backlog).
    * With an inert URL a replicator merely fails to connect; tests should still avoid producing into
    * geo-replicated namespaces. Deleted in teardown AFTER namespaces that reference it. */
  def createCluster(): String =
    val name = unique("cluster")
    admin.clusters().createCluster(name, ClusterData.builder().serviceUrl("http://geo-peer.invalid:8080").build())
    createdClusters += name
    name

  /** Create a resource group (registered for teardown) so the Compute-Resources policy tab has one to pick. */
  def createResourceGroup(): String =
    val name = unique("rg")
    admin.resourcegroups().createResourceGroup(name, new ResourceGroup())
    createdResourceGroups += name
    name

  def createNamespace(tenant: String): String =
    val ns = unique("ns")
    admin.namespaces().createNamespace(s"$tenant/$ns")
    ns

  /** Create a non-partitioned persistent topic and return its FQN. */
  def createTopic(tenant: String, namespace: String): String =
    val topic = unique("topic")
    val fqn = s"persistent://$tenant/$namespace/$topic"
    admin.topics().createNonPartitionedTopic(fqn)
    fqn

  /** Convenience: fresh tenant → namespace → topic, returns the topic FQN. */
  def freshTopic(): String =
    val t = createTenant()
    val ns = createNamespace(t)
    createTopic(t, ns)

  /** Fresh tenant → namespace → non-partitioned topic; returns (tenant, namespace, shortTopic). */
  def freshTopicParts(): (String, String, String) =
    val t = createTenant()
    val ns = createNamespace(t)
    val topic = unique("topic")
    admin.topics().createNonPartitionedTopic(s"persistent://$t/$ns/$topic")
    (t, ns, topic)

  /** Produce `n` simple string messages to a topic FQN. */
  def produceStrings(topicFqn: String, n: Int): Unit =
    val producer = client.newProducer(Schema.STRING).topic(topicFqn).create()
    try (1 to n).foreach(i => producer.send(s"msg-$i"))
    finally producer.close()

  /** Best-effort teardown of everything this fixture created. Runs after each test.
    * Failures are logged (not thrown - teardown must not fail a test) so leaks aren't silent.
    * Two deliberate softenings (both bit on CI):
    *   - not-found on a delete = SUCCESS: the resource is already gone, usually deleted by the
    *     test itself (the tenant/RG deletion specs) - that's the goal state, not a leak;
    *   - one retry after a short pause: broker-side races (topic GC on namespace force-delete)
    *     surface as transient 500s on a loaded box and clear on the second attempt. */
  def cleanup(): Unit =
    def alreadyGone(t: Throwable): Boolean =
      t.isInstanceOf[org.apache.pulsar.client.admin.PulsarAdminException.NotFoundException] ||
        Option(t.getMessage).exists(_.toLowerCase.contains("not found"))
    def attempt(what: String)(op: => Unit): Unit =
      try op
      catch
        case t: Throwable if alreadyGone(t) => ()
        case _: Throwable =>
          Thread.sleep(1500)
          try op
          catch
            case t: Throwable if alreadyGone(t) => ()
            case t: Throwable =>
              val msg = s"$what failed: ${t.getMessage}"
              System.err.println(s"[cleanup] $msg")
              cleanupFailures.synchronized(cleanupFailures += msg)
    extraCleanups.reverse.foreach(f => attempt("onCleanup action")(f()))
    extraCleanups.clear()
    // A namespace whose replication references a cluster we're about to delete can't be deleted; drop
    // its replication back to the local cluster first. Only geo-rep tests register extra clusters.
    val resetReplication = createdClusters.nonEmpty
    createdTenants.foreach: tenant =>
      val namespaces =
        try admin.namespaces().getNamespaces(tenant).asScala.toList
        catch case _: Throwable => Nil // tenant already gone (deleted by the test) - nothing to do
      namespaces.foreach: ns =>
        attempt(s"deleteNamespace($ns)"):
          if resetReplication then
            try admin.namespaces().setNamespaceReplicationClusters(ns, Set(firstCluster).asJava)
            catch case _: Throwable => () // best-effort - the ns may have no replication set
          admin.namespaces().deleteNamespace(ns, true)
      attempt(s"deleteTenant($tenant)")(admin.tenants().deleteTenant(tenant))
    createdTenants.clear()
    createdResourceGroups.foreach: rg =>
      attempt(s"deleteResourceGroup($rg)")(admin.resourcegroups().deleteResourceGroup(rg))
    createdResourceGroups.clear()
    // Clusters last - after every namespace that referenced them is gone.
    createdClusters.foreach: c =>
      attempt(s"deleteCluster($c)")(admin.clusters().deleteCluster(c))
    createdClusters.clear()

  /** Close clients at suite end. */
  def close(): Unit =
    try admin.close()
    finally clientOpt.foreach(_.close())

object PulsarFixtures:
  private val staleClustersSwept = new java.util.concurrent.atomic.AtomicBoolean(false)
  private val StaleClusterName = """cluster-(\d+)-\d+""".r

  /** Once per JVM: best-effort delete of `cluster-<millis>-<n>` peers older than an hour, left by
    * crashed runs whose cleanup never ran. Tests are immune to them (`firstCluster` filters the
    * prefix) but the shared broker's cluster list - and the geo-replication UI dropdown - would
    * otherwise grow forever. In-use clusters (still referenced by a leaked tenant) fail to delete
    * and are silently skipped; the concurrently-running run that owns a fresh one is protected by
    * the one-hour age gate. */
  private def sweepStaleClusters(admin: PulsarAdmin): Unit =
    if staleClustersSwept.compareAndSet(false, true) then
      try
        val cutoff = System.currentTimeMillis() - 60 * 60 * 1000
        admin.clusters().getClusters.asScala.foreach {
          case name @ StaleClusterName(millis) if millis.toLong < cutoff =>
            try admin.clusters().deleteCluster(name) catch case _: Throwable => ()
          case _ => ()
        }
      catch case _: Throwable => () // the sweep must never fail a run
