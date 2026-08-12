package producer

import zio.*
import zio.test.*

import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.api.v1.producer.{
    CreateProducerRequest,
    CreateProducerResponse,
    DeleteProducerRequest,
    DeleteProducerResponse
}
import org.apache.pulsar.client.api.{Producer, ProducerBuilder, PulsarClient}
import pulsar_auth.RequestContext

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.{ConcurrentLinkedQueue, CountDownLatch, CyclicBarrier}
import scala.concurrent.duration.{Duration, SECONDS}
import scala.concurrent.{Await, Future}
import scala.jdk.CollectionConverters.*

/** The producer REGISTRY: what `createProducer`/`deleteProducer` do to the live broker producers the
  * service is holding on behalf of the UI.
  *
  * Regression context: the registry was a plain `var producers: Map[...]`, and every mutation was a
  * read-modify-write (`producers = producers + (name -> p)`) performed from `ExecutionContext.global`
  * - the service is a singleton bound on that pool in `GrpcServer`. Two creates that read the same
  * old map lose one another's entry, and a create under a name that is already registered simply
  * overwrote its predecessor. Either way a producer that is LIVE on the broker disappears from the
  * only map that knows its name, so `deleteProducer` can never close it: it holds its topic
  * connection (and, on a topic with exclusive access, blocks the next producer) until Dekaf exits.
  *
  * Everything is asserted through the SERVICE, never through the map field, so the tests describe
  * the contract rather than the data structure: a producer the registry no longer holds must have
  * been closed, and every name a create reported OK for must still be deletable.
  *
  * No broker here (the server test tier runs before Pulsar is up), so `PulsarClient`,
  * `ProducerBuilder` and `Producer` are implemented in-test with `java.lang.reflect.Proxy` - the same
  * device `consumerServiceDeleteTest` uses. `close()` appends to a queue, and that queue is the
  * oracle for "what did NOT leak".
  */
