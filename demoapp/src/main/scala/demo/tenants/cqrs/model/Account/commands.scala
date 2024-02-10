package demo.tenants.cqrs.model.Account

import demo.tenants.cqrs.model.Dto.Address
import demo.tenants.cqrs.model.{Command, Randomizable, Schemable}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class CreateAccount(id: UUID, firstName: String, lastName: String, email: String) extends Command

object CreateAccount extends Randomizable[CreateAccount] with Schemable[CreateAccount]:
  override def random: CreateAccount = CreateAccount(
    id = UUID.randomUUID(),
    firstName = faker.name().firstName(),
    lastName = faker.name().lastName(),
    email = faker.internet().emailAddress()
  )

  override def schema: JSONSchema[CreateAccount] =
    JSONSchema.of(classOf[CreateAccount])

  given Randomizable[CreateAccount] = this
  given Schemable[CreateAccount] = this

case class ActivateAccount(accountId: UUID) extends Command

object ActivateAccount extends Randomizable[ActivateAccount] with Schemable[ActivateAccount]:
  override def random: ActivateAccount = ActivateAccount(
    accountId = UUID.randomUUID()
  )

  override def schema: JSONSchema[ActivateAccount] =
    JSONSchema.of(classOf[ActivateAccount])

  given Randomizable[ActivateAccount] = this
  given Schemable[ActivateAccount] = this


case class AddBillingAddress(accountId: UUID, address: Address) extends Command

object AddBillingAddress extends Randomizable[AddBillingAddress] with Schemable[AddBillingAddress]:
  override def random: AddBillingAddress = AddBillingAddress(
    accountId = UUID.randomUUID(),
    address = Address.random
  )

  override def schema: JSONSchema[AddBillingAddress] =
    JSONSchema.of(classOf[AddBillingAddress])

  given Randomizable[AddBillingAddress] = this
  given Schemable[AddBillingAddress] = this

case class AddShippingAddress(accountId: UUID, address: Address) extends Command

object AddShippingAddress extends Randomizable[AddShippingAddress] with Schemable[AddShippingAddress]:
  override def random: AddShippingAddress = AddShippingAddress(
    accountId = UUID.randomUUID(),
    address = Address.random
  )

  override def schema: JSONSchema[AddShippingAddress] =
    JSONSchema.of(classOf[AddShippingAddress])

  given Randomizable[AddShippingAddress] = this
  given Schemable[AddShippingAddress] = this

case class DeleteAccount(accountId: UUID) extends Command

object DeleteAccount extends Randomizable[DeleteAccount] with Schemable[DeleteAccount]:
  override def random: DeleteAccount = DeleteAccount(
    accountId = UUID.randomUUID()
  )

  override def schema: JSONSchema[DeleteAccount] =
    JSONSchema.of(classOf[DeleteAccount])

  given Randomizable[DeleteAccount] = this
  given Schemable[DeleteAccount] = this

case class DeleteBillingAddress(accountId: UUID, addressId: UUID) extends Command

object DeleteBillingAddress extends Randomizable[DeleteBillingAddress] with Schemable[DeleteBillingAddress]:
  override def random: DeleteBillingAddress = DeleteBillingAddress(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID()
  )

  override def schema: JSONSchema[DeleteBillingAddress] =
    JSONSchema.of(classOf[DeleteBillingAddress])

  given Randomizable[DeleteBillingAddress] = this
  given Schemable[DeleteBillingAddress] = this

case class DeleteShippingAddress(accountId: UUID, addressId: UUID) extends Command

object DeleteShippingAddress extends Randomizable[DeleteShippingAddress] with Schemable[DeleteShippingAddress]:
  override def random: DeleteShippingAddress = DeleteShippingAddress(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID()
  )

  override def schema: JSONSchema[DeleteShippingAddress] =
    JSONSchema.of(classOf[DeleteShippingAddress])

  given Randomizable[DeleteShippingAddress] = this
  given Schemable[DeleteShippingAddress] = this

case class PreferShippingAddress(accountId: UUID, addressId: UUID) extends Command

object PreferShippingAddress extends Randomizable[PreferShippingAddress] with Schemable[PreferShippingAddress]:
  override def random: PreferShippingAddress = PreferShippingAddress(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID()
  )

  override def schema: JSONSchema[PreferShippingAddress] =
    JSONSchema.of(classOf[PreferShippingAddress])

  given Randomizable[PreferShippingAddress] = this
  given Schemable[PreferShippingAddress] = this

case class PreferBillingAddress(accountId: UUID, addressId: UUID) extends Command

object PreferBillingAddress extends Randomizable[PreferBillingAddress] with Schemable[PreferBillingAddress]:
  override def random: PreferBillingAddress = PreferBillingAddress(
    accountId = UUID.randomUUID(),
    addressId = UUID.randomUUID()
  )

  override def schema: JSONSchema[PreferBillingAddress] =
    JSONSchema.of(classOf[PreferBillingAddress])

  given Randomizable[PreferBillingAddress] = this
  given Schemable[PreferBillingAddress] = this
