package demo.tenants.schemas.namespaces.exampleShop.commands.Account

import demo.tenants.schemas.namespaces.faker

case class CreateAccount(firstName: String, lastName: String, email: String)

object CreateAccount:
  def random: CreateAccount = CreateAccount(
    firstName = faker.name().firstName(),
    lastName = faker.name().lastName(),
    email = faker.internet().emailAddress()
  )
