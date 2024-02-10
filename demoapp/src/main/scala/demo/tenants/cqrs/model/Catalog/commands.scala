package demo.tenants.cqrs.model.Catalog

import demo.tenants.cqrs.model.Dto.{Money, Product}
import demo.tenants.cqrs.model.{Command, Randomizable, Schemable}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class ActivateCatalog(catalogId: UUID) extends Command

object ActivateCatalog extends Randomizable[ActivateCatalog] with Schemable[ActivateCatalog]:
  override def random: ActivateCatalog = ActivateCatalog(
    catalogId = UUID.randomUUID()
  )

  override def schema: JSONSchema[ActivateCatalog] =
    JSONSchema.of(classOf[ActivateCatalog])

  given Randomizable[ActivateCatalog] = this
  given Schemable[ActivateCatalog] = this

case class AddCatalogItem(catalogId: UUID, inventoryId: UUID, product: Product, unitPrice: Money, sku: String, quantity: Int) extends Command

object AddCatalogItem extends Randomizable[AddCatalogItem] with Schemable[AddCatalogItem]:
  override def random =
    val product = Product.random

    AddCatalogItem(
      catalogId = UUID.randomUUID(),
      inventoryId = UUID.randomUUID(),
      product = product,
      unitPrice = Money.random,
      sku = product.sku,
      quantity = faker.number.numberBetween(1, 100)
    )

  override def schema: JSONSchema[AddCatalogItem] =
    JSONSchema.of(classOf[AddCatalogItem])

  given Randomizable[AddCatalogItem] = this
  given Schemable[AddCatalogItem] = this

case class ChangeCatalogDescription(catalogId: UUID, description: String) extends Command

object ChangeCatalogDescription extends Randomizable[ChangeCatalogDescription] with Schemable[ChangeCatalogDescription]:
  override def random = ChangeCatalogDescription(
    catalogId = UUID.randomUUID(),
    description = faker.lorem.paragraph()
  )

  override def schema: JSONSchema[ChangeCatalogDescription] =
    JSONSchema.of(classOf[ChangeCatalogDescription])

  given Randomizable[ChangeCatalogDescription] = this
  given Schemable[ChangeCatalogDescription] = this

case class ChangeCatalogTitle(catalogId: UUID, title: String) extends Command

object ChangeCatalogTitle extends Randomizable[ChangeCatalogTitle] with Schemable[ChangeCatalogTitle]:
  override def random = ChangeCatalogTitle(
    catalogId = UUID.randomUUID(),
    title = faker.commerce.department()
  )

  override def schema: JSONSchema[ChangeCatalogTitle] =
    JSONSchema.of(classOf[ChangeCatalogTitle])

  given Randomizable[ChangeCatalogTitle] = this
  given Schemable[ChangeCatalogTitle] = this

case class CreateCatalog(catalogId: UUID, title: String, description: String) extends Command

object CreateCatalog extends Randomizable[CreateCatalog] with Schemable[CreateCatalog]:
  override def random = CreateCatalog(
    catalogId = UUID.randomUUID(),
    title = faker.commerce.department(),
    description = faker.lorem.paragraph()
  )

  override def schema: JSONSchema[CreateCatalog] =
    JSONSchema.of(classOf[CreateCatalog])

  given Randomizable[CreateCatalog] = this
  given Schemable[CreateCatalog] = this

case class DeactivateCatalog(catalogId: UUID) extends Command

object DeactivateCatalog extends Randomizable[DeactivateCatalog] with Schemable[DeactivateCatalog]:
  override def random = DeactivateCatalog(
    catalogId = UUID.randomUUID()
  )

  override def schema: JSONSchema[DeactivateCatalog] =
    JSONSchema.of(classOf[DeactivateCatalog])

  given Randomizable[DeactivateCatalog] = this
  given Schemable[DeactivateCatalog] = this

case class DeleteCatalog(catalogId: UUID) extends Command

object DeleteCatalog extends Randomizable[DeleteCatalog] with Schemable[DeleteCatalog]:
  override def random = DeleteCatalog(
    catalogId = UUID.randomUUID()
  )

  override def schema: JSONSchema[DeleteCatalog] =
    JSONSchema.of(classOf[DeleteCatalog])

  given Randomizable[DeleteCatalog] = this
  given Schemable[DeleteCatalog] = this

case class RemoveCatalogItem(catalogId: UUID, itemId: UUID) extends Command

object RemoveCatalogItem extends Randomizable[RemoveCatalogItem] with Schemable[RemoveCatalogItem]:
  override def random = RemoveCatalogItem(
    catalogId = UUID.randomUUID(),
    itemId = UUID.randomUUID()
  )

  override def schema: JSONSchema[RemoveCatalogItem] =
    JSONSchema.of(classOf[RemoveCatalogItem])

  given Randomizable[RemoveCatalogItem] = this
  given Schemable[RemoveCatalogItem] = this
