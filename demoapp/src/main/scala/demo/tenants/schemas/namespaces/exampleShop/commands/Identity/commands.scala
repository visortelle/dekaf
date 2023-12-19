package demo.tenants.schemas.namespaces.exampleShop.commands.Identity

import demo.tenants.schemas.namespaces.exampleShop.shared.{Command, NotificationMethod, Randomizable, Schemable}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class ChangeEmail(userId: UUID, email: String) extends Command

object ChangeEmail extends Randomizable[ChangeEmail] with Schemable[ChangeEmail]:
  override def random: ChangeEmail = ChangeEmail(
    userId = UUID.randomUUID(),
    email = faker.internet().emailAddress()
  )

  override def schema: JSONSchema[ChangeEmail] =
    JSONSchema.of(classOf[ChangeEmail])

  given Randomizable[ChangeEmail] = this
  given Schemable[ChangeEmail] = this

case class ConfirmEmail(userId: UUID, email: String) extends Command

object ConfirmEmail extends Randomizable[ConfirmEmail] with Schemable[ConfirmEmail]:
  override def random: ConfirmEmail = ConfirmEmail(
    userId = UUID.randomUUID(),
    email = faker.internet().emailAddress()
  )

  override def schema: JSONSchema[ConfirmEmail] =
    JSONSchema.of(classOf[ConfirmEmail])

  given Randomizable[ConfirmEmail] = this
  given Schemable[ConfirmEmail] = this


case class ExpiryEmail(userId: UUID, email: String) extends Command

object ExpiryEmail extends Randomizable[ExpiryEmail] with Schemable[ExpiryEmail]:
  override def random: ExpiryEmail = ExpiryEmail(
    userId = UUID.randomUUID(),
    email = faker.internet().emailAddress()
  )

  override def schema: JSONSchema[ExpiryEmail] =
    JSONSchema.of(classOf[ExpiryEmail])

  given Randomizable[ExpiryEmail] = this
  given Schemable[ExpiryEmail] = this

case class RegisterUser(userId: UUID, firstName: String, lastName: String, email: String, password: String) extends Command

object RegisterUser extends Randomizable[RegisterUser] with Schemable[RegisterUser]:
  override def random: RegisterUser = RegisterUser(
    userId = UUID.randomUUID(),
    firstName = faker.name().firstName(),
    lastName = faker.name().lastName(),
    email = faker.internet().emailAddress(),
    password = faker.internet().password()
  )

  override def schema: JSONSchema[RegisterUser] =
    JSONSchema.of(classOf[RegisterUser])

  given Randomizable[RegisterUser] = this
  given Schemable[RegisterUser] = this

case class ChangePassword(userId: UUID, newPassword: String, newPasswordConfirmation: String) extends Command

object ChangePassword extends Randomizable[ChangePassword] with Schemable[ChangePassword]:
  override def random: ChangePassword = 
    val password = faker.internet().password()
    
    ChangePassword(
      userId = UUID.randomUUID(),
      newPassword = password,
      newPasswordConfirmation = password
    )

  override def schema: JSONSchema[ChangePassword] =
    JSONSchema.of(classOf[ChangePassword])

  given Randomizable[ChangePassword] = this
  given Schemable[ChangePassword] = this

case class DefinePrimaryEmail(userId: UUID, email: String) extends Command

object DefinePrimaryEmail extends Randomizable[DefinePrimaryEmail] with Schemable[DefinePrimaryEmail]:
  override def random: DefinePrimaryEmail = DefinePrimaryEmail(
    userId = UUID.randomUUID(),
    email = faker.internet().emailAddress()
  )

  override def schema: JSONSchema[DefinePrimaryEmail] =
    JSONSchema.of(classOf[DefinePrimaryEmail])

  given Randomizable[DefinePrimaryEmail] = this
  given Schemable[DefinePrimaryEmail] = this

case class DeleteUser(userId: UUID) extends Command

object DeleteUser extends Randomizable[DeleteUser] with Schemable[DeleteUser]:
  override def random: DeleteUser = DeleteUser(
    userId = UUID.randomUUID()
  )

  override def schema: JSONSchema[DeleteUser] =
    JSONSchema.of(classOf[DeleteUser])

  given Randomizable[DeleteUser] = this
  given Schemable[DeleteUser] = this
