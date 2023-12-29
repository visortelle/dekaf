package demo.tenants.cqrs.model.Catalog

import demo.tenants.cqrs.model.Dto.{Money, Product}
import demo.tenants.cqrs.shared.{Event, Randomizable, Schemable}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class CatalogCreated(catalogId: UUID, title: String, description: String, version: Long) extends Event

object CatalogCreated extends Randomizable[CatalogCreated] with Schemable[CatalogCreated]:
  override def random: CatalogCreated = CatalogCreated(
    catalogId = UUID.randomUUID(),
    title = faker.lorem().word(),
    description = faker.lorem().sentence(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CatalogCreated] =
    JSONSchema.of(classOf[CatalogCreated])

  given Randomizable[CatalogCreated] = this
  given Schemable[CatalogCreated] = this

case class CatalogDeleted(catalogId: UUID, version: Long) extends Event

object CatalogDeleted extends Randomizable[CatalogDeleted] with Schemable[CatalogDeleted]:
  override def random: CatalogDeleted = CatalogDeleted(
    catalogId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CatalogDeleted] =
    JSONSchema.of(classOf[CatalogDeleted])

  given Randomizable[CatalogDeleted] = this
  given Schemable[CatalogDeleted] = this

case class CatalogActivated(catalogId: UUID, version: Long) extends Event

object CatalogActivated extends Randomizable[CatalogActivated] with Schemable[CatalogActivated]:
  override def random: CatalogActivated = CatalogActivated(
    catalogId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CatalogActivated] =
    JSONSchema.of(classOf[CatalogActivated])

  given Randomizable[CatalogActivated] = this
  given Schemable[CatalogActivated] = this


case class CatalogDeactivated(catalogId: UUID, version: Long) extends Event

object CatalogDeactivated extends Randomizable[CatalogDeactivated] with Schemable[CatalogDeactivated]:
  override def random: CatalogDeactivated = CatalogDeactivated(
    catalogId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CatalogDeactivated] =
    JSONSchema.of(classOf[CatalogDeactivated])

  given Randomizable[CatalogDeactivated] = this
  given Schemable[CatalogDeactivated] = this

case class CatalogTitleChanged(catalogId: UUID, title: String, version: Long) extends Event

object CatalogTitleChanged extends Randomizable[CatalogTitleChanged] with Schemable[CatalogTitleChanged]:
  override def random: CatalogTitleChanged = CatalogTitleChanged(
    catalogId = UUID.randomUUID(),
    title = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CatalogTitleChanged] =
    JSONSchema.of(classOf[CatalogTitleChanged])

  given Randomizable[CatalogTitleChanged] = this
  given Schemable[CatalogTitleChanged] = this

case class CatalogDescriptionChanged(catalogId: UUID, description: String, version: Long) extends Event

object CatalogDescriptionChanged extends Randomizable[CatalogDescriptionChanged] with Schemable[CatalogDescriptionChanged]:
  override def random: CatalogDescriptionChanged = CatalogDescriptionChanged(
    catalogId = UUID.randomUUID(),
    description = faker.lorem().sentence(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CatalogDescriptionChanged] =
    JSONSchema.of(classOf[CatalogDescriptionChanged])

  given Randomizable[CatalogDescriptionChanged] = this
  given Schemable[CatalogDescriptionChanged] = this

case class CatalogItemAdded(catalogId: UUID, itemId: UUID, inventoryId: UUID, product: Product, unitPrice: Money, sku: String, quantity: Int, version: Long) extends Event

object CatalogItemAdded extends Randomizable[CatalogItemAdded] with Schemable[CatalogItemAdded]:
  override def random: CatalogItemAdded =
    val product = Product.random

    CatalogItemAdded(
      catalogId = UUID.randomUUID(),
      itemId = UUID.randomUUID(),
      inventoryId = UUID.randomUUID(),
      product = Product.random,
      unitPrice = Money.random,
      sku = product.sku,
      quantity = faker.number().numberBetween(1, 100),
      version = faker.number().numberBetween(1, 100)
    )

  override def schema: JSONSchema[CatalogItemAdded] =
    JSONSchema.of(classOf[CatalogItemAdded])

  given Randomizable[CatalogItemAdded] = this
  given Schemable[CatalogItemAdded] = this

case class CatalogItemRemoved(catalogId: UUID, itemId: UUID, version: Long) extends Event

object CatalogItemRemoved extends Randomizable[CatalogItemRemoved] with Schemable[CatalogItemRemoved]:
  override def random: CatalogItemRemoved = CatalogItemRemoved(
    catalogId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CatalogItemRemoved] =
    JSONSchema.of(classOf[CatalogItemRemoved])

  given Randomizable[CatalogItemRemoved] = this
  given Schemable[CatalogItemRemoved] = this

case class CatalogItemIncreased(catalogId: UUID, itemId: UUID, inventoryId: UUID, quantity: Int, version: Long) extends Event

object CatalogItemIncreased extends Randomizable[CatalogItemIncreased] with Schemable[CatalogItemIncreased]:
  override def random: CatalogItemIncreased = CatalogItemIncreased(
    catalogId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    inventoryId = UUID.randomUUID(),
    quantity = faker.number().numberBetween(1, 100),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CatalogItemIncreased] =
    JSONSchema.of(classOf[CatalogItemIncreased])

  given Randomizable[CatalogItemIncreased] = this
  given Schemable[CatalogItemIncreased] = this
