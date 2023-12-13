package demo.tenants.schemas.namespaces.exampleShop.commands.Account

import demo.tenants.schemas.namespaces.exampleShop.Dto.Address

import java.util.UUID

case class AddBillingAddress(accountId: UUID, address: Address)

object AddBillingAddress:
  def random: AddBillingAddress = AddBillingAddress(
    accountId = UUID.randomUUID(),
    address = Address.random
  )
