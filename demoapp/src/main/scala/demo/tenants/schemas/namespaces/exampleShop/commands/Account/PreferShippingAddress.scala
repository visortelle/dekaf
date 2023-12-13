package demo.tenants.schemas.namespaces.exampleShop.commands.Account

import java.util.UUID

case class PreferShippingAddress(accountId: UUID, addressId: UUID)
object PreferShippingAddress:
  def random: PreferShippingAddress = PreferShippingAddress(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID()
  )
