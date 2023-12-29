package demo.tenants.cqrs.model.Order

import demo.tenants.cqrs.model.Dto.{Address, CartItem, Money, NotificationMethod, PaymentMethod}
import demo.tenants.cqrs.shared.{Command, Randomizable, Schemable}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class PlaceOrder(
  cartId: UUID,
  customerId: UUID,
  total: Money,
  billingAddress: Address,
  shippingAddress: Address,
  items: Seq[CartItem],
  paymentMethods: Seq[PaymentMethod]
) extends Command

object PlaceOrder extends Randomizable[PlaceOrder] with Schemable[PlaceOrder]:
  override def random: PlaceOrder =
    val billingAddress = Address.random
    val shippingAddress = if faker.bool.bool() then
      Address.random
    else
      billingAddress

    PlaceOrder(
      cartId = UUID.randomUUID(),
      customerId = UUID.randomUUID(),
      total = Money.random,
      billingAddress = billingAddress,
      shippingAddress = shippingAddress,
      items = Seq.fill(faker.number().numberBetween(1, 5))(CartItem.random),
      paymentMethods = Seq.fill(faker.number().numberBetween(1, 3))(PaymentMethod.random)
    )

  override def schema: JSONSchema[PlaceOrder] =
    JSONSchema.of(classOf[PlaceOrder])

  given Randomizable[PlaceOrder] = this
  given Schemable[PlaceOrder] = this

case class ConfirmOrder(orderId: UUID) extends Command

object ConfirmOrder extends Randomizable[ConfirmOrder] with Schemable[ConfirmOrder]:
  override def random: ConfirmOrder = ConfirmOrder(
    orderId = UUID.randomUUID()
  )

  override def schema: JSONSchema[ConfirmOrder] =
    JSONSchema.of(classOf[ConfirmOrder])

  given Randomizable[ConfirmOrder] = this
  given Schemable[ConfirmOrder] = this

case class CancelOrder(orderId: UUID) extends Command

object CancelOrder extends Randomizable[CancelOrder] with Schemable[CancelOrder]:
  override def random: CancelOrder = CancelOrder(
    orderId = UUID.randomUUID()
  )

  override def schema: JSONSchema[CancelOrder] =
    JSONSchema.of(classOf[CancelOrder])

  given Randomizable[CancelOrder] = this
  given Schemable[CancelOrder] = this
