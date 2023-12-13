package demo.tenants.schemas.namespaces.exampleShop.events.Account

import demo.tenants.schemas.namespaces.faker

import java.util.UUID

case class BillingAddressDeleted(accountId: UUID, addressId: UUID, version: Long)

object BillingAddressDeleted:
  def random: BillingAddressDeleted = BillingAddressDeleted(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )
