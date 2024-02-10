package demo.tenants.cqrs.model.Payment

import demo.tenants.cqrs.shared.*
import demo.tenants.cqrs.model.*
import demo.tenants.cqrs.model.Dto.{Address, CreditCard, DebitCard, Money, PayPal}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class PaymentRequested(paymentId: UUID, orderId: UUID, amount: Money, billingAddress: Address, status: String, version: Long) extends Event

object PaymentRequested extends Randomizable[PaymentRequested] with Schemable[PaymentRequested]:
  override def random: PaymentRequested = PaymentRequested(
    paymentId = UUID.randomUUID(),
    orderId = UUID.randomUUID(),
    amount = Money.random,
    billingAddress = Address.random,
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PaymentRequested] =
    JSONSchema.of(classOf[PaymentRequested])

  given Randomizable[PaymentRequested] = this
  given Schemable[PaymentRequested] = this

case class PaymentCanceled(paymentId: UUID, orderId: UUID, status: String, version: Long) extends Event

object PaymentCanceled extends Randomizable[PaymentCanceled] with Schemable[PaymentCanceled]:
  override def random: PaymentCanceled = PaymentCanceled(
    paymentId = UUID.randomUUID(),
    orderId = UUID.randomUUID(),
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PaymentCanceled] =
    JSONSchema.of(classOf[PaymentCanceled])

  given Randomizable[PaymentCanceled] = this
  given Schemable[PaymentCanceled] = this

case class PaymentCompleted(paymentId: UUID, orderId: UUID, status: String, version: Long) extends Event

object PaymentCompleted extends Randomizable[PaymentCompleted] with Schemable[PaymentCompleted]:
  override def random: PaymentCompleted = PaymentCompleted(
    paymentId = UUID.randomUUID(),
    orderId = UUID.randomUUID(),
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PaymentCompleted] =
    JSONSchema.of(classOf[PaymentCompleted])

  given Randomizable[PaymentCompleted] = this
  given Schemable[PaymentCompleted] = this

case class PaymentNotCompleted(paymentId: UUID, orderId: UUID, status: String, version: Long) extends Event

object PaymentNotCompleted extends Randomizable[PaymentNotCompleted] with Schemable[PaymentNotCompleted]:
  override def random: PaymentNotCompleted = PaymentNotCompleted(
    paymentId = UUID.randomUUID(),
    orderId = UUID.randomUUID(),
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PaymentNotCompleted] =
    JSONSchema.of(classOf[PaymentNotCompleted])

  given Randomizable[PaymentNotCompleted] = this
  given Schemable[PaymentNotCompleted] = this


case class PaymentMethodAuthorized(paymentId: UUID, paymentMethodId: UUID, transactionId: UUID, status: String, version: Long) extends Event

object PaymentMethodAuthorized extends Randomizable[PaymentMethodAuthorized] with Schemable[PaymentMethodAuthorized]:
  override def random: PaymentMethodAuthorized = PaymentMethodAuthorized(
    paymentId = UUID.randomUUID(),
    paymentMethodId = UUID.randomUUID(),
    transactionId = UUID.randomUUID(),
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PaymentMethodAuthorized] =
    JSONSchema.of(classOf[PaymentMethodAuthorized])

  given Randomizable[PaymentMethodAuthorized] = this
  given Schemable[PaymentMethodAuthorized] = this

case class PaymentMethodDenied(paymentId: UUID, paymentMethodId: UUID, transactionId: UUID, status: String, version: Long) extends Event

object PaymentMethodDenied extends Randomizable[PaymentMethodDenied] with Schemable[PaymentMethodDenied]:
  override def random: PaymentMethodDenied = PaymentMethodDenied(
    paymentId = UUID.randomUUID(),
    paymentMethodId = UUID.randomUUID(),
    transactionId = UUID.randomUUID(),
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PaymentMethodDenied] =
    JSONSchema.of(classOf[PaymentMethodDenied])

  given Randomizable[PaymentMethodDenied] = this
  given Schemable[PaymentMethodDenied] = this

case class PaymentMethodRefunded(paymentId: UUID, paymentMethodId: UUID, transactionId: UUID, status: String, version: Long) extends Event

object PaymentMethodRefunded extends Randomizable[PaymentMethodRefunded] with Schemable[PaymentMethodRefunded]:
  override def random: PaymentMethodRefunded = PaymentMethodRefunded(
    paymentId = UUID.randomUUID(),
    paymentMethodId = UUID.randomUUID(),
    transactionId = UUID.randomUUID(),
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PaymentMethodRefunded] =
    JSONSchema.of(classOf[PaymentMethodRefunded])

  given Randomizable[PaymentMethodRefunded] = this
  given Schemable[PaymentMethodRefunded] = this

