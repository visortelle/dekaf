package generators

import zio.*
import _root_.client.{adminClient, pulsarClient}
import org.apache.pulsar.client.api.{Consumer, MessageListener, Producer, SubscriptionInitialPosition, SubscriptionType, Message as PulsarMessage}
import demo.tenants.cqrs.shared.Convertible
import org.apache.pulsar.client.impl.schema.AutoProduceBytesSchema

import scala.jdk.FutureConverters.*
import scala.reflect.ClassTag
import java.util.UUID

type ProcessorName = String
type ProcessorIndex = Int
type ConsumerMessageBytes = Array[Byte]
type ProducerMessageBytes = Array[Byte]

type WorkerIndex = Int
type WorkerName = String

case class ProcessorWorker[A, B](
  producerPlan: ProducerPlan,
  subscriptionPlan: SubscriptionPlan,
  consumerPlan: ConsumerPlan,
)
(using val converter: Convertible[A, B])
(using val tagA: ClassTag[A], val tagB: ClassTag[B])

object ProcessorWorkerExecutor:
  private def makeMessageListener[A, B]
  (worker: ProcessorWorker[A, B], producer: Producer[ProducerMessageBytes])
  (consumer: Consumer[A], msg: PulsarMessage[A]): MessageListener[A] =
    try
      val consumedMessage = Serde.fromJson[A](msg.getData)(using worker.tagA)
      val messageToProduce = worker.converter.convert(consumedMessage)

      val messageBytes = Serde.toJsonBytes(messageToProduce)
      val messageKey = if msg.hasKey then msg.getKey else UUID.randomUUID.toString

      val effect = for {
        _ <- processorPlan.producerPlan.messageIndex.update(_ + 1)
        _ <- ZIO.fromFuture(e =>
          producer.newMessage
            .key(messageKey)
            .value(messageBytes)
            .sendAsync
            .asScala
        )
      } yield ()

      Unsafe.unsafe { implicit u =>
        Runtime.default.unsafe.run(effect)
      }

      consumer.acknowledge(msg)
    catch
      case e: Throwable =>
        consumer.acknowledge(msg)

  private def startProducer(producerPlan: ProducerPlan, topicPlan: TopicPlan): Task[Producer[ProducerMessageBytes]] =
    ZIO.attempt {
      val schema = new AutoProduceBytesSchema[Array[Byte]]
      pulsarClient
        .newProducer(schema)
        .producerName(producerPlan.name)
        .topic(topicPlan.topicFqn)
        .create
    }

  private def startConsumer[A, B](
    worker: ProcessorWorker[A, B],
    producer: Producer[ProducerMessageBytes],
    consumingTopicPlan: TopicPlan
  ) =
    for {
      consumer <- ZIO.attempt(
        pulsarClient.newConsumer
          .subscriptionName(worker.subscriptionPlan.name)
          .subscriptionType(worker.subscriptionPlan.subscriptionType)
          .subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
          .consumerName(worker.consumerPlan.name)
          .topic(consumingTopicPlan.topicFqn)
          .messageListener(makeMessageListener(worker, producer))
          .subscribe
      )
      _ <- ZIO.logInfo(s"Started processor consumer: \"${worker.consumerPlan.name}\" for topic ${processorPlan.consumingTopicPlan.name}")
    } yield consumer

  def start[A, B](worker: ProcessorWorker[A, B], producingTopicPlan: TopicPlan, consumingTopicPlan: TopicPlan): Task[Unit] =
    for {
      producer <- startProducer(worker.producerPlan, producingTopicPlan)
      consumer <- startConsumer(worker.consumerPlan, producer, consumingTopicPlan)
    } yield ()


case class ProcessorPlan[A, B](
  name: ProcessorName,
  consumingTopicPlan: TopicPlan,
  producingTopicPlan: TopicPlan,
  workers: Vector[ProcessorWorker[A, B]],
)
(using val converter: Convertible[A, B])
(using val tagA: ClassTag[A], val tagB: ClassTag[B])

