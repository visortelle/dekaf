package demo.tenants.schemas.namespaces.exampleShop.commands.Account

import demo.tenants.schemas.namespaces.exampleShop.Dto.Address

import java.util.UUID

case class AddShippingAddress(accountId: UUID, address: Address)
object AddShippingAddress:
  def random: AddShippingAddress = AddShippingAddress(
    accountId = UUID.randomUUID(),
    address = Address.random
  )