case class PaymentMethodRefundDenied(paymentId: UUID, paymentMethodId: UUID, transactionId: UUID, status: String, version: Long) extends Event

object PaymentMethodRefundDenied extends Randomizable[PaymentMethodRefundDenied] with Schemable[PaymentMethodRefundDenied]:
  override def random: PaymentMethodRefundDenied = PaymentMethodRefundDenied(
    paymentId = UUID.randomUUID(),
    paymentMethodId = UUID.randomUUID(),
    transactionId = UUID.randomUUID(),
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PaymentMethodRefundDenied] =
    JSONSchema.of(classOf[PaymentMethodRefundDenied])

  given Randomizable[PaymentMethodRefundDenied] = this
  given Schemable[PaymentMethodRefundDenied] = this

case class PaymentMethodCancellationDenied(paymentId: UUID, paymentMethodId: UUID, transactionId: UUID, status: String, version: Long) extends Event

object PaymentMethodCancellationDenied extends Randomizable[PaymentMethodCancellationDenied] with Schemable[PaymentMethodCancellationDenied]:
  override def random: PaymentMethodCancellationDenied = PaymentMethodCancellationDenied(
    paymentId = UUID.randomUUID(),
    paymentMethodId = UUID.randomUUID(),
    transactionId = UUID.randomUUID(),
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PaymentMethodCancellationDenied] =
    JSONSchema.of(classOf[PaymentMethodCancellationDenied])

  given Randomizable[PaymentMethodCancellationDenied] = this
  given Schemable[PaymentMethodCancellationDenied] = this


case class PaymentMethodCanceled(paymentId: UUID, paymentMethodId: UUID, transactionId: UUID, status: String, version: Long) extends Event

object PaymentMethodCanceled extends Randomizable[PaymentMethodCanceled] with Schemable[PaymentMethodCanceled]:
  override def random: PaymentMethodCanceled = PaymentMethodCanceled(
    paymentId = UUID.randomUUID(),
    paymentMethodId = UUID.randomUUID(),
    transactionId = UUID.randomUUID(),
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PaymentMethodCanceled] =
    JSONSchema.of(classOf[PaymentMethodCanceled])

  given Randomizable[PaymentMethodCanceled] = this
  given Schemable[PaymentMethodCanceled] = this

case class CreditCardAdded(cartId: UUID, methodId: UUID, amount: Money, creditCard: CreditCard, status: String, version: Long) extends Event

object CreditCardAdded extends Randomizable[CreditCardAdded] with Schemable[CreditCardAdded]:
  override def random: CreditCardAdded = CreditCardAdded(
    cartId = UUID.randomUUID(),
    methodId = UUID.randomUUID(),
    amount = Money.random,
    creditCard = CreditCard.random,
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CreditCardAdded] =
    JSONSchema.of(classOf[CreditCardAdded])

  given Randomizable[CreditCardAdded] = this
  given Schemable[CreditCardAdded] = this

case class DebitCardAdded(cartId: UUID, methodId: UUID, amount: Money, debitCard: DebitCard, status: String, version: Long) extends Event

object DebitCardAdded extends Randomizable[DebitCardAdded] with Schemable[DebitCardAdded]:
  override def random: DebitCardAdded = DebitCardAdded(
    cartId = UUID.randomUUID(),
    methodId = UUID.randomUUID(),
    amount = Money.random,
    debitCard = DebitCard.random,
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[DebitCardAdded] =
    JSONSchema.of(classOf[DebitCardAdded])

  given Randomizable[DebitCardAdded] = this
  given Schemable[DebitCardAdded] = this

case class PayPalAdded(cartId: UUID, methodId: UUID, amount: Money, payPal: PayPal, status: String, version: Long) extends Event

object PayPalAdded extends Randomizable[PayPalAdded] with Schemable[PayPalAdded]:
  override def random: PayPalAdded = PayPalAdded(
    cartId = UUID.randomUUID(),
    methodId = UUID.randomUUID(),
    amount = Money.random,
    payPal = PayPal.random,
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PayPalAdded] =
    JSONSchema.of(classOf[PayPalAdded])

  given Randomizable[PayPalAdded] = this
  given Schemable[PayPalAdded] = this
