package demo.tenants.cqrs.model.ShoppingCart

import demo.tenants.cqrs.model.Dto.{Address, CreditCard, DebitCard, Money, NotificationMethod, PayPal, Product, ShoppingCart}
import demo.tenants.cqrs.shared.{Command, Event, Randomizable, Schemable}
import demo.tenants.schemas.namespaces.faker
import org.apache.pulsar.client.impl.schema.JSONSchema

import java.util.UUID

case class AddCartItem(cartId: UUID, catalogId: UUID, inventoryId: UUID, product: Product, quantity: Int, unitPrice: Money) extends Event

object AddCartItem extends Randomizable[AddCartItem] with Schemable[AddCartItem]:
  override def random: AddCartItem = AddCartItem(
    cartId = UUID.randomUUID(),
    catalogId = UUID.randomUUID(),
    inventoryId = UUID.randomUUID(),
    product = Product.random,
    quantity = faker.number().numberBetween(1, 100),
    unitPrice = Money.random
  )

  override def schema: JSONSchema[AddCartItem] =
    JSONSchema.of(classOf[AddCartItem])

  given Randomizable[AddCartItem] = this
  given Schemable[AddCartItem] = this

case class AddCreditCard(cartId: UUID, amount: Money, creditCard: CreditCard) extends Event

object AddCreditCard extends Randomizable[AddCreditCard] with Schemable[AddCreditCard]:
  override def random: AddCreditCard = AddCreditCard(
    cartId = UUID.randomUUID(),
    amount = Money.random,
    creditCard = CreditCard.random
  )

  override def schema: JSONSchema[AddCreditCard] =
    JSONSchema.of(classOf[AddCreditCard])

  given Randomizable[AddCreditCard] = this
  given Schemable[AddCreditCard] = this

case class AddDebitCard(cartId: UUID, amount: Money, debitCard: DebitCard) extends Event

object AddDebitCard extends Randomizable[AddDebitCard] with Schemable[AddDebitCard]:
  override def random: AddDebitCard = AddDebitCard(
    cartId = UUID.randomUUID(),
    amount = Money.random,
    debitCard = DebitCard.random
  )

  override def schema: JSONSchema[AddDebitCard] =
    JSONSchema.of(classOf[AddDebitCard])

  given Randomizable[AddDebitCard] = this
  given Schemable[AddDebitCard] = this

case class AddPayPal(cartId: UUID, amount: Money, payPal: PayPal) extends Event

object AddPayPal extends Randomizable[AddPayPal] with Schemable[AddPayPal]:
  override def random: AddPayPal = AddPayPal(
    cartId = UUID.randomUUID(),
    amount = Money.random,
    payPal = PayPal.random
  )

  override def schema: JSONSchema[AddPayPal] =
    JSONSchema.of(classOf[AddPayPal])

  given Randomizable[AddPayPal] = this
  given Schemable[AddPayPal] = this

case class AddShippingAddress(cartId: UUID, address: Address) extends Event

object AddShippingAddress extends Randomizable[AddShippingAddress] with Schemable[AddShippingAddress]:
  override def random: AddShippingAddress = AddShippingAddress(
    cartId = UUID.randomUUID(),
    address = Address.random
  )

  override def schema: JSONSchema[AddShippingAddress] =
    JSONSchema.of(classOf[AddShippingAddress])

  given Randomizable[AddShippingAddress] = this
  given Schemable[AddShippingAddress] = this

case class AddBillingAddress(cartId: UUID, address: Address) extends Event

object AddBillingAddress extends Randomizable[AddBillingAddress] with Schemable[AddBillingAddress]:
  override def random: AddBillingAddress = AddBillingAddress(
    cartId = UUID.randomUUID(),
    address = Address.random
  )

  override def schema: JSONSchema[AddBillingAddress] =
    JSONSchema.of(classOf[AddBillingAddress])

  given Randomizable[AddBillingAddress] = this
  given Schemable[AddBillingAddress] = this

