package demo.tenants.cqrs.model.Warehouse

import demo.tenants.cqrs.model.Dto.{NotificationMethod, Product}
import demo.tenants.cqrs.shared.{Command, Event, Randomizable, Schemable}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class ReceiveInventoryItem(inventoryId: UUID, product: Product, cost: BigDecimal, quantity: Int) extends Event

object ReceiveInventoryItem extends Randomizable[ReceiveInventoryItem] with Schemable[ReceiveInventoryItem]:
  override def random: ReceiveInventoryItem = ReceiveInventoryItem(
    inventoryId = UUID.randomUUID(),
    product = Product.random,
    cost = BigDecimal(faker.number().randomDouble(2, 10, 1000)),
    quantity = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[ReceiveInventoryItem] =
    JSONSchema.of(classOf[ReceiveInventoryItem])

  given Randomizable[ReceiveInventoryItem] = this

  given Schemable[ReceiveInventoryItem] = this

case class IncreaseInventoryAdjust(inventoryId: UUID, itemId: UUID, quantity: Int, reason: String) extends Event

object IncreaseInventoryAdjust extends Randomizable[IncreaseInventoryAdjust] with Schemable[IncreaseInventoryAdjust]:
  override def random: IncreaseInventoryAdjust = IncreaseInventoryAdjust(
    inventoryId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    quantity = faker.number().numberBetween(1, 100),
    reason = faker.lorem().sentence()
  )

  override def schema: JSONSchema[IncreaseInventoryAdjust] =
    JSONSchema.of(classOf[IncreaseInventoryAdjust])

  given Randomizable[IncreaseInventoryAdjust] = this

  given Schemable[IncreaseInventoryAdjust] = this

case class DecreaseInventoryAdjust(inventoryId: UUID, itemId: UUID, quantity: Int, reason: String) extends Event

object DecreaseInventoryAdjust extends Randomizable[DecreaseInventoryAdjust] with Schemable[DecreaseInventoryAdjust]:
  override def random: DecreaseInventoryAdjust = DecreaseInventoryAdjust(
    inventoryId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    quantity = faker.number().numberBetween(1, 100),
    reason = faker.lorem().sentence()
  )

  override def schema: JSONSchema[DecreaseInventoryAdjust] =
    JSONSchema.of(classOf[DecreaseInventoryAdjust])

  given Randomizable[DecreaseInventoryAdjust] = this

  given Schemable[DecreaseInventoryAdjust] = this

case class ReserveInventoryItem(inventoryId: UUID, catalogId: UUID, cartId: UUID, product: Product, quantity: Int) extends Event

object ReserveInventoryItem extends Randomizable[ReserveInventoryItem] with Schemable[ReserveInventoryItem]:
  override def random: ReserveInventoryItem = ReserveInventoryItem(
    inventoryId = UUID.randomUUID(),
    catalogId = UUID.randomUUID(),
    cartId = UUID.randomUUID(),
    product = Product.random,
    quantity = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[ReserveInventoryItem] =
    JSONSchema.of(classOf[ReserveInventoryItem])

  given Randomizable[ReserveInventoryItem] = this

  given Schemable[ReserveInventoryItem] = this

case class CreateInventory(inventoryId: UUID, ownerId: UUID) extends Event

object CreateInventory extends Randomizable[CreateInventory] with Schemable[CreateInventory]:
  override def random: CreateInventory = CreateInventory(
    inventoryId = UUID.randomUUID(),
    ownerId = UUID.randomUUID()
  )

  override def schema: JSONSchema[CreateInventory] =
    JSONSchema.of(classOf[CreateInventory])

  given Randomizable[CreateInventory] = this

  given Schemable[CreateInventory] = this

