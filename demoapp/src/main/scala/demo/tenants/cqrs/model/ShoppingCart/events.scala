package demo.tenants.cqrs.model.ShoppingCart

import demo.tenants.cqrs.shared.*
import demo.tenants.cqrs.model.*
import demo.tenants.cqrs.model.Dto.{Address, CreditCard, DebitCard, Money, PayPal, Product, ShoppingCart}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class CartCreated(cartId: UUID, customerId: UUID, total: Money, status: String, version: Long) extends Event

object CartCreated extends Randomizable[CartCreated] with Schemable[CartCreated]:
  override def random: CartCreated = CartCreated(
    cartId = UUID.randomUUID(),
    customerId = UUID.randomUUID(),
    total = Money.random,
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CartCreated] =
    JSONSchema.of(classOf[CartCreated])

  given Randomizable[CartCreated] = this
  given Schemable[CartCreated] = this

case class CartItemAdded(cartId: UUID, itemId: UUID, inventoryId: UUID, product: Product, quantity: Int, unitPrice: Money, newCartTotal: Money, version: Long) extends Event

object CartItemAdded extends Randomizable[CartItemAdded] with Schemable[CartItemAdded]:
  override def random: CartItemAdded = CartItemAdded(
    cartId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    inventoryId = UUID.randomUUID(),
    product = Product.random,
    quantity = faker.number().numberBetween(1, 100),
    unitPrice = Money.random,
    newCartTotal = Money.random,
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CartItemAdded] =
    JSONSchema.of(classOf[CartItemAdded])

  given Randomizable[CartItemAdded] = this
  given Schemable[CartItemAdded] = this

case class CartItemIncreased(cartId: UUID, itemId: UUID, newQuantity: Int, unitPrice: Money, newCartTotal: Money, version: Long) extends Event

object CartItemIncreased extends Randomizable[CartItemIncreased] with Schemable[CartItemIncreased]:
  override def random: CartItemIncreased = CartItemIncreased(
    cartId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    newQuantity = faker.number().numberBetween(1, 100),
    unitPrice = Money.random,
    newCartTotal = Money.random,
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CartItemIncreased] =
    JSONSchema.of(classOf[CartItemIncreased])

  given Randomizable[CartItemIncreased] = this
  given Schemable[CartItemIncreased] = this

case class CartItemDecreased(cartId: UUID, itemId: UUID, newQuantity: Int, unitPrice: Money, newCartTotal: Money, version: Long) extends Event

object CartItemDecreased extends Randomizable[CartItemDecreased] with Schemable[CartItemDecreased]:
  override def random: CartItemDecreased = CartItemDecreased(
    cartId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    newQuantity = faker.number().numberBetween(1, 100),
    unitPrice = Money.random,
    newCartTotal = Money.random,
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CartItemDecreased] =
    JSONSchema.of(classOf[CartItemDecreased])

  given Randomizable[CartItemDecreased] = this
  given Schemable[CartItemDecreased] = this

case class CartItemRemoved(cartId: UUID, itemId: UUID, unitPrice: Money, quantity: Int, newCartTotal: Money, version: Long) extends Event

object CartItemRemoved extends Randomizable[CartItemRemoved] with Schemable[CartItemRemoved]:
  override def random: CartItemRemoved = CartItemRemoved(
    cartId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    unitPrice = Money.random,
    quantity = faker.number().numberBetween(1, 100),
    newCartTotal = Money.random,
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CartItemRemoved] =
    JSONSchema.of(classOf[CartItemRemoved])

  given Randomizable[CartItemRemoved] = this
  given Schemable[CartItemRemoved] = this


case class CartCheckedOut(cartId: UUID, status: String, version: Long) extends Event

object CartCheckedOut extends Randomizable[CartCheckedOut] with Schemable[CartCheckedOut]:
  override def random: CartCheckedOut = CartCheckedOut(
    cartId = UUID.randomUUID(),
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CartCheckedOut] =
    JSONSchema.of(classOf[CartCheckedOut])

  given Randomizable[CartCheckedOut] = this
  given Schemable[CartCheckedOut] = this

case class ShippingAddressAdded(cartId: UUID, address: Address, version: Long) extends Event

object ShippingAddressAdded extends Randomizable[ShippingAddressAdded] with Schemable[ShippingAddressAdded]:
  override def random: ShippingAddressAdded = ShippingAddressAdded(
    cartId = UUID.randomUUID(),
    address = Address.random,
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[ShippingAddressAdded] =
    JSONSchema.of(classOf[ShippingAddressAdded])

  given Randomizable[ShippingAddressAdded] = this
  given Schemable[ShippingAddressAdded] = this

case class BillingAddressAdded(cartId: UUID, address: Address, version: Long) extends Event

object BillingAddressAdded extends Randomizable[BillingAddressAdded] with Schemable[BillingAddressAdded]:
  override def random: BillingAddressAdded = BillingAddressAdded(
    cartId = UUID.randomUUID(),
    address = Address.random,
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[BillingAddressAdded] =
    JSONSchema.of(classOf[BillingAddressAdded])

  given Randomizable[BillingAddressAdded] = this
  given Schemable[BillingAddressAdded] = this

case class CartDiscarded(cartId: UUID, status: String, version: Long) extends Event

object CartDiscarded extends Randomizable[CartDiscarded] with Schemable[CartDiscarded]:
  override def random: CartDiscarded = CartDiscarded(
    cartId = UUID.randomUUID(),
    status = faker.lorem().word(),
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CartDiscarded] =
    JSONSchema.of(classOf[CartDiscarded])

  given Randomizable[CartDiscarded] = this
  given Schemable[CartDiscarded] = this

case class CreditCardAdded(cartId: UUID, methodId: UUID, amount: Money, creditCard: CreditCard, version: Long) extends Event

object CreditCardAdded extends Randomizable[CreditCardAdded] with Schemable[CreditCardAdded]:
  override def random: CreditCardAdded = CreditCardAdded(
    cartId = UUID.randomUUID(),
    methodId = UUID.randomUUID(),
    amount = Money.random,
    creditCard = CreditCard.random,
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[CreditCardAdded] =
    JSONSchema.of(classOf[CreditCardAdded])

  given Randomizable[CreditCardAdded] = this
  given Schemable[CreditCardAdded] = this

case class DebitCardAdded(cartId: UUID, methodId: UUID, amount: Money, debitCard: DebitCard, version: Long) extends Event

object DebitCardAdded extends Randomizable[DebitCardAdded] with Schemable[DebitCardAdded]:
  override def random: DebitCardAdded = DebitCardAdded(
    cartId = UUID.randomUUID(),
    methodId = UUID.randomUUID(),
    amount = Money.random,
    debitCard = DebitCard.random,
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[DebitCardAdded] =
    JSONSchema.of(classOf[DebitCardAdded])

  given Randomizable[DebitCardAdded] = this
  given Schemable[DebitCardAdded] = this

case class PayPalAdded(cartId: UUID, methodId: UUID, amount: Money, payPal: PayPal, version: Long) extends Event

object PayPalAdded extends Randomizable[PayPalAdded] with Schemable[PayPalAdded]:
  override def random: PayPalAdded = PayPalAdded(
    cartId = UUID.randomUUID(),
    methodId = UUID.randomUUID(),
    amount = Money.random,
    payPal = PayPal.random,
    version = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[PayPalAdded] =
    JSONSchema.of(classOf[PayPalAdded])

  given Randomizable[PayPalAdded] = this
  given Schemable[PayPalAdded] = this
