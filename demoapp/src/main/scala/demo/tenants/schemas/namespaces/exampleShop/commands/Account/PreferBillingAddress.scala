package demo.tenants.schemas.namespaces.exampleShop.commands.Account

import java.util.UUID

case class PreferBillingAddress(accountId: UUID, addressId: UUID)
object PreferBillingAddress:
  def random: PreferBillingAddress = PreferBillingAddress(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID()
  )