case class CreateCart(customerId: UUID, currency: String) extends Event

object CreateCart extends Randomizable[CreateCart] with Schemable[CreateCart]:
  override def random: CreateCart = CreateCart(
    customerId = UUID.randomUUID(),
    currency = faker.currency().code()
  )

  override def schema: JSONSchema[CreateCart] =
    JSONSchema.of(classOf[CreateCart])

  given Randomizable[CreateCart] = this
  given Schemable[CreateCart] = this

case class CheckOutCart(cartId: UUID) extends Event

object CheckOutCart extends Randomizable[CheckOutCart] with Schemable[CheckOutCart]:
  override def random: CheckOutCart = CheckOutCart(
    cartId = UUID.randomUUID()
  )

  override def schema: JSONSchema[CheckOutCart] =
    JSONSchema.of(classOf[CheckOutCart])

  given Randomizable[CheckOutCart] = this
  given Schemable[CheckOutCart] = this

case class RemoveCartItem(cartId: UUID, itemId: UUID) extends Event

object RemoveCartItem extends Randomizable[RemoveCartItem] with Schemable[RemoveCartItem]:
  override def random: RemoveCartItem = RemoveCartItem(
    cartId = UUID.randomUUID(),
    itemId = UUID.randomUUID()
  )

  override def schema: JSONSchema[RemoveCartItem] =
    JSONSchema.of(classOf[RemoveCartItem])

  given Randomizable[RemoveCartItem] = this
  given Schemable[RemoveCartItem] = this

case class ChangeCartItemQuantity(cartId: UUID, itemId: UUID, newQuantity: Int) extends Event

object ChangeCartItemQuantity extends Randomizable[ChangeCartItemQuantity] with Schemable[ChangeCartItemQuantity]:
  override def random: ChangeCartItemQuantity = ChangeCartItemQuantity(
    cartId = UUID.randomUUID(),
    itemId = UUID.randomUUID(),
    newQuantity = faker.number().numberBetween(1, 100)
  )

  override def schema: JSONSchema[ChangeCartItemQuantity] =
    JSONSchema.of(classOf[ChangeCartItemQuantity])

  given Randomizable[ChangeCartItemQuantity] = this
  given Schemable[ChangeCartItemQuantity] = this

case class DiscardCart(cartId: UUID) extends Event

object DiscardCart extends Randomizable[DiscardCart] with Schemable[DiscardCart]:
  override def random: DiscardCart = DiscardCart(
    cartId = UUID.randomUUID()
  )

  override def schema: JSONSchema[DiscardCart] =
    JSONSchema.of(classOf[DiscardCart])

  given Randomizable[DiscardCart] = this
  given Schemable[DiscardCart] = this

case class RemovePaymentMethod(cartId: UUID, methodId: UUID) extends Event

object RemovePaymentMethod extends Randomizable[RemovePaymentMethod] with Schemable[RemovePaymentMethod]:
  override def random: RemovePaymentMethod = RemovePaymentMethod(
    cartId = UUID.randomUUID(),
    methodId = UUID.randomUUID()
  )

  override def schema: JSONSchema[RemovePaymentMethod] =
    JSONSchema.of(classOf[RemovePaymentMethod])

  given Randomizable[RemovePaymentMethod] = this
  given Schemable[RemovePaymentMethod] = this

case class RebuildCartProjection(projection: String) extends Event

object RebuildCartProjection extends Randomizable[RebuildCartProjection] with Schemable[RebuildCartProjection]:
  override def random: RebuildCartProjection = RebuildCartProjection(
    projection = faker.lorem().word()
  )

  override def schema: JSONSchema[RebuildCartProjection] =
    JSONSchema.of(classOf[RebuildCartProjection])

  given Randomizable[RebuildCartProjection] = this
  given Schemable[RebuildCartProjection] = this

