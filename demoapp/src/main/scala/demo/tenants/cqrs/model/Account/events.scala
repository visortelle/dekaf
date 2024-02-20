package demo.tenants.cqrs.model.Account

import demo.tenants.cqrs.model.Dto.Address
import demo.tenants.cqrs.model.{Event, Randomizable, Schemable}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class AccountActivated(accountId: UUID, status: String, version: Long) extends Event

object AccountActivated extends Randomizable[AccountActivated] with Schemable[AccountActivated]:
    override def random: AccountActivated = AccountActivated(
        accountId = UUID.randomUUID(),
        status = faker.lorem().word(),
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[AccountActivated] =
        JSONSchema.of(classOf[AccountActivated])

    given Randomizable[AccountActivated] = this
    given Schemable[AccountActivated] = this

case class AccountCreated(
    accountId: UUID,
    firstName: String,
    lastName: String,
    email: String,
    status: String,
    version: Long
) extends Event

object AccountCreated extends Randomizable[AccountCreated] with Schemable[AccountCreated]:
    override def random: AccountCreated = AccountCreated(
        accountId = UUID.randomUUID(),
        firstName = faker.name().firstName(),
        lastName = faker.name().lastName(),
        email = faker.internet().emailAddress(),
        status = faker.lorem().word(),
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[AccountCreated] =
        JSONSchema.of(classOf[AccountCreated])

    given Randomizable[AccountCreated] = this
    given Schemable[AccountCreated] = this

case class AccountDeactivated(accountId: UUID, status: String, version: Long) extends Event

object AccountDeactivated extends Randomizable[AccountDeactivated] with Schemable[AccountDeactivated]:
    override def random: AccountDeactivated = AccountDeactivated(
        accountId = UUID.randomUUID(),
        status = faker.lorem().word(),
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[AccountDeactivated] =
        JSONSchema.of(classOf[AccountDeactivated])

    given Randomizable[AccountDeactivated] = this
    given Schemable[AccountDeactivated] = this

case class AccountDeleted(accountId: UUID, status: String, version: Long) extends Event

object AccountDeleted extends Randomizable[AccountDeleted] with Schemable[AccountDeleted]:
    override def random: AccountDeleted = AccountDeleted(
        accountId = UUID.randomUUID(),
        status = faker.lorem().word(),
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[AccountDeleted] =
        JSONSchema.of(classOf[AccountDeleted])

    given Randomizable[AccountDeleted] = this
    given Schemable[AccountDeleted] = this

case class BillingAddressAdded(accountId: UUID, addressId: UUID, address: Address, version: Long) extends Event

object BillingAddressAdded extends Randomizable[BillingAddressAdded] with Schemable[BillingAddressAdded]:
    override def random: BillingAddressAdded = BillingAddressAdded(
        accountId = UUID.randomUUID(),
        addressId = UUID.randomUUID(),
        address = Address.random,
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[BillingAddressAdded] =
        JSONSchema.of(classOf[BillingAddressAdded])

    given Randomizable[BillingAddressAdded] = this
    given Schemable[BillingAddressAdded] = this

case class BillingAddressDeleted(accountId: UUID, addressId: UUID, version: Long) extends Event

object BillingAddressDeleted extends Randomizable[BillingAddressDeleted] with Schemable[BillingAddressDeleted]:
    override def random: BillingAddressDeleted = BillingAddressDeleted(
        accountId = UUID.randomUUID(),
        addressId = UUID.randomUUID(),
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[BillingAddressDeleted] =
        JSONSchema.of(classOf[BillingAddressDeleted])

    given Randomizable[BillingAddressDeleted] = this
    given Schemable[BillingAddressDeleted] = this

case class BillingAddressPreferred(accountId: UUID, addressId: UUID, version: Long) extends Event

object BillingAddressPreferred extends Randomizable[BillingAddressPreferred] with Schemable[BillingAddressPreferred]:
    override def random: BillingAddressPreferred = BillingAddressPreferred(
        accountId = UUID.randomUUID(),
        addressId = UUID.randomUUID(),
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[BillingAddressPreferred] =
        JSONSchema.of(classOf[BillingAddressPreferred])

    given Randomizable[BillingAddressPreferred] = this
    given Schemable[BillingAddressPreferred] = this

case class BillingAddressRestored(accountId: UUID, addressId: UUID, version: Long) extends Event

object BillingAddressRestored extends Randomizable[BillingAddressRestored] with Schemable[BillingAddressRestored]:
    override def random: BillingAddressRestored = BillingAddressRestored(
        accountId = UUID.randomUUID(),
        addressId = UUID.randomUUID(),
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[BillingAddressRestored] =
        JSONSchema.of(classOf[BillingAddressRestored])

    given Randomizable[BillingAddressRestored] = this
    given Schemable[BillingAddressRestored] = this

case class PrimaryBillingAddressRemoved(accountId: UUID, addressId: UUID, version: Long) extends Event

object PrimaryBillingAddressRemoved
    extends Randomizable[PrimaryBillingAddressRemoved]
    with Schemable[PrimaryBillingAddressRemoved]:
    override def random: PrimaryBillingAddressRemoved = PrimaryBillingAddressRemoved(
        accountId = UUID.randomUUID(),
        addressId = UUID.randomUUID(),
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[PrimaryBillingAddressRemoved] =
        JSONSchema.of(classOf[PrimaryBillingAddressRemoved])

    given Randomizable[PrimaryBillingAddressRemoved] = this
    given Schemable[PrimaryBillingAddressRemoved] = this

case class PrimaryShippingAddressRemoved(accountId: UUID, addressId: UUID, version: Long) extends Event

object PrimaryShippingAddressRemoved
    extends Randomizable[PrimaryShippingAddressRemoved]
    with Schemable[PrimaryShippingAddressRemoved]:
    override def random: PrimaryShippingAddressRemoved = PrimaryShippingAddressRemoved(
        accountId = UUID.randomUUID(),
        addressId = UUID.randomUUID(),
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[PrimaryShippingAddressRemoved] =
        JSONSchema.of(classOf[PrimaryShippingAddressRemoved])

    given Randomizable[PrimaryShippingAddressRemoved] = this
    given Schemable[PrimaryShippingAddressRemoved] = this

case class ShippingAddressAdded(accountId: UUID, addressId: UUID, address: Address, version: Long) extends Event

object ShippingAddressAdded extends Randomizable[ShippingAddressAdded] with Schemable[ShippingAddressAdded]:
    override def random: ShippingAddressAdded = ShippingAddressAdded(
        accountId = UUID.randomUUID(),
        addressId = UUID.randomUUID(),
        address = Address.random,
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[ShippingAddressAdded] =
        JSONSchema.of(classOf[ShippingAddressAdded])

    given Randomizable[ShippingAddressAdded] = this
    given Schemable[ShippingAddressAdded] = this

case class ShippingAddressDeleted(accountId: UUID, addressId: UUID, version: Long) extends Event

object ShippingAddressDeleted extends Randomizable[ShippingAddressDeleted] with Schemable[ShippingAddressDeleted]:
    override def random: ShippingAddressDeleted = ShippingAddressDeleted(
        accountId = UUID.randomUUID(),
        addressId = UUID.randomUUID(),
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[ShippingAddressDeleted] =
        JSONSchema.of(classOf[ShippingAddressDeleted])

    given Randomizable[ShippingAddressDeleted] = this
    given Schemable[ShippingAddressDeleted] = this

case class ShippingAddressPreferred(accountId: UUID, addressId: UUID, version: Long) extends Event

object ShippingAddressPreferred extends Randomizable[ShippingAddressPreferred] with Schemable[ShippingAddressPreferred]:
    override def random: ShippingAddressPreferred = ShippingAddressPreferred(
        accountId = UUID.randomUUID(),
        addressId = UUID.randomUUID(),
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[ShippingAddressPreferred] =
        JSONSchema.of(classOf[ShippingAddressPreferred])

    given Randomizable[ShippingAddressPreferred] = this
    given Schemable[ShippingAddressPreferred] = this

case class ShippingAddressRestored(accountId: UUID, addressId: UUID, version: Long) extends Event

object ShippingAddressRestored extends Randomizable[ShippingAddressRestored] with Schemable[ShippingAddressRestored]:
    override def random: ShippingAddressRestored = ShippingAddressRestored(
        accountId = UUID.randomUUID(),
        addressId = UUID.randomUUID(),
        version = faker.number().numberBetween(1, 100)
    )

    override def schema: JSONSchema[ShippingAddressRestored] =
        JSONSchema.of(classOf[ShippingAddressRestored])

    given Randomizable[ShippingAddressRestored] = this
    given Schemable[ShippingAddressRestored] = this
