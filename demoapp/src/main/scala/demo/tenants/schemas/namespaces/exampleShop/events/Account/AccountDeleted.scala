package demo.tenants.schemas.namespaces.exampleShop.events.Account

import demo.tenants.schemas.namespaces.faker

import java.util.UUID

case class AccountDeleted(accountId: UUID, status: String, version: Long)
object AccountDeleted:
  def random: AccountDeleted = AccountDeleted(
    accountId = UUID.randomUUID(),
    status = "Deleted",
    version = faker.number().numberBetween(1, 100)
  )
