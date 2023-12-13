package demo.tenants.schemas.namespaces.exampleShop.commands.Account

import java.util.UUID

case class DeleteBillingAddress(accountId: UUID, addressId: UUID)
object DeleteBillingAddress:
  def random: DeleteBillingAddress = DeleteBillingAddress(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID()
  )
