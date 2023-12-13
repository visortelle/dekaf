package demo.tenants.schemas.namespaces.exampleShop.commands.Account

import java.util.UUID

case class DeleteShippingAddress(accountId: UUID, addressId: UUID)
object DeleteShippingAddress:
  def random: DeleteShippingAddress = DeleteShippingAddress(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID()
  )
