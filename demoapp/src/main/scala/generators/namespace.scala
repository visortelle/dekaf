package generators

import zio.*
import _root_.client.{adminClient, pulsarClient}
import demo.tenants.schemas.namespaces.exampleShop.shared.{Command, Event}
import demo.tenants.schemas.namespaces.exampleShop.shared.ConverterMappings

type NamespaceName = String
type NamespaceIndex = Int

case class NamespacePlan(
    tenant: String,
    name: NamespaceName,
    topics: Map[TopicName, TopicPlan],
    multiTopicProducers: Map[ProducerPlan, List[TopicPlan]],
    actors:  Map[ActorName, ActorPlan[? <: Command, ? <: Event]],
    afterAllocation: () => Unit
)

object NamespacePlan:
    def make(generator: NamespacePlanGenerator, namespaceIndex: Int): Task[NamespacePlan] = for {
        topicsAsPairs <- ZIO.foreach(List.range(0, generator.mkTopicsCount(namespaceIndex))) { topicIndex =>
            for {
                topicGenerator <- generator.mkTopicGenerator(topicIndex)
                topicPlan <- TopicPlan.make(topicGenerator, topicIndex)
            } yield topicPlan.name -> topicPlan
        }
        topics <- ZIO.succeed(topicsAsPairs.toMap)

        actorsAsPairs <- ZIO.foreach(List.range(0, generator.mkActorsCount(namespaceIndex))) { actorIndex =>
            for {
                actorGenerator <- generator.mkActorGenerator(actorIndex)
                actorPlan <- ActorPlan.make(actorGenerator, actorIndex)(using actorGenerator.converter)
            } yield actorPlan.name -> actorPlan
        }
        actors <- ZIO.succeed(actorsAsPairs.toMap)
        namespacePlan <- ZIO.succeed {
            NamespacePlan(
                tenant = generator.mkTenant(),
                name = generator.mkName(namespaceIndex),
                topics = topics,
                multiTopicProducers = generator.mkMultiTopicProducers(namespaceIndex),
                actors = actors,
                afterAllocation = () => generator.mkAfterAllocation(namespaceIndex)
            )
        }
    } yield namespacePlan

case class NamespacePlanGenerator(
   mkTenant: () => TenantName,
   mkName: NamespaceIndex => NamespaceName,
   mkTopicsCount: NamespaceIndex => Int,
   mkTopicGenerator: TopicIndex => Task[TopicPlanGenerator],
   mkMultiTopicProducers: NamespaceIndex => Map[ProducerPlan, List[TopicPlan]],
   mkActorsCount: NamespaceIndex => Int,
   mkActorGenerator: NamespaceIndex => Task[ActorPlanGenerator[? <: Command, ? <: Event]],
   mkAfterAllocation: NamespaceIndex => Unit = _ => ()
)

object NamespacePlanGenerator:
    def make(
        mkTenant: () => TenantName = () => "dekaf_default",
        mkName: NamespaceIndex => NamespaceName = namespaceIndex => s"namespace-$namespaceIndex",
        mkTopicsCount: NamespaceIndex => Int = _ => 1,
        mkTopicGenerator: TopicIndex => Task[TopicPlanGenerator] = _ => TopicPlanGenerator.make(),
        mkMultiTopicProducers: NamespaceIndex => Map[ProducerPlan, List[TopicPlan]] = _ => Map.empty,
        mkActorsCount: NamespaceIndex => Int = _ => 1,
        mkActorGenerator: ActorIndex => Task[ActorPlanGenerator[? <: Command, ? <: Event]] =
          _ => ActorPlanGenerator.make[Command, Event]()(using ConverterMappings.commandToEvent),
        mkAfterAllocation: NamespaceIndex => Unit = _ => ()
    ): Task[NamespacePlanGenerator] =
        val namespacePlanGenerator = NamespacePlanGenerator(
            mkTenant = mkTenant,
            mkName = mkName,
            mkTopicsCount = mkTopicsCount,
            mkTopicGenerator = mkTopicGenerator,
            mkMultiTopicProducers = mkMultiTopicProducers,
            mkActorsCount = mkActorsCount,
            mkActorGenerator = mkActorGenerator,
            mkAfterAllocation = mkAfterAllocation
        )

        ZIO.succeed(namespacePlanGenerator)

object NamespacePlanExecutor:
    private def mkNamespaceFqn = (namespacePlan: NamespacePlan) => s"${namespacePlan.tenant}/${namespacePlan.name}"

    def allocateResources(namespacePlan: NamespacePlan): Task[NamespacePlan] = for {
        _ <- ZIO.logInfo(s"Allocating resources for namespace ${namespacePlan.name}")
        namespaceFqn <- ZIO.attempt(mkNamespaceFqn(namespacePlan))
        _ <- ZIO.attempt {
            adminClient.namespaces.createNamespace(namespaceFqn)
        }
        _ <- ZIO.foreachParDiscard(namespacePlan.topics.values)(TopicPlanExecutor.allocateResources).withParallelism(10)
        _ <- ZIO.attempt(namespacePlan.afterAllocation())
    } yield namespacePlan

    def start(namespacePlan: NamespacePlan): Task[Unit] = for {
        _ <- ZIO.logInfo(s"Starting namespace ${namespacePlan.name}")
        _ <- ZIO.foreachParDiscard(namespacePlan.topics.values)(TopicPlanExecutor.start)
          <&> ZIO.foreachParDiscard(namespacePlan.multiTopicProducers)(ProducerPlanExecutor.startMultiTopicProducer)
          <&> ZIO.foreachParDiscard(namespacePlan.actors.values)(ActorPlanExecutor.start)
    } yield ()
