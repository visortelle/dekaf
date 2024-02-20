package demo.tenants.cqrs.model.Payment

import demo.tenants.cqrs.model.Dto.{Address, CartItem, Money, NotificationMethod, PaymentMethod}
import demo.tenants.cqrs.model.{Command, Randomizable, Schemable}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class RequestPayment(orderId: UUID, amountDue: Money, billingAddress: Address, paymentMethods: Seq[PaymentMethod])
    extends Command

object RequestPayment extends Randomizable[RequestPayment] with Schemable[RequestPayment]:
    override def random: RequestPayment = RequestPayment(
        orderId = UUID.randomUUID(),
        amountDue = Money.random,
        billingAddress = Address.random,
        paymentMethods = Seq.fill(faker.number().numberBetween(1, 3))(PaymentMethod.random)
    )

    override def schema: JSONSchema[RequestPayment] =
        JSONSchema.of(classOf[RequestPayment])

    given Randomizable[RequestPayment] = this
    given Schemable[RequestPayment] = this

case class ProceedWithPayment(paymentId: UUID, orderId: UUID) extends Command

object ProceedWithPayment extends Randomizable[ProceedWithPayment] with Schemable[ProceedWithPayment]:
    override def random: ProceedWithPayment = ProceedWithPayment(
        paymentId = UUID.randomUUID(),
        orderId = UUID.randomUUID()
    )

    override def schema: JSONSchema[ProceedWithPayment] =
        JSONSchema.of(classOf[ProceedWithPayment])

    given Randomizable[ProceedWithPayment] = this
    given Schemable[ProceedWithPayment] = this

case class CancelPayment(paymentId: UUID, orderId: UUID) extends Command

object CancelPayment extends Randomizable[CancelPayment] with Schemable[CancelPayment]:
    override def random: CancelPayment = CancelPayment(
        paymentId = UUID.randomUUID(),
        orderId = UUID.randomUUID()
    )

    override def schema: JSONSchema[CancelPayment] =
        JSONSchema.of(classOf[CancelPayment])

    given Randomizable[CancelPayment] = this
    given Schemable[CancelPayment] = this

case class AuthorizePaymentMethod(paymentId: UUID, paymentMethodId: UUID, transactionId: UUID) extends Command

object AuthorizePaymentMethod extends Randomizable[AuthorizePaymentMethod] with Schemable[AuthorizePaymentMethod]:
    override def random: AuthorizePaymentMethod = AuthorizePaymentMethod(
        paymentId = UUID.randomUUID(),
        paymentMethodId = UUID.randomUUID(),
        transactionId = UUID.randomUUID()
    )

    override def schema: JSONSchema[AuthorizePaymentMethod] =
        JSONSchema.of(classOf[AuthorizePaymentMethod])

    given Randomizable[AuthorizePaymentMethod] = this
    given Schemable[AuthorizePaymentMethod] = this

case class DenyPaymentMethod(paymentId: UUID, paymentMethodId: UUID, transactionId: UUID) extends Command

object DenyPaymentMethod extends Randomizable[DenyPaymentMethod] with Schemable[DenyPaymentMethod]:
    override def random: DenyPaymentMethod = DenyPaymentMethod(
        paymentId = UUID.randomUUID(),
        paymentMethodId = UUID.randomUUID(),
        transactionId = UUID.randomUUID()
    )

    override def schema: JSONSchema[DenyPaymentMethod] =
        JSONSchema.of(classOf[DenyPaymentMethod])

    given Randomizable[DenyPaymentMethod] = this
    given Schemable[DenyPaymentMethod] = this

case class CancelPaymentMethod(paymentId: UUID, paymentMethodId: UUID, transactionId: UUID) extends Command

object CancelPaymentMethod extends Randomizable[CancelPaymentMethod] with Schemable[CancelPaymentMethod]:
    override def random: CancelPaymentMethod = CancelPaymentMethod(
        paymentId = UUID.randomUUID(),
        paymentMethodId = UUID.randomUUID(),
        transactionId = UUID.randomUUID()
    )

    override def schema: JSONSchema[CancelPaymentMethod] =
        JSONSchema.of(classOf[CancelPaymentMethod])

    given Randomizable[CancelPaymentMethod] = this
    given Schemable[CancelPaymentMethod] = this

case class RefundPaymentMethod(paymentId: UUID, paymentMethodId: UUID, transactionId: UUID) extends Command

object RefundPaymentMethod extends Randomizable[RefundPaymentMethod] with Schemable[RefundPaymentMethod]:
    override def random: RefundPaymentMethod = RefundPaymentMethod(
        paymentId = UUID.randomUUID(),
        paymentMethodId = UUID.randomUUID(),
        transactionId = UUID.randomUUID()
    )

    override def schema: JSONSchema[RefundPaymentMethod] =
        JSONSchema.of(classOf[RefundPaymentMethod])

    given Randomizable[RefundPaymentMethod] = this
    given Schemable[RefundPaymentMethod] = this

case class DenyPaymentMethodRefund(paymentId: UUID, paymentMethodId: UUID, transactionId: UUID) extends Command

object DenyPaymentMethodRefund extends Randomizable[DenyPaymentMethodRefund] with Schemable[DenyPaymentMethodRefund]:
    override def random: DenyPaymentMethodRefund = DenyPaymentMethodRefund(
        paymentId = UUID.randomUUID(),
        paymentMethodId = UUID.randomUUID(),
        transactionId = UUID.randomUUID()
    )

    override def schema: JSONSchema[DenyPaymentMethodRefund] =
        JSONSchema.of(classOf[DenyPaymentMethodRefund])

    given Randomizable[DenyPaymentMethodRefund] = this
    given Schemable[DenyPaymentMethodRefund] = this

case class DenyPaymentMethodCancellation(paymentId: UUID, paymentMethodId: UUID, transactionId: UUID) extends Command

object DenyPaymentMethodCancellation
    extends Randomizable[DenyPaymentMethodCancellation]
    with Schemable[DenyPaymentMethodCancellation]:
    override def random: DenyPaymentMethodCancellation = DenyPaymentMethodCancellation(
        paymentId = UUID.randomUUID(),
        paymentMethodId = UUID.randomUUID(),
        transactionId = UUID.randomUUID()
    )

    override def schema: JSONSchema[DenyPaymentMethodCancellation] =
        JSONSchema.of(classOf[DenyPaymentMethodCancellation])

    given Randomizable[DenyPaymentMethodCancellation] = this
    given Schemable[DenyPaymentMethodCancellation] = this
