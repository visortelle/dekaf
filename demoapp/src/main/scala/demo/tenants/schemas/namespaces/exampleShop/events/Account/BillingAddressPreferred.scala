package demo.tenants.schemas.namespaces.exampleShop.events.Account

import demo.tenants.schemas.namespaces.faker

import java.util.UUID

case class BillingAddressPreferred(accountId: UUID, addressId: UUID, version: Long)
object BillingAddressPreferred:
  def random: BillingAddressPreferred = BillingAddressPreferred(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )
