package demo.tenants.cqrs.model.Order

import demo.tenants.cqrs.shared.*
import demo.tenants.cqrs.model.*
import demo.tenants.cqrs.model.Dto.{Address, Money, OrderItem, PaymentMethod}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class OrderPlaced(
  orderId: UUID,
  customerId: UUID,
  total: Money,
  billingAddress: Address,
  shippingAddress: Address,
  items: Seq[OrderItem],
  paymentMethods: Seq[PaymentMethod],
  status: String,
  version: Long
) extends Event

object OrderPlaced extends Randomizable[OrderPlaced] with Schemable[OrderPlaced]:
  override def random: OrderPlaced =
    val billingAddress = Address.random
    val shippingAddress = if faker.bool.bool() then
      Address.random
    else
      billingAddress

    OrderPlaced(
      orderId = UUID.randomUUID(),
      customerId = UUID.randomUUID(),
      total = Money.random,
      billingAddress = billingAddress,
      shippingAddress = shippingAddress,
      items = Seq.fill(faker.number().numberBetween(1, 5))(OrderItem.random),
      paymentMethods = Seq.fill(faker.number().numberBetween(1, 3))(PaymentMethod.random),
      status = faker.lorem().word(),
      version = faker.number().numberBetween(1, 100)
    )

  override def schema: JSONSchema[OrderPlaced] =
    JSONSchema.of(classOf[OrderPlaced])

  given Randomizable[OrderPlaced] = this
  given Schemable[OrderPlaced] = this

case class OrderConfirmed(orderId: UUID, status: String, version: Long) extends Event

object OrderConfirmed extends Randomizable[OrderConfirmed] with Schemable[OrderConfirmed]:
  override def random: OrderConfirmed = OrderConfirmed(
    orderId = UUID.randomUUID(),
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[OrderConfirmed] =
    JSONSchema.of(classOf[OrderConfirmed])

  given Randomizable[OrderConfirmed] = this
  given Schemable[OrderConfirmed] = this
