package demo.tenants.schemas.namespaces.exampleShop.events.Account

import demo.tenants.schemas.namespaces.exampleShop.Dto.Address
import demo.tenants.schemas.namespaces.faker

import java.util.UUID

case class BillingAddressAdded(accountId: UUID, addressId: UUID, address: Address, version: Long)
object BillingAddressAdded:
  def random: BillingAddressAdded = BillingAddressAdded(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID(),
    address = Address.random,
    version = faker.number().numberBetween(1, 100)
  )