object ProducerRegistryTest extends ZIOSpecDefault:

    private val topicFqn = "persistent://public/default/registry-test"

    /** A producer that records the fact it was closed, under a label the test can recognise. */
    private def fakeProducer(label: String, closed: ConcurrentLinkedQueue[String]): Producer[Array[Byte]] =
        val handler = new InvocationHandler:
            override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                method.getName match
                    case "close" =>
                        closed.add(label)
                        null
                    case "getProducerName" => label
                    case "getTopic"        => topicFqn
                    case "equals"          => java.lang.Boolean.valueOf(proxy eq args(0))
                    case "hashCode"        => java.lang.Integer.valueOf(label.hashCode)
                    case "toString"        => s"producer-$label"
                    case _                 => null
        Proxy
            .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Producer[Array[Byte]]]), handler)
            .asInstanceOf[Producer[Array[Byte]]]

    /** A client whose only job is to hand back the next producer when `create()` is called. The
      * supplier may block - that is how a create is held inside the broker call while another one
      * races past it. */
    private def fakeClient(nextProducer: () => Producer[Array[Byte]]): PulsarClient =
        val builderHandler = new InvocationHandler:
            override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                method.getName match
                    case "create"   => nextProducer()
                    case "equals"   => java.lang.Boolean.valueOf(proxy eq args(0))
                    case "hashCode" => java.lang.Integer.valueOf(java.lang.System.identityHashCode(proxy))
                    case "toString" => "producer-builder"
                    // accessMode/producerName/topic are fluent - they return the same builder
                    case _ => proxy

        val builder = Proxy
            .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[ProducerBuilder[Array[Byte]]]), builderHandler)
            .asInstanceOf[ProducerBuilder[Array[Byte]]]

        val clientHandler = new InvocationHandler:
            override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                method.getName match
                    case "newProducer" => builder
                    case "equals"      => java.lang.Boolean.valueOf(proxy eq args(0))
                    case "hashCode"    => java.lang.Integer.valueOf(java.lang.System.identityHashCode(proxy))
                    case "toString"    => "fake-pulsar-client"
                    case _             => null

        Proxy
            .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[PulsarClient]), clientHandler)
            .asInstanceOf[PulsarClient]

    private def await[A](future: Future[A]): A = Await.result(future, Duration(30, SECONDS))

    private def create(service: ProducerServiceImpl, client: PulsarClient, name: String): CreateProducerResponse =
        await(
            io.grpc.Context
                .current()
                .withValue(RequestContext.pulsarClient, client)
                .call(() => service.createProducer(CreateProducerRequest(producerName = name, topic = topicFqn)))
        )

    private def delete(service: ProducerServiceImpl, name: String): DeleteProducerResponse =
        await(service.deleteProducer(DeleteProducerRequest(producerName = name)))

    def spec = suite(this.getClass.toString)(
        test("creating a producer under a name that is already registered closes the one it replaces") {
            // REGRESSION - the second create just overwrote the map entry. The first producer is
            // still connected to the topic and its name now points at the second one, so nothing can
            // ever close it. Reusing a producer name is ordinary: the UI re-creates a producer for
            // the same topic after an edit or a page reload.
            val closed = ConcurrentLinkedQueue[String]()
            val supply = ConcurrentLinkedQueue(List("first", "second").map(fakeProducer(_, closed)).asJava)
            val service = ProducerServiceImpl()
            val client = fakeClient(() => supply.poll())

            val firstCreate = create(service, client, "p")
            val secondCreate = create(service, client, "p")
            val closedAfterReplacement = closed.asScala.toList

            val deleted = delete(service, "p")

            assertTrue(
                firstCreate.getStatus.code == Code.OK.value,
                secondCreate.getStatus.code == Code.OK.value,
                // the predecessor is closed AT the moment it is replaced, not left to chance
                closedAfterReplacement == List("first"),
                deleted.getStatus.code == Code.OK.value,
                // and the survivor is the one delete closes - nothing is left live on the broker
                closed.asScala.toList == List("first", "second")
            ) ?? s"closedAfterReplacement=$closedAfterReplacement closed=${closed.asScala.toList}"
        },
        test("when two creates race under the same name, the producer that loses is closed, not orphaned") {
            // REGRESSION, deterministically ordered: the losing create is held inside the broker call
            // until the winning one has fully registered, so the late writer overwrites a map entry
            // it can see. With a `var Map` the overwritten producer is simply dropped; the registry
            // has to hand back whatever it displaced so the caller can close it.
            val closed = ConcurrentLinkedQueue[String]()
            val slow = fakeProducer("slow", closed)
            val fast = fakeProducer("fast", closed)

            val slowIsInsideTheBrokerCall = CountDownLatch(1)
            val releaseSlow = CountDownLatch(1)

            val service = ProducerServiceImpl()
            val slowClient = fakeClient { () =>
                slowIsInsideTheBrokerCall.countDown()
                releaseSlow.await()
                slow
            }
            val fastClient = fakeClient(() => fast)

            val slowThread = Thread(() => { create(service, slowClient, "p"); () })
            slowThread.start()

            for
                _ <- ZIO.attemptBlocking(slowIsInsideTheBrokerCall.await())
                fastCreate <- ZIO.attemptBlocking(create(service, fastClient, "p"))
                _ <- ZIO.attemptBlocking {
                    releaseSlow.countDown()
                    slowThread.join()
                }
                closedAfterRace = closed.asScala.toList
                deleted <- ZIO.attemptBlocking(delete(service, "p"))
            yield assertTrue(
                fastCreate.getStatus.code == Code.OK.value,
                // the create that arrived last displaced `fast`, so `fast` is the one to close
                closedAfterRace == List("fast"),
                deleted.getStatus.code == Code.OK.value,
                // whichever won, BOTH broker producers are accounted for
                closed.asScala.toSet == Set("fast", "slow")
            ) ?? s"closedAfterRace=$closedAfterRace closed=${closed.asScala.toList}"
        },
        test("concurrent creates under distinct names all stay deletable") {
            // REGRESSION - `producers = producers + (name -> p)` reads the map, builds a new one and
            // assigns it. Two creates that read the same snapshot lose one entry: that producer is
            // live on the broker and its name is no longer in the registry, so `deleteProducer`
            // answers FAILED_PRECONDITION forever and the connection is held until Dekaf exits.
            // Asserted as "every create the service reported OK for is still deletable", which is
            // the property a UI actually depends on.
            val closed = ConcurrentLinkedQueue[String]()
            val threadCount = 8
            val perThread = 40
            val names = (0 until threadCount * perThread).map(i => f"p$i%04d").toList

            val minted = AtomicInteger(0)
            val service = ProducerServiceImpl()
            val client = fakeClient(() => fakeProducer(s"producer-${minted.incrementAndGet()}", closed))

            val startTogether = CyclicBarrier(threadCount)
            val threads = (0 until threadCount).map { t =>
                Thread { () =>
                    startTogether.await()
                    (0 until perThread).foreach(i => create(service, client, names(t * perThread + i)))
                }
            }

            for
                _ <- ZIO.attemptBlocking {
                    threads.foreach(_.start())
                    threads.foreach(_.join())
                }
                deleteResults <- ZIO.attemptBlocking(names.map(name => name -> delete(service, name).getStatus.code))
                undeletable = deleteResults.collect { case (name, code) if code != Code.OK.value => name }
            yield assertTrue(
                minted.get == names.size, // control: every create really did reach the broker
                undeletable.isEmpty,
                // nothing survives the sweep - a lost producer is never closed by anything
                closed.size == names.size
            ) ?? s"undeletable=${undeletable.take(10)} (${undeletable.size}) closed=${closed.size} minted=${minted.get}"
        },
        test("deleting a producer closes exactly that producer and leaves its siblings registered") {
            // The control for the three above, and the guard on the delete path itself: removal and
            // close must stay a matched pair, a second delete of the same name must be refused
            // rather than closing something else, and an unrelated name must survive untouched.
            val closed = ConcurrentLinkedQueue[String]()
            val supply = ConcurrentLinkedQueue(List("a", "b").map(fakeProducer(_, closed)).asJava)
            val service = ProducerServiceImpl()
            val client = fakeClient(() => supply.poll())

            create(service, client, "a")
            create(service, client, "b")

            val deletedA = delete(service, "a")
            val closedAfterFirstDelete = closed.asScala.toList
            val deletedAgain = delete(service, "a")
            val closedAfterSecondDelete = closed.asScala.toList
            val deletedB = delete(service, "b")

            assertTrue(
                deletedA.getStatus.code == Code.OK.value,
                closedAfterFirstDelete == List("a"),
                deletedAgain.getStatus.code == Code.FAILED_PRECONDITION.value,
                closedAfterSecondDelete == List("a"), // the refusal closed nothing
                deletedB.getStatus.code == Code.OK.value,
                closed.asScala.toList == List("a", "b")
            ) ?? s"closed=${closed.asScala.toList}"
        }
    )
