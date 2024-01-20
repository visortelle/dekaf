package demo.tenants.cqrs.namespacesRestructured

import com.google.protobuf.Timestamp
import com.googlecode.concurrentlinkedhashmap.ConcurrentLinkedHashMap
import demo.tenants.cqrs.model.Warehouse.*
import com.tools.teal.pulsar.demoapp.warehouse.v1 as pb
import com.tools.teal.pulsar.demoapp.dto.v1 as pbDto
import demo.tenants.cqrs.model
import demo.tenants.cqrs.shared.*
import generators.{ConsumerPlanGenerator, Message, NamespacePlanGenerator, ProcessorMessageListenerBuilder, ProcessorPlanGenerator, ProcessorWorker, ProducerPlanGenerator, Serde, SubscriptionPlanGenerator, TenantName, TopicPlanGenerator}
import org.apache.pulsar.client.api as pulsarClientApi
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchema
import zio.{Duration, Runtime, Schedule, Unsafe, ZIO}

import java.util.UUID
import scala.jdk.FutureConverters.*

object WarehouseNamespace:

  val inventoryIdsMap = ConcurrentLinkedHashMap.Builder[UUID, Unit]()
    .maximumWeightedCapacity(10000)
    .build()

  def mkPlanGenerator(tenantName: TenantName) =
    val namespaceName = "Warehouse"

    val producerCommandsPlanGenerators = List(
      ProducerPlanGenerator.make(
        mkName = i => s"CreateInventory",
        mkMessage = _ => _ =>
          val createInventory = model.Message.random[CreateInventory]
          val key = createInventory.inventoryId.toString

          val createInventoryPb = pb.CreateInventory.newBuilder()
            .setInventoryId(createInventory.inventoryId.toString)
            .setOwnerId(createInventory.ownerId.toString)

          val wrappedCreateInventoryPb = pb.WarehouseCommandsSchema.newBuilder()
            .setCreateInventory(createInventoryPb)
            .build()

          val payload = Serde.toProto[pb.WarehouseCommandsSchema](wrappedCreateInventoryPb)

          Message(payload, Some(key))
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.heavilyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ReceiveInventoryItem",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.WarehouseCommandsSchema](inventoryIdsMap, randomInventoryId => {
            val receiveInventoryItem = model.Message.random[ReceiveInventoryItem].copy(inventoryId = randomInventoryId)

            val product = pbDto.Product.newBuilder()
              .setDescription(receiveInventoryItem.product.description)
              .setName(receiveInventoryItem.product.name)
              .setBrand(receiveInventoryItem.product.brand)
              .setCategory(receiveInventoryItem.product.category)
              .setUnit(receiveInventoryItem.product.unit)
              .setSku(receiveInventoryItem.product.sku)

            val receiveInventoryItemPb = pb.ReceiveInventoryItem.newBuilder()
              .setInventoryId(receiveInventoryItem.inventoryId.toString)
              .setProduct(product)
              .setCost(receiveInventoryItem.cost.toString)
              .setQuantity(receiveInventoryItem.quantity)

            pb.WarehouseCommandsSchema.newBuilder()
              .setReceiveInventoryItem(receiveInventoryItemPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"IncreaseInventoryAdjust",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.WarehouseCommandsSchema](inventoryIdsMap, randomInventoryId => {
            val increaseInventoryAdjust = model.Message.random[IncreaseInventoryAdjust].copy(inventoryId = randomInventoryId)

            val itemId = mkRandomKeyFromMap(CatalogNamespace.itemIdsMap) match
              case Some(value) => value
              case None => UUID.randomUUID()

            val increaseInventoryAdjustPb = pb.IncreaseInventoryAdjust.newBuilder()
              .setInventoryId(increaseInventoryAdjust.inventoryId.toString)
              .setItemId(itemId.toString)
              .setReason(increaseInventoryAdjust.reason)
              .setQuantity(increaseInventoryAdjust.quantity)

            pb.WarehouseCommandsSchema.newBuilder()
              .setIncreaseInventoryAdjust(increaseInventoryAdjustPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DecreaseInventoryAdjust",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.WarehouseCommandsSchema](inventoryIdsMap, randomInventoryId => {
            val decreaseInventoryAdjust = model.Message.random[DecreaseInventoryAdjust].copy(inventoryId = randomInventoryId)

            val itemId = mkRandomKeyFromMap(CatalogNamespace.itemIdsMap) match
              case Some(value) => value
              case None => UUID.randomUUID()

            val decreaseInventoryAdjustPb = pb.DecreaseInventoryAdjust.newBuilder()
              .setInventoryId(decreaseInventoryAdjust.inventoryId.toString)
              .setItemId(itemId.toString)
              .setReason(decreaseInventoryAdjust.reason)
              .setQuantity(decreaseInventoryAdjust.quantity)

            pb.WarehouseCommandsSchema.newBuilder()
              .setDecreaseInventoryAdjust(decreaseInventoryAdjustPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ReserveInventoryItem",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.WarehouseCommandsSchema](inventoryIdsMap, randomInventoryId => {
            val reserveInventoryItem = model.Message.random[ReserveInventoryItem].copy(inventoryId = randomInventoryId)

            val catalogId = mkRandomKeyFromMap(CatalogNamespace.catalogIdsMap) match
              case Some(value) => value
              case None => UUID.randomUUID()

            val product = pbDto.Product.newBuilder()
              .setDescription(reserveInventoryItem.product.description)
              .setName(reserveInventoryItem.product.name)
              .setBrand(reserveInventoryItem.product.brand)
              .setCategory(reserveInventoryItem.product.category)
              .setUnit(reserveInventoryItem.product.unit)
              .setSku(reserveInventoryItem.product.sku)

            val reserveInventoryItemPb = pb.ReserveInventoryItem.newBuilder()
              .setInventoryId(reserveInventoryItem.inventoryId.toString)
              .setCatalogId(catalogId.toString)
              .setCartId(reserveInventoryItem.cartId.toString)
              .setProduct(product)
              .setQuantity(reserveInventoryItem.quantity)

            pb.WarehouseCommandsSchema.newBuilder()
              .setReserveInventoryItem(reserveInventoryItemPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
    )

    val producerEventsPlanGenerators = List(
      ProducerPlanGenerator.make(
        mkName = i => s"InventoryAdjustmentNotDecreased",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.WarehouseEventsSchema](inventoryIdsMap, randomInventoryId => {
            val inventoryAdjustmentNotDecreased = model.Message.random[InventoryAdjustmentNotDecreased].copy(inventoryId = randomInventoryId)

            val itemId = mkRandomKeyFromMap(CatalogNamespace.itemIdsMap) match
              case Some(value) => value
              case None => UUID.randomUUID()

            val inventoryAdjustmentNotDecreasedPb = pb.InventoryAdjustmentNotDecreased.newBuilder()
              .setInventoryId(inventoryAdjustmentNotDecreased.inventoryId.toString)
              .setItemId(itemId.toString)
              .setReason(inventoryAdjustmentNotDecreased.reason)
              .setQuantityDesired(inventoryAdjustmentNotDecreased.quantityDesired)
              .setQuantityAvailable(inventoryAdjustmentNotDecreased.quantityAvailable)
              .setVersion(inventoryAdjustmentNotDecreased.version)

            pb.WarehouseEventsSchema.newBuilder()
              .setInventoryAdjustmentNotDecreased(inventoryAdjustmentNotDecreasedPb)
              .build()
          }),
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"StockDepleted",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.WarehouseEventsSchema](inventoryIdsMap, randomInventoryId => {
            val stockDepleted = model.Message.random[StockDepleted].copy(inventoryId = randomInventoryId)

            val itemId = mkRandomKeyFromMap(CatalogNamespace.itemIdsMap) match
              case Some(value) => value
              case None => UUID.randomUUID()

            val product = pbDto.Product.newBuilder()
              .setDescription(stockDepleted.product.description)
              .setName(stockDepleted.product.name)
              .setBrand(stockDepleted.product.brand)
              .setCategory(stockDepleted.product.category)
              .setUnit(stockDepleted.product.unit)
              .setSku(stockDepleted.product.sku)

            val stockDepletedPb = pb.StockDepleted.newBuilder()
              .setInventoryId(stockDepleted.inventoryId.toString)
              .setItemId(itemId.toString)
              .setProduct(product)
              .setVersion(stockDepleted.version)

            pb.WarehouseEventsSchema.newBuilder()
              .setStockDepleted(stockDepletedPb)
              .build()
          }),
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"InventoryItemNotReserved",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.WarehouseEventsSchema](inventoryIdsMap, randomInventoryId => {
            val inventoryItemNotReserved = model.Message.random[InventoryItemNotReserved].copy(inventoryId = randomInventoryId)

            val itemId = mkRandomKeyFromMap(CatalogNamespace.itemIdsMap) match
              case Some(value) => value
              case None => UUID.randomUUID()

            val inventoryItemNotReservedPb = pb.InventoryItemNotReserved.newBuilder()
              .setInventoryId(inventoryItemNotReserved.inventoryId.toString)
              .setItemId(itemId.toString)
              .setCartId(inventoryItemNotReserved.cartId.toString) // TODO: change to Cart Id
              .setQuantityDesired(inventoryItemNotReserved.quantityDesired)
              .setQuantityAvailable(inventoryItemNotReserved.quantityAvailable)
              .setVersion(inventoryItemNotReserved.version)

            pb.WarehouseEventsSchema.newBuilder()
              .setInventoryItemNotReserved(inventoryItemNotReservedPb)
              .build()
          }),
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"InventoryItemIncreased",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.WarehouseEventsSchema](inventoryIdsMap, randomInventoryId => {
            val inventoryItemIncreased = model.Message.random[InventoryItemIncreased].copy(inventoryId = randomInventoryId)

            val itemId = mkRandomKeyFromMap(CatalogNamespace.itemIdsMap) match
              case Some(value) => value
              case None => UUID.randomUUID()

            val inventoryItemIncreasedPb = pb.InventoryItemIncreased.newBuilder()
              .setInventoryId(inventoryItemIncreased.inventoryId.toString)
              .setItemId(itemId.toString)
              .setQuantity(inventoryItemIncreased.quantity)
              .setVersion(inventoryItemIncreased.version)

            pb.WarehouseEventsSchema.newBuilder()
              .setInventoryItemIncreased(inventoryItemIncreasedPb)
              .build()
          }),
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"InventoryItemDecreased",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.WarehouseEventsSchema](inventoryIdsMap, randomInventoryId => {
            val inventoryItemDecreased = model.Message.random[InventoryItemDecreased].copy(inventoryId = randomInventoryId)

            val itemId = mkRandomKeyFromMap(CatalogNamespace.itemIdsMap) match
              case Some(value) => value
              case None => UUID.randomUUID()

            val inventoryItemDecreasedPb = pb.InventoryItemDecreased.newBuilder()
              .setInventoryId(inventoryItemDecreased.inventoryId.toString)
              .setItemId(itemId.toString)
              .setQuantity(inventoryItemDecreased.quantity)
              .setVersion(inventoryItemDecreased.version)

            pb.WarehouseEventsSchema.newBuilder()
              .setInventoryItemDecreased(inventoryItemDecreasedPb)
              .build()
          }),
      ),
    )

    val warehouseCommandsSchemaInfo = ProtobufNativeSchema.of(classOf[pb.WarehouseCommandsSchema]).getSchemaInfo
    val warehouseEventsSchemaInfo = ProtobufNativeSchema.of(classOf[pb.WarehouseEventsSchema]).getSchemaInfo

    val warehouseCommandsTopicPlanGenerator = TopicPlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => "Commands",
      mkNamespace = () => namespaceName,
      mkProducersCount = i => producerCommandsPlanGenerators.size,
      mkProducerGenerator = producerIndex => producerCommandsPlanGenerators(producerIndex),
      mkPartitioning = mkDefaultTopicPartitioning,
      mkPersistency = mkDefaultPersistency,
      mkSchemaInfos = _ => List(warehouseCommandsSchemaInfo),
      mkSubscriptionsCount = i => DemoappTopicConfig.SubscriptionAmount.lightlyLoadedTopic,
      mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared,
      mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
        mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared,
        mkConsumersCount = i => DemoappTopicConfig.ConsumerAmount.lightlyLoadedTopic,
        mkConsumerGenerator = _ => ConsumerPlanGenerator.make()
      )
    )

    val warehouseEventsTopicPlanGenerator = TopicPlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => "Events",
      mkNamespace = () => namespaceName,
      mkProducersCount = i => producerEventsPlanGenerators.size,
      mkProducerGenerator = producerIndex => producerEventsPlanGenerators(producerIndex),
      mkPartitioning = mkDefaultTopicPartitioning,
      mkPersistency = mkDefaultPersistency,
      mkSchemaInfos = _ => List(warehouseEventsSchemaInfo),
      mkSubscriptionsCount = i => DemoappTopicConfig.SubscriptionAmount.moderatelyLoadedTopic,
      mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared,
      mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
        mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared,
        mkConsumersCount = i => DemoappTopicConfig.ConsumerAmount.heavilyLoadedTopic,
        mkConsumerGenerator = _ => ConsumerPlanGenerator.make()
      )
    )

    val processorPlanGenerator =
      ProcessorPlanGenerator.make[pb.WarehouseCommandsSchema, pb.WarehouseEventsSchema](
        mkName = _ => "WarehouseProcessor",
        mkConsumingTopicPlan = _ => mkTopicPlan(warehouseCommandsTopicPlanGenerator, 0),
        mkProducingTopicPlan = _ => mkTopicPlan(warehouseEventsTopicPlanGenerator, 0),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("WarehouseProcessorSubscription"),
        mkWorkerCount = _ => DemoappTopicConfig.workersAmount,
        mkWorkerConsumerName = _ => i => s"WarehouseProcessor-$i",
        mkWorkerProducerName = _ => i => s"WarehouseProcessor-$i",
        mkMessageListenerBuilder = _ => mkMessageListener
      )

    val topicPlanGenerators = List(warehouseCommandsTopicPlanGenerator, warehouseEventsTopicPlanGenerator)

    NamespacePlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => namespaceName,
      mkTopicsCount = _ => topicPlanGenerators.size,
      mkTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
      mkProcessorsCount = _ => 1,
      mkProcessorGenerator = processorIndex => processorPlanGenerator,
      mkAfterAllocation = _ => ()
    )

  def mkMessageListener: ProcessorMessageListenerBuilder[pb.WarehouseCommandsSchema, pb.WarehouseEventsSchema] =
    (worker: ProcessorWorker[pb.WarehouseCommandsSchema, pb.WarehouseEventsSchema], producer: pulsarClientApi.Producer[pb.WarehouseEventsSchema]) =>
      (consumer: pulsarClientApi.Consumer[pb.WarehouseCommandsSchema], msg: pulsarClientApi.Message[pb.WarehouseCommandsSchema]) =>
        try
          val messageKey = msg.getKey

          val msgValue = pb.WarehouseCommandsSchema.parseFrom(msg.getData)

          val eventMessageValue: pb.WarehouseEventsSchema = msgValue.getCommandCase match
            case pb.WarehouseCommandsSchema.CommandCase.CREATE_INVENTORY =>
              val createInventoryPb = msgValue.getCreateInventory

              val inventoryCreated = model.Message.random[InventoryCreated]

              val inventoryCreatedPb = pb.InventoryCreated.newBuilder()
                .setInventoryId(createInventoryPb.getInventoryId)
                .setOwnerId(createInventoryPb.getOwnerId)
                .setVersion(inventoryCreated.version)

              try inventoryIdsMap.put(UUID.fromString(createInventoryPb.getInventoryId), ())
              catch case e: Throwable => ()

              pb.WarehouseEventsSchema.newBuilder()
                .setInventoryCreated(inventoryCreatedPb)
                .build()
            case pb.WarehouseCommandsSchema.CommandCase.RECEIVE_INVENTORY_ITEM =>
              val receiveInventoryItemPb = msgValue.getReceiveInventoryItem

              val inventoryItemReceived = model.Message.random[InventoryItemReceived]

              val itemId = mkRandomKeyFromMap(CatalogNamespace.itemIdsMap) match
                case Some(value) => value
                case None => UUID.randomUUID()

              val inventoryItemReceivedPb = pb.InventoryItemReceived.newBuilder()
                .setInventoryId(receiveInventoryItemPb.getInventoryId)
                .setItemId(itemId.toString)
                .setProduct(receiveInventoryItemPb.getProduct)
                .setCost(receiveInventoryItemPb.getCost)
                .setQuantity(receiveInventoryItemPb.getQuantity)
                .setSku(inventoryItemReceived.sku)
                .setVersion(inventoryItemReceived.version)

              pb.WarehouseEventsSchema.newBuilder()
                .setInventoryItemReceived(inventoryItemReceivedPb)
                .build()
            case pb.WarehouseCommandsSchema.CommandCase.INCREASE_INVENTORY_ADJUST =>
              val increaseInventoryAdjust = msgValue.getIncreaseInventoryAdjust

              val inventoryAdjustmentIncreased = model.Message.random[InventoryAdjustmentIncreased]

              val inventoryAdjustmentIncreasedPb = pb.InventoryAdjustmentIncreased.newBuilder()
                .setInventoryId(increaseInventoryAdjust.getInventoryId)
                .setItemId(increaseInventoryAdjust.getItemId)
                .setReason(increaseInventoryAdjust.getReason)
                .setQuantity(increaseInventoryAdjust.getQuantity)
                .setVersion(inventoryAdjustmentIncreased.version)

              pb.WarehouseEventsSchema.newBuilder()
                .setInventoryAdjustmentIncreased(inventoryAdjustmentIncreasedPb)
                .build()
            case pb.WarehouseCommandsSchema.CommandCase.DECREASE_INVENTORY_ADJUST =>
              val decreaseInventoryAdjustPb = msgValue.getDecreaseInventoryAdjust

              val inventoryAdjustmentDecreased = model.Message.random[InventoryAdjustmentDecreased]

              val itemId = mkRandomKeyFromMap(CatalogNamespace.itemIdsMap) match
                case Some(value) => value
                case None => UUID.randomUUID()

              val inventoryAdjustmentDecreasedPb = pb.InventoryAdjustmentDecreased.newBuilder()
                .setInventoryId(decreaseInventoryAdjustPb.getInventoryId)
                .setItemId(itemId.toString)
                .setReason(decreaseInventoryAdjustPb.getReason)
                .setQuantity(decreaseInventoryAdjustPb.getQuantity)
                .setVersion(inventoryAdjustmentDecreased.version)

              pb.WarehouseEventsSchema.newBuilder()
                .setInventoryAdjustmentDecreased(inventoryAdjustmentDecreasedPb)
                .build()
            case pb.WarehouseCommandsSchema.CommandCase.RESERVE_INVENTORY_ITEM =>
              val reserveInventoryItemPb = msgValue.getReserveInventoryItem

              val inventoryItemReserved = model.Message.random[InventoryItemReserved]

              val itemId = mkRandomKeyFromMap(CatalogNamespace.itemIdsMap) match
                case Some(value) => value
                case None => UUID.randomUUID()

              val expirationDate = Timestamp.newBuilder()
                .setSeconds(inventoryItemReserved.expirationDate.toInstant.getEpochSecond)
                .setNanos(inventoryItemReserved.expirationDate.toInstant.getNano)

              val inventoryItemReservedPb = pb.InventoryItemReserved.newBuilder()
                .setInventoryId(reserveInventoryItemPb.getInventoryId)
                .setItemId(itemId.toString)
                .setCatalogId(reserveInventoryItemPb.getCatalogId)
                .setCartId(reserveInventoryItemPb.getCartId) // TODO: change to Cart Id
                .setProduct(reserveInventoryItemPb.getProduct)
                .setQuantity(reserveInventoryItemPb.getQuantity)
                .setExpirationDate(expirationDate)
                .setVersion(inventoryItemReserved.version)

              pb.WarehouseEventsSchema.newBuilder()
                .setInventoryItemReserved(inventoryItemReservedPb)
                .build()
            case pb.WarehouseCommandsSchema.CommandCase.COMMAND_NOT_SET => throw RuntimeException("Command not set")

          val effect = for {
            _ <- worker.producerPlan.messageIndex.update(_ + 1)
            _ <- ZIO.fromFuture(e =>
              (producer.asInstanceOf[pulsarClientApi.Producer[Array[Byte]]]).newMessage
                .key(messageKey)
                .value(eventMessageValue.toByteArray)
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
