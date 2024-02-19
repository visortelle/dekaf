package generators

import _root_.client.adminClient
import zio.*
import scala.util.{Failure, Success, Try}

type NamespaceName = String
type NamespaceIndex = Int

case class NamespacePlan(
    tenant: String,
    name: NamespaceName,
    topics: Map[TopicName, TopicPlan],
    multiTopicProducers: Map[ProducerPlan, List[TopicPlan]],
    processors: Map[ProcessorName, ProcessorPlan[_, _]],
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

        processorsAsPairs <- ZIO.foreach(List.range(0, generator.mkProcessorsCount(namespaceIndex))) { processorIndex =>
            for {
                processorGenerator <- generator.mkProcessorGenerator(processorIndex)
                processorPlan <- ProcessorPlan.make(processorGenerator, processorIndex)
            } yield processorPlan.name -> processorPlan
        }
        processors <- ZIO.succeed(processorsAsPairs.toMap)
        namespacePlan <- ZIO.succeed {
            NamespacePlan(
                tenant = generator.mkTenant(),
                name = generator.mkName(namespaceIndex),
                topics = topics,
                multiTopicProducers = generator.mkMultiTopicProducers(namespaceIndex),
                processors = processors,
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
    mkProcessorsCount: NamespaceIndex => Int,
    mkProcessorGenerator: NamespaceIndex => Task[ProcessorPlanGenerator[_, _]],
    mkAfterAllocation: NamespaceIndex => Unit = _ => ()
)

object NamespacePlanGenerator:
    def make(
        mkTenant: () => TenantName = () => "dekaf_default",
        mkName: NamespaceIndex => NamespaceName = namespaceIndex => s"namespace-$namespaceIndex",
        mkTopicsCount: NamespaceIndex => Int = _ => 1,
        mkTopicGenerator: TopicIndex => Task[TopicPlanGenerator] = _ => TopicPlanGenerator.make(),
        mkMultiTopicProducers: NamespaceIndex => Map[ProducerPlan, List[TopicPlan]] = _ => Map.empty,
        mkProcessorsCount: NamespaceIndex => Int = _ => 0,
        mkProcessorGenerator: ProcessorIndex => Task[ProcessorPlanGenerator[_, _]] = _ => ProcessorPlanGenerator.make(),
        mkAfterAllocation: NamespaceIndex => Unit = _ => ()
    ): Task[NamespacePlanGenerator] =
        val namespacePlanGenerator = NamespacePlanGenerator(
            mkTenant = mkTenant,
            mkName = mkName,
            mkTopicsCount = mkTopicsCount,
            mkTopicGenerator = mkTopicGenerator,
            mkMultiTopicProducers = mkMultiTopicProducers,
            mkProcessorsCount = mkProcessorsCount,
            mkProcessorGenerator = mkProcessorGenerator,
            mkAfterAllocation = mkAfterAllocation
        )

        ZIO.succeed(namespacePlanGenerator)

object NamespacePlanExecutor:
    private def mkNamespaceFqn = (namespacePlan: NamespacePlan) => s"${namespacePlan.tenant}/${namespacePlan.name}"

    def allocateResources(namespacePlan: NamespacePlan): Task[NamespacePlan] = for {
        _ <- ZIO.logInfo(s"Allocating resources for namespace ${namespacePlan.name}")
        namespaceFqn <- ZIO.attempt(mkNamespaceFqn(namespacePlan))
        _ <- ZIO.attempt {
            val isNamespaceExists = Try(adminClient.namespaces.getPolicies(namespaceFqn)) match
                case Success(_) => true
                case Failure(_) => false

            if !isNamespaceExists then adminClient.namespaces.createNamespace(namespaceFqn)
        }
        _ <- ZIO.foreachDiscard(namespacePlan.topics.values)(TopicPlanExecutor.allocateResources)
        _ <- ZIO.attempt(namespacePlan.afterAllocation())
    } yield namespacePlan

    def start(namespacePlan: NamespacePlan): Task[Unit] = for {
        _ <- ZIO.logInfo(s"Starting namespace ${namespacePlan.name}")
        _ <- ZIO.foreachParDiscard(namespacePlan.topics.values)(TopicPlanExecutor.start)
            <&> ZIO.foreachParDiscard(namespacePlan.multiTopicProducers)(ProducerPlanExecutor.startMultiTopicProducer)
            <&> ZIO.foreachParDiscard(namespacePlan.processors.values)(ProcessorPlanExecutor.start)
    } yield ()
