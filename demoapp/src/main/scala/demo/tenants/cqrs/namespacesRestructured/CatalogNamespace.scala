package demo.tenants.cqrs.namespacesRestructured

import com.googlecode.concurrentlinkedhashmap.ConcurrentLinkedHashMap
import demo.tenants.cqrs.model.Catalog.*
import com.tools.teal.pulsar.demoapp.catalog.v1 as pb
import com.tools.teal.pulsar.demoapp.dto.v1 as pbDto
import demo.tenants.cqrs.model
import demo.tenants.cqrs.shared.*
import generators.{
    ConsumerPlanGenerator,
    Message,
    NamespacePlanGenerator,
    NonPartitioned,
    Partitioned,
    Persistent,
    ProcessorMessageListenerBuilder,
    ProcessorPlanGenerator,
    ProcessorWorker,
    ProducerPlanGenerator,
    Serde,
    SubscriptionPlanGenerator,
    TenantName,
    TopicPlanGenerator
}
import org.apache.pulsar.client.api as pulsarClientApi
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchema
import zio.{Duration, Runtime, Schedule, Unsafe, ZIO}
import app.DekafDemoApp.isAcceptingNewMessages
import client.adminClient

import java.util.UUID
import scala.jdk.FutureConverters.*

object CatalogNamespace:

    val catalogIdsMap = ConcurrentLinkedHashMap
        .Builder[UUID, Unit]()
        .maximumWeightedCapacity(10000)
        .build()

    val itemIdsMap = ConcurrentLinkedHashMap
        .Builder[UUID, Unit]()
        .maximumWeightedCapacity(10000)
        .build()

    def mkPlanGenerator(tenantName: TenantName) =
        val namespaceName = "catalog"

        val producerCommandsPlanGenerators = List(
            ProducerPlanGenerator.make(
                mkName = i => s"CreateCatalog",
                mkMessage = _ =>
                    _ =>
                        val createCatalog = model.Message.random[CreateCatalog]
                        val key = createCatalog.catalogId.toString

                        val createCatalogPb = pb.CreateCatalog
                            .newBuilder()
                            .setCatalogId(createCatalog.catalogId.toString)
                            .setTitle(createCatalog.title)
                            .setDescription(createCatalog.description)

                        val wrappedCreateCatalogPb = pb.CatalogCommandsSchema
                            .newBuilder()
                            .setCreateCatalog(createCatalogPb)
                            .build()

                        val payload = Serde.toProto[pb.CatalogCommandsSchema](wrappedCreateCatalogPb)

                        Message(payload, Some(key))
                ,
                mkSchedule = _ =>
                    Schedule.fixed(
                        Duration.fromNanos(
                            DemoAppTopicConfig.ScheduleTime.heavilyLoadedTopic
                        )
                    )
            ),
            ProducerPlanGenerator.make(
                mkName = i => s"ActivateCatalog",
                mkMessage = _ =>
                    _ =>
                        mkMessageWithRandomKeyFromMap[pb.CatalogCommandsSchema](
                            catalogIdsMap,
                            randomCatalogId => {
                                val activateCatalogPb = pb.ActivateCatalog
                                    .newBuilder()
                                    .setCatalogId(randomCatalogId.toString)

                                pb.CatalogCommandsSchema
                                    .newBuilder()
                                    .setActivateCatalog(activateCatalogPb)
                                    .build()
                            }
                        ),
                mkSchedule = _ =>
                    Schedule.fixed(
                        Duration.fromNanos(
                            DemoAppTopicConfig.ScheduleTime.moderatelyLoadedTopic
                        )
                    )
            ),
            ProducerPlanGenerator.make(
                mkName = i => s"AddCatalogItem",
                mkMessage = _ =>
                    _ =>
                        mkMessageWithRandomKeyFromMap[pb.CatalogCommandsSchema](
                            catalogIdsMap,
                            randomCatalogId => {
                                val addCatalogItem =
                                    model.Message.random[AddCatalogItem].copy(catalogId = randomCatalogId)

                                val product = pbDto.Product
                                    .newBuilder()
                                    .setDescription(addCatalogItem.product.description)
                                    .setName(addCatalogItem.product.name)
                                    .setBrand(addCatalogItem.product.brand)
                                    .setCategory(addCatalogItem.product.category)
                                    .setUnit(addCatalogItem.product.unit)
                                    .setSku(addCatalogItem.product.sku)

                                val unitPrice = pbDto.Money
                                    .newBuilder()
                                    .setCurrency(addCatalogItem.unitPrice.currency)
                                    .setAmount(addCatalogItem.unitPrice.amount)

                                val inventoryId = mkRandomKeyFromMap(WarehouseNamespace.inventoryIdsMap) match
                                    case Some(value) => value
                                    case None        => UUID.randomUUID()

                                val addCatalogItemPb = pb.AddCatalogItem
                                    .newBuilder()
                                    .setCatalogId(addCatalogItem.catalogId.toString)
                                    .setInventoryId(inventoryId.toString)
                                    .setProduct(product)
                                    .setUnitPrice(unitPrice)
                                    .setSku(addCatalogItem.sku)
                                    .setQuantity(addCatalogItem.quantity)

                                pb.CatalogCommandsSchema
                                    .newBuilder()
                                    .setAddCatalogItem(addCatalogItemPb)
                                    .build()
                            }
                        ),
                mkSchedule = _ =>
                    Schedule.fixed(
                        Duration.fromNanos(
                            DemoAppTopicConfig.ScheduleTime.moderatelyLoadedTopic
                        )
                    )
            ),
            ProducerPlanGenerator.make(
                mkName = i => s"ChangeCatalogDescription",
                mkMessage = _ =>
                    _ =>
                        mkMessageWithRandomKeyFromMap[pb.CatalogCommandsSchema](
                            catalogIdsMap,
                            randomCatalogId => {
                                val changeCatalogDescription =
                                    model.Message.random[ChangeCatalogDescription].copy(catalogId = randomCatalogId)

                                val changeCatalogDescriptionPb = pb.ChangeCatalogDescription
                                    .newBuilder()
                                    .setCatalogId(changeCatalogDescription.catalogId.toString)
                                    .setDescription(changeCatalogDescription.description)

                                pb.CatalogCommandsSchema
                                    .newBuilder()
                                    .setChangeCatalogDescription(changeCatalogDescriptionPb)
                                    .build()
                            }
                        ),
                mkSchedule = _ =>
                    Schedule.fixed(
                        Duration.fromNanos(
                            DemoAppTopicConfig.ScheduleTime.moderatelyLoadedTopic
                        )
                    )
            ),
            ProducerPlanGenerator.make(
                mkName = i => s"ChangeCatalogTitle",
                mkMessage = _ =>
                    _ =>
                        mkMessageWithRandomKeyFromMap[pb.CatalogCommandsSchema](
                            catalogIdsMap,
                            randomCatalogId => {
                                val changeCatalogTitle =
                                    model.Message.random[ChangeCatalogTitle].copy(catalogId = randomCatalogId)

                                val changeCatalogTitlePb = pb.ChangeCatalogTitle
                                    .newBuilder()
                                    .setCatalogId(changeCatalogTitle.catalogId.toString)
                                    .setTitle(changeCatalogTitle.title)

                                pb.CatalogCommandsSchema
                                    .newBuilder()
                                    .setChangeCatalogTitle(changeCatalogTitlePb)
                                    .build()
                            }
                        ),
                mkSchedule = _ =>
                    Schedule.fixed(
                        Duration.fromNanos(
                            DemoAppTopicConfig.ScheduleTime.lightlyLoadedTopic
                        )
                    )
            ),
            ProducerPlanGenerator.make(
                mkName = i => s"DeactivateCatalog",
                mkMessage = _ =>
                    _ =>
                        mkMessageWithRandomKeyFromMap[pb.CatalogCommandsSchema](
                            catalogIdsMap,
                            randomCatalogId => {
                                val deactivateCatalogPb = pb.DeactivateCatalog
                                    .newBuilder()
                                    .setCatalogId(randomCatalogId.toString)

                                pb.CatalogCommandsSchema
                                    .newBuilder()
                                    .setDeactivateCatalog(deactivateCatalogPb)
                                    .build()
                            }
                        ),
                mkSchedule = _ =>
                    Schedule.fixed(
                        Duration.fromNanos(
                            DemoAppTopicConfig.ScheduleTime.moderatelyLoadedTopic
                        )
                    )
            ),
            ProducerPlanGenerator.make(
                mkName = i => s"DeleteCatalog",
                mkMessage = _ =>
                    _ =>
                        mkMessageWithRandomKeyFromMap[pb.CatalogCommandsSchema](
                            catalogIdsMap,
                            randomCatalogId => {
                                val deleteCatalogPb = pb.DeleteCatalog
                                    .newBuilder()
                                    .setCatalogId(randomCatalogId.toString)

                                pb.CatalogCommandsSchema
                                    .newBuilder()
                                    .setDeleteCatalog(deleteCatalogPb)
                                    .build()
                            }
                        ),
                mkSchedule = _ =>
                    Schedule.fixed(
                        Duration.fromNanos(
                            DemoAppTopicConfig.ScheduleTime.moderatelyLoadedTopic
                        )
                    )
            ),
            ProducerPlanGenerator.make(
                mkName = i => s"RemoveCatalogItem",
                mkMessage = _ =>
                    _ =>
                        mkMessageWithRandomKeyFromMap[pb.CatalogCommandsSchema](
                            catalogIdsMap,
                            randomCatalogId => {
                                val removeCatalogItem =
                                    model.Message.random[RemoveCatalogItem].copy(catalogId = randomCatalogId)

                                val removeCatalogItemPb = pb.RemoveCatalogItem
                                    .newBuilder()
                                    .setCatalogId(removeCatalogItem.catalogId.toString)
                                    .setItemId(removeCatalogItem.itemId.toString)

                                pb.CatalogCommandsSchema
                                    .newBuilder()
                                    .setRemoveCatalogItem(removeCatalogItemPb)
                                    .build()
                            }
                        ),
                mkSchedule = _ =>
                    Schedule.fixed(
                        Duration.fromNanos(
                            DemoAppTopicConfig.ScheduleTime.overloadedTopic
                        )
                    )
            )
        )

        val producerEventsPlanGenerators = List(
            ProducerPlanGenerator.make(
                mkName = i => s"CatalogItemIncreased",
                mkMessage = _ =>
                    _ =>
                        mkMessageWithRandomKeyFromMap[pb.CatalogEventsSchema](
                            catalogIdsMap,
                            randomCatalogId => {
                                val catalogItemIncreased =
                                    model.Message.random[CatalogItemIncreased].copy(catalogId = randomCatalogId)

                                val inventoryId = mkRandomKeyFromMap(WarehouseNamespace.inventoryIdsMap) match
                                    case Some(value) => value
                                    case None        => UUID.randomUUID()

                                val catalogItemIncreasedPb = pb.CatalogItemIncreased
                                    .newBuilder()
                                    .setCatalogId(catalogItemIncreased.catalogId.toString)
                                    .setItemId(catalogItemIncreased.itemId.toString)
                                    .setInventoryId(inventoryId.toString)
                                    .setQuantity(catalogItemIncreased.quantity)
                                    .setVersion(catalogItemIncreased.version)

                                pb.CatalogEventsSchema
                                    .newBuilder()
                                    .setCatalogItemIncreased(catalogItemIncreasedPb)
                                    .build()
                            }
                        ),
                mkSchedule = _ =>
                    Schedule.fixed(
                        Duration.fromNanos(
                            DemoAppTopicConfig.ScheduleTime.lightlyLoadedTopic
                        )
                    )
            )
        )

        val catalogCommandsSchemaInfo = ProtobufNativeSchema.of(classOf[pb.CatalogCommandsSchema]).getSchemaInfo
        val catalogEventsSchemaInfo = ProtobufNativeSchema.of(classOf[pb.CatalogEventsSchema]).getSchemaInfo

        val catalogCommandsTopicPlanGenerator = TopicPlanGenerator.make(
            mkTenant = () => tenantName,
            mkName = _ => "commands",
            mkNamespace = () => namespaceName,
            mkProducersCount = i => producerCommandsPlanGenerators.size,
            mkProducerGenerator = producerIndex => producerCommandsPlanGenerators(producerIndex),
            mkPartitioning = _ => NonPartitioned(),
            mkPersistency = _ => Persistent(),
            mkSchemaInfos = _ => List(catalogCommandsSchemaInfo),
            mkSubscriptionsCount = i => DemoAppTopicConfig.SubscriptionAmount.lightlyLoadedTopic,
            mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared,
            mkSubscriptionGenerator = _ =>
                SubscriptionPlanGenerator.make(
                    mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared,
                    mkConsumersCount = i => DemoAppTopicConfig.ConsumerAmount.lightlyLoadedTopic,
                    mkConsumerGenerator = _ => ConsumerPlanGenerator.make()
                )
        )

        val catalogEventsTopicPlanGenerator = TopicPlanGenerator.make(
            mkTenant = () => tenantName,
            mkName = _ => "events",
            mkNamespace = () => namespaceName,
            mkProducersCount = i => producerEventsPlanGenerators.size,
            mkProducerGenerator = producerIndex => producerEventsPlanGenerators(producerIndex),
            mkPartitioning = _ => Partitioned(5),
            mkPersistency = _ => Persistent(),
            mkSchemaInfos = _ => List(catalogEventsSchemaInfo),
            mkSubscriptionsCount = i => DemoAppTopicConfig.SubscriptionAmount.moderatelyLoadedTopic,
            mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared,
            mkSubscriptionGenerator = _ =>
                SubscriptionPlanGenerator.make(
                    mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared,
                    mkConsumersCount = i => DemoAppTopicConfig.ConsumerAmount.moderatelyLoadedTopic,
                    mkConsumerGenerator = _ => ConsumerPlanGenerator.make()
                )
        )

        val processorPlanGenerator =
            ProcessorPlanGenerator.make[pb.CatalogCommandsSchema, pb.CatalogEventsSchema](
                mkName = _ => "CatalogProcessor",
                mkConsumingTopicPlan = _ => mkTopicPlan(catalogCommandsTopicPlanGenerator, 0),
                mkProducingTopicPlan = _ => mkTopicPlan(catalogEventsTopicPlanGenerator, 0),
                mkSubscriptionPlan = _ => mkSubscriptionPlan("CatalogProcessorSubscription"),
                mkWorkerCount = _ => DemoAppTopicConfig.workersAmount,
                mkWorkerConsumerName = _ => i => s"CatalogProcessor-$i",
                mkWorkerProducerName = _ => i => s"CatalogProcessor-$i",
                mkMessageListenerBuilder = _ => mkMessageListener
            )

        val topicPlanGenerators = List(catalogCommandsTopicPlanGenerator, catalogEventsTopicPlanGenerator)

        NamespacePlanGenerator.make(
            mkTenant = () => tenantName,
            mkName = _ => namespaceName,
            mkTopicsCount = _ => topicPlanGenerators.size,
            mkTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
            mkProcessorsCount = _ => 1,
            mkProcessorGenerator = processorIndex => processorPlanGenerator,
            mkAfterAllocation = _ => {
                val namespaceFqn = s"$tenantName/$namespaceName"
                adminClient.namespaces.setSchemaValidationEnforced(namespaceFqn, true)
            }
        )

    def mkMessageListener: ProcessorMessageListenerBuilder[pb.CatalogCommandsSchema, pb.CatalogEventsSchema] =
        (
            worker: ProcessorWorker[pb.CatalogCommandsSchema, pb.CatalogEventsSchema],
            producer: pulsarClientApi.Producer[pb.CatalogEventsSchema]
        ) =>
            (
                consumer: pulsarClientApi.Consumer[pb.CatalogCommandsSchema],
                msg: pulsarClientApi.Message[pb.CatalogCommandsSchema]
            ) =>
                if !isAcceptingNewMessages then consumer.negativeAcknowledge(msg)
                else
                    try
                        val messageKey = msg.getKey

                        val msgValue = pb.CatalogCommandsSchema.parseFrom(msg.getData)

                        val eventMessageValue: pb.CatalogEventsSchema = msgValue.getCommandCase match
                            case pb.CatalogCommandsSchema.CommandCase.ACTIVATE_CATALOG =>
                                val activateCatalogPb = msgValue.getActivateCatalog

                                val catalogActivated = model.Message.random[CatalogActivated]

                                val catalogActivatedPb = pb.CatalogActivated
                                    .newBuilder()
                                    .setCatalogId(activateCatalogPb.getCatalogId)
                                    .setVersion(catalogActivated.version)

                                pb.CatalogEventsSchema
                                    .newBuilder()
                                    .setCatalogActivated(catalogActivatedPb)
                                    .build()
                            case pb.CatalogCommandsSchema.CommandCase.ADD_CATALOG_ITEM =>
                                val addCatalogItemPb = msgValue.getAddCatalogItem

                                val catalogItemAdded = model.Message.random[CatalogItemAdded]

                                val newItemId = UUID.randomUUID()

                                try itemIdsMap.put(newItemId, ())
                                catch case e: Throwable => ()

                                val catalogItemAddedPb = pb.CatalogItemAdded
                                    .newBuilder()
                                    .setCatalogId(addCatalogItemPb.getCatalogId)
                                    .setItemId(newItemId.toString)
                                    .setInventoryId(addCatalogItemPb.getInventoryId)
                                    .setQuantity(addCatalogItemPb.getQuantity)
                                    .setVersion(catalogItemAdded.version)

                                pb.CatalogEventsSchema
                                    .newBuilder()
                                    .setCatalogItemAdded(catalogItemAddedPb)
                                    .build()
                            case pb.CatalogCommandsSchema.CommandCase.CHANGE_CATALOG_DESCRIPTION =>
                                val changeCatalogDescriptionPb = msgValue.getChangeCatalogDescription

                                val catalogDescriptionChanged = model.Message.random[CatalogDescriptionChanged]

                                val catalogDescriptionChangedPb = pb.CatalogDescriptionChanged
                                    .newBuilder()
                                    .setCatalogId(changeCatalogDescriptionPb.getCatalogId)
                                    .setDescription(changeCatalogDescriptionPb.getDescription)
                                    .setVersion(catalogDescriptionChanged.version)

                                pb.CatalogEventsSchema
                                    .newBuilder()
                                    .setCatalogDescriptionChanged(catalogDescriptionChangedPb)
                                    .build()
                            case pb.CatalogCommandsSchema.CommandCase.CHANGE_CATALOG_TITLE =>
                                val changeCatalogTitlePb = msgValue.getChangeCatalogTitle

                                val catalogTitleChanged = model.Message.random[CatalogTitleChanged]

                                val catalogTitleChangedPb = pb.CatalogTitleChanged
                                    .newBuilder()
                                    .setCatalogId(changeCatalogTitlePb.getCatalogId)
                                    .setTitle(changeCatalogTitlePb.getTitle)
                                    .setVersion(catalogTitleChanged.version)

                                pb.CatalogEventsSchema
                                    .newBuilder()
                                    .setCatalogTitleChanged(catalogTitleChangedPb)
                                    .build()
                            case pb.CatalogCommandsSchema.CommandCase.CREATE_CATALOG =>
                                val createCatalogPb = msgValue.getCreateCatalog

                                val catalogCreated = model.Message.random[CatalogCreated]

                                val catalogCreatedPb = pb.CatalogCreated
                                    .newBuilder()
                                    .setCatalogId(createCatalogPb.getCatalogId)
                                    .setTitle(createCatalogPb.getTitle)
                                    .setDescription(createCatalogPb.getDescription)
                                    .setVersion(catalogCreated.version)

                                try catalogIdsMap.put(UUID.fromString(createCatalogPb.getCatalogId), ())
                                catch case e: Throwable => ()

                                pb.CatalogEventsSchema
                                    .newBuilder()
                                    .setCatalogCreated(catalogCreatedPb)
                                    .build()
                            case pb.CatalogCommandsSchema.CommandCase.DEACTIVATE_CATALOG =>
                                val deactivateCatalogPb = msgValue.getDeactivateCatalog

                                val catalogDeactivated = model.Message.random[CatalogDeactivated]

                                val catalogDeactivatedPb = pb.CatalogDeactivated
                                    .newBuilder()
                                    .setCatalogId(deactivateCatalogPb.getCatalogId)
                                    .setVersion(catalogDeactivated.version)

                                pb.CatalogEventsSchema
                                    .newBuilder()
                                    .setCatalogDeactivated(catalogDeactivatedPb)
                                    .build()
                            case pb.CatalogCommandsSchema.CommandCase.DELETE_CATALOG =>
                                val deleteCatalogPb = msgValue.getDeleteCatalog

                                val catalogDeleted = model.Message.random[CatalogDeleted]

                                val catalogDeletedPb = pb.CatalogDeleted
                                    .newBuilder()
                                    .setCatalogId(deleteCatalogPb.getCatalogId)
                                    .setVersion(catalogDeleted.version)

                                try catalogIdsMap.remove(UUID.fromString(deleteCatalogPb.getCatalogId))
                                catch case e: Throwable => ()

                                pb.CatalogEventsSchema
                                    .newBuilder()
                                    .setCatalogDeleted(catalogDeletedPb)
                                    .build()
                            case pb.CatalogCommandsSchema.CommandCase.REMOVE_CATALOG_ITEM =>
                                val removeCatalogItemPb = msgValue.getRemoveCatalogItem

                                val catalogItemRemoved = model.Message.random[CatalogItemRemoved]

                                val catalogItemRemovedPb = pb.CatalogItemRemoved
                                    .newBuilder()
                                    .setCatalogId(removeCatalogItemPb.getCatalogId)
                                    .setItemId(removeCatalogItemPb.getItemId)
                                    .setVersion(catalogItemRemoved.version)

                                try itemIdsMap.remove(UUID.fromString(removeCatalogItemPb.getItemId))
                                catch case e: Throwable => ()

                                pb.CatalogEventsSchema
                                    .newBuilder()
                                    .setCatalogItemRemoved(catalogItemRemovedPb)
                                    .build()
                            case pb.CatalogCommandsSchema.CommandCase.COMMAND_NOT_SET =>
                                throw RuntimeException("Command not set")

                        val effect = for {
                            _ <- worker.producerPlan.messageIndex.update(_ + 1)
                            _ <- ZIO.fromFuture(e =>
                                (producer
                                    .asInstanceOf[pulsarClientApi.Producer[Array[Byte]]])
                                    .newMessage
                                    .key(messageKey)
                                    .value(eventMessageValue.toByteArray)
                                    .sendAsync
                                    .asScala
                            )
                        } yield ()

                        Unsafe.unsafe(implicit u => Runtime.default.unsafe.run(effect))

                        consumer.acknowledge(msg)
                    catch
                        case e: Throwable =>
                            consumer.acknowledge(msg)