object ProcessorPlan:
  private def makeProducerPlans(
    mkName: ProducerIndex => ProducerName,
    producerCount: Int
  ): Task[Vector[ProducerPlan]] =
    for {
      producerPlanGenerator <- ProducerPlanGenerator.make(mkName = mkName)
      producerPlans <- ZIO.foreachPar(0 until producerCount) { producerIndex =>
        ProducerPlan.make(producerPlanGenerator, producerIndex)
      }
    } yield producerPlans.toVector

  private def makeConsumerPlans(
    mkName: ConsumerIndex => ConsumerName,
    consumerCount: Int
  ): Task[Vector[ConsumerPlan]] =
    for {
      consumerPlanGenerator <- ConsumerPlanGenerator.make(mkName = mkName)
      consumerPlans <- ZIO.foreachPar(0 until consumerCount) { consumerIndex =>
        ConsumerPlan.make(consumerPlanGenerator, consumerIndex)
      }
    } yield consumerPlans.toVector

  def make[A, B](processorPlanGenerator: ProcessorPlanGenerator[A, B], processorIndex: ProcessorIndex)
                (using converter: Convertible[A, B]): Task[ProcessorPlan[A, B]] =
    for {
      consumingTopicPlan <- processorPlanGenerator.mkConsumingTopicPlan(processorIndex)
      producingTopicPlan <- processorPlanGenerator.mkProducingTopicPlan(processorIndex)
      subscriptionPlan <- processorPlanGenerator.mkSubscriptionPlan(processorIndex)
      workerCount = processorPlanGenerator.mkWorkerCount(processorIndex)
      producerPlans <- makeProducerPlans(processorPlanGenerator.mkWorkerProducerName(processorIndex), workerCount)
      consumerPlans <- makeConsumerPlans(processorPlanGenerator.mkWorkerConsumerName(processorIndex), workerCount)
      workers <- ZIO.foreachPar(producerPlans zip consumerPlans) {
        case (producerPlan, consumerPlan) =>
          ZIO.succeed(ProcessorWorker(producerPlan, subscriptionPlan, consumerPlan))
      }
    } yield
      ProcessorPlan[A, B](
        processorPlanGenerator.mkName(processorIndex),
        consumingTopicPlan,
        producingTopicPlan,
        workers,
      )(using converter)(using processorPlanGenerator.tagA, processorPlanGenerator.tagB)

case class ProcessorPlanGenerator[A, B](
  mkName: ProcessorIndex => ProcessorName,
  mkConsumingTopicPlan: ProcessorIndex => Task[TopicPlan],
  mkProducingTopicPlan: ProcessorIndex => Task[TopicPlan],
  mkSubscriptionPlan: ProcessorIndex => Task[SubscriptionPlan],
  mkWorkerCount: ProcessorIndex => Int,
  mkWorkerConsumerName: ProcessorIndex => ConsumerIndex => WorkerName,
  mkWorkerProducerName: ProcessorIndex => ProducerIndex => WorkerName,
)
(using val converter: Convertible[A, B])
(using val tagA: ClassTag[A], val tagB: ClassTag[B])

object ProcessorPlanGenerator:
  def make[A, B](
    mkName: ProcessorIndex => ProcessorName = processorIndex => s"dekaf-processor-$processorIndex",
    mkConsumingTopicPlan: ProcessorIndex => Task[TopicPlan] = _ => TopicPlan.make,
    mkProducingTopicPlan: ProcessorIndex => Task[TopicPlan] = _ => TopicPlan.make,
    mkSubscriptionPlan: ProcessorIndex => Task[SubscriptionPlan] = _ => SubscriptionPlan.make(SubscriptionType.Shared),
    mkWorkerCount: ProcessorIndex => Int = _ => 1,
    mkWorkerConsumerName: ProcessorIndex => ConsumerIndex => WorkerName =
      processorIndex => consumerIndex => s"dekaf-processor-worker-$processorIndex-$consumerIndex",
    mkWorkerProducerName: ProcessorIndex => ProducerIndex => WorkerName =
      processorIndex => producerIndex => s"dekaf-processor-worker-$processorIndex-$producerIndex",
  )
  (using converter: Convertible[A, B])
  (using tagA: ClassTag[A], tagB: ClassTag[B]) : Task[ProcessorPlanGenerator[A, B]] =
    val processorPlanGenerator = ProcessorPlanGenerator[A, B](
      mkName,
      mkConsumingTopicPlan,
      mkProducingTopicPlan,
      mkSubscriptionPlan,
      mkWorkerCount,
      mkWorkerConsumerName,
      mkWorkerProducerName,
    )
    ZIO.succeed(processorPlanGenerator)

object ProcessorPlanExecutor:
  def start[A, B](processorPlan: ProcessorPlan[A, B]): Task[Unit] =
    for {
      _ <- ZIO.logInfo(s"Starting processor: \"${processorPlan.name}\" for consuming topic: \"${processorPlan.consumingTopicPlan.name}\" and producing topic: \"${processorPlan.producingTopicPlan.name}\"")
      _ <- ZIO.foreachParDiscard(processorPlan.workers) { worker =>
        for {
          _ < ProcessorWorkerExecutor.start(worker, processorPlan.producingTopicPlan, processorPlan.consumingTopicPlan)
          _ <- ZIO.logInfo(s"Started processor worker with consumer: \"${worker.consumerPlan.name}\" and producer: \"${worker.producerPlan.name}\"")
        } yield ()
      }
    } yield ()
