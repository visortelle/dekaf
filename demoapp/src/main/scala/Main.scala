import zio.*
import _root_.generators
import _root_.generators.{ProducerPlanGenerator, TopicPlan, TopicPlanExecutor, TopicPlanGenerator}

val topicPlanGenerator = TopicPlanGenerator.make(
    getTenant = () => "public",
    getNamespace = () => "few-topics-1",
    getName = topicIndex => s"${topicIndex}-${java.time.Instant.now().toString}",
    getProducersCount = _ => 2,
    getPayload = _ => Array[Byte](1, 2, 3),
    getProducerGenerator = _ =>
        ProducerPlanGenerator.make(
            getSchedule = _ => Schedule.fixed(Duration.fromMillis(100))
        ),
    getSubscriptionsCount = _ => 3
)

val topicPlan = TopicPlan.make(topicPlanGenerator, 0)

val fewTopics = List.tabulate(100)(i => TopicPlan.make(topicPlanGenerator, i))

object MainApp extends ZIOAppDefault:
    def run = for {
        _ <- ZIO.logInfo("Starting app...")
        topics <- ZIO.foreachPar(fewTopics)(TopicPlanExecutor.allocateResources).withParallelism(5)
        _ <- ZIO.foreachParDiscard(topics)(TopicPlanExecutor.start)
    } yield ()
