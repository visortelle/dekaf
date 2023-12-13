package demo.tenants.schemas.namespaces.exampleShop.events.Account

import demo.tenants.schemas.namespaces.faker

import java.util.UUID

case class AccountCreated(accountId: UUID, firstName: String, lastName: String, email: String, status: String, version: Long)
object AccountCreated:
  def random: AccountCreated = AccountCreated(
    accountId = UUID.randomUUID(),
    firstName = faker.name().firstName(),
    lastName = faker.name().lastName(),
    email = faker.internet().emailAddress(),
    status = "Created",
    version = faker.number().numberBetween(1, 100)
  )
