package demo.tenants.schemas.namespaces.exampleShop.events.Account

import demo.tenants.schemas.namespaces.faker

import java.util.UUID

case class BillingAddressRestored(accountId: UUID, addressId: UUID, version: Long)
object BillingAddressRestored:
  def random: BillingAddressRestored = BillingAddressRestored(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )
