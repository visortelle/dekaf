package demo.tenants.schemas.namespaces.exampleShop.events.Account

import demo.tenants.schemas.namespaces.faker

import java.util.UUID

case class ShippingAddressDeleted(accountId: UUID, addressId: UUID, version: Long)
object ShippingAddressDeleted:
  def random: ShippingAddressDeleted = ShippingAddressDeleted(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )
