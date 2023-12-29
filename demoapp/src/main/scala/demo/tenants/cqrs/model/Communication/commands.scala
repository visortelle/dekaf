package demo.tenants.cqrs.model.Communication

import demo.tenants.cqrs.model.Dto.{Money, NotificationMethod, Product}
import demo.tenants.cqrs.shared.{Command, Randomizable, Schemable}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class RequestNotification(methods: Seq[NotificationMethod]) extends Command

object RequestNotification extends Randomizable[RequestNotification] with Schemable[RequestNotification]:
  override def random: RequestNotification = RequestNotification(
    methods = Seq.fill(faker.number().numberBetween(1, 5))(NotificationMethod.random)
  )

  override def schema: JSONSchema[RequestNotification] =
    JSONSchema.of(classOf[RequestNotification])

  given Randomizable[RequestNotification] = this
  given Schemable[RequestNotification] = this

case class EmitNotificationMethod(notificationId: UUID, methodId: UUID) extends Command

object EmitNotificationMethod extends Randomizable[EmitNotificationMethod] with Schemable[EmitNotificationMethod]:
  override def random: EmitNotificationMethod = EmitNotificationMethod(
    notificationId = UUID.randomUUID(),
    methodId = UUID.randomUUID()
  )

  override def schema: JSONSchema[EmitNotificationMethod] =
    JSONSchema.of(classOf[EmitNotificationMethod])

  given Randomizable[EmitNotificationMethod] = this
  given Schemable[EmitNotificationMethod] = this

case class FailNotificationMethod(notificationId: UUID, methodId: UUID) extends Command

object FailNotificationMethod extends Randomizable[FailNotificationMethod] with Schemable[FailNotificationMethod]:
  override def random: FailNotificationMethod = FailNotificationMethod(
    notificationId = UUID.randomUUID(),
    methodId = UUID.randomUUID()
  )

  override def schema: JSONSchema[FailNotificationMethod] =
    JSONSchema.of(classOf[FailNotificationMethod])

  given Randomizable[FailNotificationMethod] = this
  given Schemable[FailNotificationMethod] = this

case class CancelNotificationMethod(notificationId: UUID, methodId: UUID) extends Command

object CancelNotificationMethod extends Randomizable[CancelNotificationMethod] with Schemable[CancelNotificationMethod]:
  override def random: CancelNotificationMethod = CancelNotificationMethod(
    notificationId = UUID.randomUUID(),
    methodId = UUID.randomUUID()
  )

  override def schema: JSONSchema[CancelNotificationMethod] =
    JSONSchema.of(classOf[CancelNotificationMethod])

  given Randomizable[CancelNotificationMethod] = this
  given Schemable[CancelNotificationMethod] = this

case class SendNotificationMethod(notificationId: UUID, methodId: UUID) extends Command

object SendNotificationMethod extends Randomizable[SendNotificationMethod] with Schemable[SendNotificationMethod]:
  override def random: SendNotificationMethod = SendNotificationMethod(
    notificationId = UUID.randomUUID(),
    methodId = UUID.randomUUID()
  )

  override def schema: JSONSchema[SendNotificationMethod] =
    JSONSchema.of(classOf[SendNotificationMethod])

  given Randomizable[SendNotificationMethod] = this
  given Schemable[SendNotificationMethod] = this

case class ResetNotificationMethod(notificationId: UUID, methodId: UUID) extends Command

object ResetNotificationMethod extends Randomizable[ResetNotificationMethod] with Schemable[ResetNotificationMethod]:
  override def random: ResetNotificationMethod = ResetNotificationMethod(
    notificationId = UUID.randomUUID(),
    methodId = UUID.randomUUID()
  )

  override def schema: JSONSchema[ResetNotificationMethod] =
    JSONSchema.of(classOf[ResetNotificationMethod])

  given Randomizable[ResetNotificationMethod] = this
  given Schemable[ResetNotificationMethod] = this
