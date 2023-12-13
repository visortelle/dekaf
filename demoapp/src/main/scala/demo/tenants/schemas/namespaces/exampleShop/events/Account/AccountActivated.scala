package demo.tenants.schemas.namespaces.exampleShop.events.Account

import demo.tenants.schemas.namespaces.faker

import java.util.UUID

case class AccountActivated(accountId: UUID, status: String, version: Long)
object AccountActivated:
  def random: AccountActivated = AccountActivated(
    accountId = UUID.randomUUID(),
    status = "Activated",
    version = faker.number().numberBetween(1, 100)
  )
