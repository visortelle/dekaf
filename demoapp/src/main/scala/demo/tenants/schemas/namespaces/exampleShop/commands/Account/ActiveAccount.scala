package demo.tenants.schemas.namespaces.exampleShop.commands.Account

import java.util.UUID

case class ActiveAccount(accountId: UUID)
object ActiveAccount:
  def random: ActiveAccount = ActiveAccount(
    accountId = UUID.randomUUID()
  )
