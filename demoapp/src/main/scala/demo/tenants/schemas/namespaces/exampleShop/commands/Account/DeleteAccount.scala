package demo.tenants.schemas.namespaces.exampleShop.commands.Account

import java.util.UUID

case class DeleteAccount(accountId: UUID)

object DeleteAccount:
  def random: DeleteAccount = DeleteAccount(
    accountId = UUID.randomUUID()
  )
