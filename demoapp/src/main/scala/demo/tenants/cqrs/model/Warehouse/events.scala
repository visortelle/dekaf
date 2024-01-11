package demo.tenants.cqrs.model.Warehouse

import demo.tenants.cqrs.model.Dto.Product
import demo.tenants.cqrs.model.{Event, Randomizable, Schemable}
import demo.tenants.cqrs.shared.*
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.time.{OffsetDateTime, ZoneOffset}
import java.util.UUID
import java.util.concurrent.TimeUnit

case class InventoryCreated(inventoryId: UUID, ownerId: UUID, version: Long) extends Event

object InventoryCreated extends Randomizable[InventoryCreated] with Schemable[InventoryCreated]:
  override def random: InventoryCreated = InventoryCreated(
    inventoryId = UUID.randomUUID(),
    ownerId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[InventoryCreated] =
    JSONSchema.of(classOf[InventoryCreated])

  given Randomizable[InventoryCreated] = this

  given Schemable[InventoryCreated] = this

case class InventoryItemReceived(inventoryId: UUID, itemId: UUID, product: Product, cost: BigDecimal, quantity: Int, sku: String, version: Long) extends Event

object InventoryItemReceived extends Randomizable[InventoryItemReceived] with Schemable[InventoryItemReceived]:
  override def random: InventoryItemReceived = InventoryItemReceived(
    inventoryId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    product = Product.random,
    cost = BigDecimal(faker.number().randomDouble(2, 10, 1000)),
    quantity = faker.number().numberBetween(1, 100),
    sku = faker.commerce().productName(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[InventoryItemReceived] =
    JSONSchema.of(classOf[InventoryItemReceived])

  given Randomizable[InventoryItemReceived] = this

  given Schemable[InventoryItemReceived] = this

case class InventoryAdjustmentIncreased(inventoryId: UUID, itemId: UUID, reason: String, quantity: Int, version: Long) extends Event

object InventoryAdjustmentIncreased extends Randomizable[InventoryAdjustmentIncreased] with Schemable[InventoryAdjustmentIncreased]:
  override def random: InventoryAdjustmentIncreased = InventoryAdjustmentIncreased(
    inventoryId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    reason = faker.lorem().sentence(),
    quantity = faker.number().numberBetween(1, 100),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[InventoryAdjustmentIncreased] =
    JSONSchema.of(classOf[InventoryAdjustmentIncreased])

  given Randomizable[InventoryAdjustmentIncreased] = this

  given Schemable[InventoryAdjustmentIncreased] = this

case class InventoryAdjustmentDecreased(inventoryId: UUID, itemId: UUID, reason: String, quantity: Int, version: Long) extends Event

object InventoryAdjustmentDecreased extends Randomizable[InventoryAdjustmentDecreased] with Schemable[InventoryAdjustmentDecreased]:
  override def random: InventoryAdjustmentDecreased = InventoryAdjustmentDecreased(
    inventoryId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    reason = faker.lorem().sentence(),
    quantity = faker.number().numberBetween(1, 100),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[InventoryAdjustmentDecreased] =
    JSONSchema.of(classOf[InventoryAdjustmentDecreased])

  given Randomizable[InventoryAdjustmentDecreased] = this

  given Schemable[InventoryAdjustmentDecreased] = this

case class InventoryAdjustmentNotDecreased(inventoryId: UUID, itemId: UUID, reason: String, quantityDesired: Int, quantityAvailable: Int, version: Long) extends Event

object InventoryAdjustmentNotDecreased extends Randomizable[InventoryAdjustmentNotDecreased] with Schemable[InventoryAdjustmentNotDecreased]:
  override def random: InventoryAdjustmentNotDecreased = 
    val quantityAvailable = faker.number().numberBetween(1, 100)
    val quantityDesired = faker.number().numberBetween(quantityAvailable + 1, quantityAvailable + 100)
    
    InventoryAdjustmentNotDecreased(
    inventoryId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    reason = faker.lorem().sentence(),
    quantityDesired = quantityDesired,
    quantityAvailable = quantityAvailable,
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[InventoryAdjustmentNotDecreased] =
    JSONSchema.of(classOf[InventoryAdjustmentNotDecreased])

  given Randomizable[InventoryAdjustmentNotDecreased] = this

  given Schemable[InventoryAdjustmentNotDecreased] = this

case class InventoryItemReserved(
  inventoryId: UUID,
  itemId: UUID,
  catalogId: UUID,
  cartId: UUID,
  product: Product,
  quantity: Int,
  expirationDate: OffsetDateTime,
  version: Long
) extends Event

object InventoryItemReserved extends Randomizable[InventoryItemReserved] with Schemable[InventoryItemReserved]:
  override def random: InventoryItemReserved = InventoryItemReserved(
    inventoryId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    catalogId = UUID.randomUUID(),
    cartId = UUID.randomUUID(),
    product = Product.random,
    quantity = faker.number().numberBetween(1, 100),
    expirationDate = faker.date().future(365, TimeUnit.DAYS).toInstant.atOffset(ZoneOffset.UTC),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[InventoryItemReserved] =
    JSONSchema.of(classOf[InventoryItemReserved])

  given Randomizable[InventoryItemReserved] = this
  given Schemable[InventoryItemReserved] = this

case class StockDepleted(inventoryId: UUID, itemId: UUID, product: Product, version: Long) extends Event

object StockDepleted extends Randomizable[StockDepleted] with Schemable[StockDepleted]:
  override def random: StockDepleted = StockDepleted(
    inventoryId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    product = Product.random,
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[StockDepleted] =
    JSONSchema.of(classOf[StockDepleted])

  given Randomizable[StockDepleted] = this
  given Schemable[StockDepleted] = this

case class InventoryItemNotReserved(inventoryId: UUID, itemId: UUID, cartId: UUID, quantityDesired: Int, quantityAvailable: Int, version: Long) extends Event

object InventoryItemNotReserved extends Randomizable[InventoryItemNotReserved] with Schemable[InventoryItemNotReserved]:
  override def random: InventoryItemNotReserved = InventoryItemNotReserved(
    inventoryId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    cartId = UUID.randomUUID(),
    quantityDesired = faker.number().numberBetween(1, 100),
    quantityAvailable = faker.number().numberBetween(1, 100),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[InventoryItemNotReserved] =
    JSONSchema.of(classOf[InventoryItemNotReserved])

  given Randomizable[InventoryItemNotReserved] = this
  given Schemable[InventoryItemNotReserved] = this

case class InventoryItemIncreased(inventoryId: UUID, itemId: UUID, quantity: Int, version: Long) extends Event

object InventoryItemIncreased extends Randomizable[InventoryItemIncreased] with Schemable[InventoryItemIncreased]:
  override def random: InventoryItemIncreased = InventoryItemIncreased(
    inventoryId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    quantity = faker.number().numberBetween(1, 100),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[InventoryItemIncreased] =
    JSONSchema.of(classOf[InventoryItemIncreased])

  given Randomizable[InventoryItemIncreased] = this
  given Schemable[InventoryItemIncreased] = this

case class InventoryItemDecreased(inventoryId: UUID, itemId: UUID, quantity: Int, version: Long) extends Event

object InventoryItemDecreased extends Randomizable[InventoryItemDecreased] with Schemable[InventoryItemDecreased]:
  override def random: InventoryItemDecreased = InventoryItemDecreased(
    inventoryId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    quantity = faker.number().numberBetween(1, 100),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[InventoryItemDecreased] =
    JSONSchema.of(classOf[InventoryItemDecreased])

  given Randomizable[InventoryItemDecreased] = this
  given Schemable[InventoryItemDecreased] = this
