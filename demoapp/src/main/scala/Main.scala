import zio.*
import _root_.generators
import _root_.generators.{TopicPlanExecutor, TopicPlan, TopicPlanGenerator}

val topicPlanGenerator = TopicPlanGenerator.make(
    getTenant = () => "public",
    getNamespace = () => "default",
)

val topicPlan = TopicPlan.make(topicPlanGenerator, 0)

object MainApp extends ZIOAppDefault:
    def run = for {
        _ <- ZIO.attempt(println("Starting app..."))
        _ <- TopicPlanExecutor.allocate(topicPlan)
        _ <- TopicPlanExecutor.startProduce(topicPlan)
//        _ <- primitives.Primitives.startProduce()
    } yield ()
