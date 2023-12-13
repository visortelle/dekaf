package demo.tenants.schemas.namespaces.exampleShop.events.Account

import demo.tenants.schemas.namespaces.faker

import java.util.UUID

case class AccountDeactivated(accountId: UUID, status: String, version: Long)
object AccountDeactivated:
  def random: AccountDeactivated = AccountDeactivated(
    accountId = UUID.randomUUID(),
    status = "Deactivated",
    version = faker.number().numberBetween(1, 100)
  )
