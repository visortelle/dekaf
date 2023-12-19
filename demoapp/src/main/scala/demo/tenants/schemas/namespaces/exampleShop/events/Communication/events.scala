package demo.tenants.schemas.namespaces.exampleShop.events.Communication

import demo.tenants.schemas.namespaces.exampleShop.shared.Dto.{Money, Product}
import demo.tenants.schemas.namespaces.exampleShop.shared.{Command, Event, NotificationMethod, Randomizable, Schemable}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class NotificationRequested(notificationId: UUID, methods: Seq[NotificationMethod], version: Long) extends Event

object NotificationRequested extends Randomizable[NotificationRequested] with Schemable[NotificationRequested]:
  override def random: NotificationRequested = NotificationRequested(
    notificationId = UUID.randomUUID(),
    methods = Seq.fill(faker.number().numberBetween(1, 5))(NotificationMethod.random),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[NotificationRequested] =
    JSONSchema.of(classOf[NotificationRequested])

  given Randomizable[NotificationRequested] = this
  given Schemable[NotificationRequested] = this

case class NotificationMethodFailed(notificationId: UUID, methodId: UUID, version: Long) extends Event

object NotificationMethodFailed extends Randomizable[NotificationMethodFailed] with Schemable[NotificationMethodFailed]:
  override def random: NotificationMethodFailed = NotificationMethodFailed(
    notificationId = UUID.randomUUID(),
    methodId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[NotificationMethodFailed] =
    JSONSchema.of(classOf[NotificationMethodFailed])

  given Randomizable[NotificationMethodFailed] = this
  given Schemable[NotificationMethodFailed] = this

case class NotificationMethodSent(notificationId: UUID, methodId: UUID, version: Long) extends Event

object NotificationMethodSent extends Randomizable[NotificationMethodSent] with Schemable[NotificationMethodSent]:
  override def random: NotificationMethodSent = NotificationMethodSent(
    notificationId = UUID.randomUUID(),
    methodId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[NotificationMethodSent] =
    JSONSchema.of(classOf[NotificationMethodSent])

  given Randomizable[NotificationMethodSent] = this
  given Schemable[NotificationMethodSent] = this

case class NotificationMethodCancelled(notificationId: UUID, methodId: UUID, version: Long) extends Event

object NotificationMethodCancelled extends Randomizable[NotificationMethodCancelled] with Schemable[NotificationMethodCancelled]:
  override def random: NotificationMethodCancelled = NotificationMethodCancelled(
    notificationId = UUID.randomUUID(),
    methodId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[NotificationMethodCancelled] =
    JSONSchema.of(classOf[NotificationMethodCancelled])

  given Randomizable[NotificationMethodCancelled] = this
  given Schemable[NotificationMethodCancelled] = this

case class NotificationMethodReset(notificationId: UUID, methodId: UUID, version: Long) extends Event

object NotificationMethodReset extends Randomizable[NotificationMethodReset] with Schemable[NotificationMethodReset]:
  override def random: NotificationMethodReset = NotificationMethodReset(
    notificationId = UUID.randomUUID(),
    methodId = UUID.randomUUID(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[NotificationMethodReset] =
    JSONSchema.of(classOf[NotificationMethodReset])

  given Randomizable[NotificationMethodReset] = this
  given Schemable[NotificationMethodReset] = this
