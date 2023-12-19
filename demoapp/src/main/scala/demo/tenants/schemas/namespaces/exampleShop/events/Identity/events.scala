package demo.tenants.schemas.namespaces.exampleShop.events.Identity

import demo.tenants.schemas.namespaces.exampleShop.shared.{Command, Event, NotificationMethod, Randomizable, Schemable}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class UserDeleted(userId: UUID, version: Long) extends Event

object UserDeleted extends Randomizable[UserDeleted] with Schemable[UserDeleted]:
  override def random: UserDeleted = UserDeleted(
    userId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[UserDeleted] =
    JSONSchema.of(classOf[UserDeleted])

  given Randomizable[UserDeleted] = this
  given Schemable[UserDeleted] = this

case class UserRegistered(
  userId: UUID, 
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  version: Long
) extends Event

object UserRegistered extends Randomizable[UserRegistered] with Schemable[UserRegistered]:
  override def random: UserRegistered = UserRegistered(
    userId = UUID.randomUUID(),
    firstName = faker.name().firstName(),
    lastName = faker.name().lastName(),
    email = faker.internet().emailAddress(),
    password = faker.internet().password(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[UserRegistered] =
    JSONSchema.of(classOf[UserRegistered])

  given Randomizable[UserRegistered] = this
  given Schemable[UserRegistered] = this


case class EmailChanged(userId: UUID, email: String, version: Long) extends Event

object EmailChanged extends Randomizable[EmailChanged] with Schemable[EmailChanged]:
  override def random: EmailChanged = EmailChanged(
    userId = UUID.randomUUID(),
    email = faker.internet().emailAddress(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[EmailChanged] =
    JSONSchema.of(classOf[EmailChanged])

  given Randomizable[EmailChanged] = this
  given Schemable[EmailChanged] = this

case class UserPasswordChanged(userId: UUID, password: String, version: Long) extends Event

object UserPasswordChanged extends Randomizable[UserPasswordChanged] with Schemable[UserPasswordChanged]:
  override def random: UserPasswordChanged = UserPasswordChanged(
    userId = UUID.randomUUID(),
    password = faker.internet().password(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[UserPasswordChanged] =
    JSONSchema.of(classOf[UserPasswordChanged])

  given Randomizable[UserPasswordChanged] = this
  given Schemable[UserPasswordChanged] = this

case class EmailConfirmed(userId: UUID, email: String, version: Long) extends Event

object EmailConfirmed extends Randomizable[EmailConfirmed] with Schemable[EmailConfirmed]:
  override def random: EmailConfirmed = EmailConfirmed(
    userId = UUID.randomUUID(),
    email = faker.internet().emailAddress(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[EmailConfirmed] =
    JSONSchema.of(classOf[EmailConfirmed])

  given Randomizable[EmailConfirmed] = this
  given Schemable[EmailConfirmed] = this

case class EmailExpired(userId: UUID, email: String, version: Long) extends Event

object EmailExpired extends Randomizable[EmailExpired] with Schemable[EmailExpired]:
  override def random: EmailExpired = EmailExpired(
    userId = UUID.randomUUID(),
    email = faker.internet().emailAddress(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[EmailExpired] =
    JSONSchema.of(classOf[EmailExpired])

  given Randomizable[EmailExpired] = this
  given Schemable[EmailExpired] = this

case class PrimaryEmailDefined(userId: UUID, email: String, version: Long) extends Event

object PrimaryEmailDefined extends Randomizable[PrimaryEmailDefined] with Schemable[PrimaryEmailDefined]:
  override def random: PrimaryEmailDefined = PrimaryEmailDefined(
    userId = UUID.randomUUID(),
    email = faker.internet().emailAddress(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PrimaryEmailDefined] =
    JSONSchema.of(classOf[PrimaryEmailDefined])

  given Randomizable[PrimaryEmailDefined] = this
  given Schemable[PrimaryEmailDefined] = this
