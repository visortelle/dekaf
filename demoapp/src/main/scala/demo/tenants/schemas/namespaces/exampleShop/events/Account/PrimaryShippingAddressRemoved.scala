package demo.tenants.schemas.namespaces.exampleShop.events.Account

import demo.tenants.schemas.namespaces.faker

import java.util.UUID

case class PrimaryShippingAddressRemoved(accountId: UUID, addressId: UUID, version: Long)
object PrimaryShippingAddressRemoved:
  def random: PrimaryShippingAddressRemoved = PrimaryShippingAddressRemoved(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )
