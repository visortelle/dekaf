package demo.tenants.schemas.namespaces.exampleShop.shared

import _root_.demo.tenants.schemas.namespaces.faker
import demo.tenants.schemas.namespaces.exampleShop.*

import java.time.{LocalDate, OffsetDateTime, ZoneOffset}
import java.util.UUID
import java.util.concurrent.TimeUnit

object Dto:
  case class Money(amount: Double, currency: String)
  object Money extends Randomizable[Money]:
    def apply(amount: Double): Money = Money(amount, "USD")

    override def random: Money = Money(
      amount = faker.number().randomDouble(2, 0, 1000),
      currency = "USD"
    )

  case class Address(
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    number: Option[Long],
    complement: Option[String]
  )
  object Address extends Randomizable[Address]:
    override def random: Address = Address(
      street = faker.address().streetAddress(),
      city = faker.address().city(),
      state = faker.address().state(),
      zipCode = faker.address().zipCode(),
      country = faker.address().country(),
      number = if faker.bool().bool() then Some(faker.number().randomNumber(9, true)) else None,
      complement = if faker.bool().bool() then Some(faker.address().secondaryAddress()) else None
    )

  sealed trait PaymentOption

  case class CreditCard(
    expirationDate: OffsetDateTime,
    number: String,
    holderName: String,
    securityCode: Short
  ) extends PaymentOption
  object CreditCard extends Randomizable[CreditCard]:
    override def random: CreditCard = CreditCard(
      expirationDate = faker.date().future(365, TimeUnit.DAYS).toInstant.atOffset(ZoneOffset.UTC),
      number = faker.business().creditCardNumber(),
      holderName = faker.name().fullName().toUpperCase,
      securityCode = faker.number().randomNumber(3, true).shortValue
    )

  case class DebitCard(
    expirationDate: OffsetDateTime,
    number: String,
    holderName: String,
    securityCode: Short
  ) extends PaymentOption
  object DebitCard extends Randomizable[DebitCard]:
    override def random: DebitCard = DebitCard(
      expirationDate = faker.date().future(365, TimeUnit.DAYS).toInstant.atOffset(ZoneOffset.UTC),
      number = faker.business().creditCardNumber(),
      holderName = faker.name().fullName().toUpperCase,
      securityCode = faker.number().randomNumber(3, true).shortValue
    )

  case class PayPal(email: String, password: String) extends PaymentOption
  object PayPal extends Randomizable[PayPal]:
    override def random: PayPal = PayPal(
      email = faker.internet().emailAddress(),
      password = faker.internet().password()
    )
  case class PaymentMethod(id: UUID, amount: Money, option: PaymentOption)
  object PaymentMethod extends Randomizable[PaymentMethod]:
    override def random: PaymentMethod = PaymentMethod(
      id = UUID.randomUUID(),
      amount = Money.random,
      option = faker.options().option[PaymentOption](
        CreditCard.random,
        DebitCard.random,
        PayPal.random
      )
    )

  case class Product(
    description: String,
    name: String,
    brand: String,
    category: String,
    unit: String,
    sku: String
  )
  object Product extends Randomizable[Product]:
    override def random: Product = Product(
      description = faker.lorem().characters(20, 100),
      name = faker.commerce().productName(),
      brand = faker.brand().car(),
      category = faker.options.option("Mercedes", "BMW", "Audi", "Porsche", "Volkswagen"),
      unit = faker.options.option("coupe", "sedan", "hatchback", "SUV", "convertible"),
      sku = s"${faker.lorem().characters(2, 4).toUpperCase}/${faker.number().randomNumber(2, true)}/${faker.lorem().characters(2, 4).toUpperCase}"
    )

  case class InventoryItem(
    id: UUID,
    inventoryId: UUID,
    product: Product,
    cost: String,
    quantity: Int
  )
  object InventoryItem extends Randomizable[InventoryItem]:
    override def random: InventoryItem = InventoryItem(
      id = UUID.randomUUID(),
      inventoryId = UUID.randomUUID(),
      product = Product.random,
      cost = faker.commerce().price(1, 10000),
      quantity = faker.number().numberBetween(1, 100)
    )

  case class CatalogItem(
    id: UUID,
    catalogId: UUID,
    inventoryId: UUID,
    product: Product,
    cost: String,
    markup: Double,
    quantity: Int
  )
  object CatalogItem extends Randomizable[CatalogItem]:
    override def random: CatalogItem = CatalogItem(
      id = UUID.randomUUID(),
      catalogId = UUID.randomUUID(),
      inventoryId = UUID.randomUUID(),
      product = Product.random,
      cost = faker.commerce().price(1, 10000),
      markup = faker.number().randomDouble(20, 0, 1000),
      quantity = faker.number().numberBetween(1, 100)
    )

  case class CartItem(
    id: UUID,
    product: Product,
    quantity: Short,
    unitPrice: Money
  )
  object CartItem extends Randomizable[CartItem]:
    override def random: CartItem = CartItem(
      id = UUID.randomUUID(),
      product = Product.random,
      quantity = faker.number().numberBetween(1, 1000).shortValue,
      unitPrice = Money.random
    )

  case class OrderItem(
    id: UUID,
    product: Product,
    quantity: Short,
    unitPrice: Money
  )
  object OrderItem extends Randomizable[OrderItem]:
    override def random: OrderItem = OrderItem(
      id = UUID.randomUUID(),
      product = Product.random,
      quantity = faker.number().numberBetween(1, 1000).shortValue,
      unitPrice = Money.random
    )

  case class Profile(
    firstName: String,
    lastName: String,
    email: String,
    birthdate: Option[OffsetDateTime],
    gender: String
  )
  object Profile extends Randomizable[Profile]:
    override def random: Profile = Profile(
      firstName = faker.name().firstName(),
      lastName = faker.name().lastName(),
      email = faker.internet().emailAddress(),
      birthdate = if faker.bool().bool() then
        Some(faker.date().birthday().toInstant.atOffset(ZoneOffset.UTC))
      else
        None,
      gender = faker.options().option("M", "F", "NB")
    )

  case class ShoppingCart(
    id: UUID,
    customerId: UUID,
    status: String,
    billingAddress: Option[Address],
    shippingAddress: Option[Address],
    total: Money,
    totalPayment: Money,
    amountDue: Money,
    items: Seq[CartItem],
    paymentMethods: Seq[PaymentMethod],
    isDeleted: Boolean
  )
  object ShoppingCart extends Randomizable[ShoppingCart]:
    override def random: ShoppingCart =
      val items = Seq.fill(faker.number().numberBetween(1, 10))(CartItem.random)

      val totalAmount = items.map(item => item.quantity * item.unitPrice.amount).sum

      val totalPaymentAmount = faker.number().randomDouble(10, 0, 1) * totalAmount
      val amountDueAmount = totalAmount - totalPaymentAmount

      ShoppingCart(
          id = UUID.randomUUID(),
          customerId = UUID.randomUUID(),
          status = faker.options().option("OPEN", "CLOSED", "CANCELED", "SHIPPED", "DELIVERED", "SUBMITTED"),
          billingAddress = if faker.bool().bool() then Some(Address.random) else None,
          shippingAddress = if faker.bool().bool() then Some(Address.random) else None,
          total = Money(totalAmount),
          totalPayment = Money(totalPaymentAmount),
          amountDue = Money(amountDueAmount),
          items = items,
          paymentMethods = (1 to faker.number().numberBetween(1, 10)).map(_ => PaymentMethod.random),
          isDeleted = faker.bool().bool()
        )

trait NotificationOption

case class NotificationMethod(id: UUID, option: NotificationOption)
object NotificationMethod extends Randomizable[NotificationMethod]:
  override def random: NotificationMethod = NotificationMethod(
    id = UUID.randomUUID(),
    option = faker.options().option[NotificationOption](
      Email.random,
      Sms.random,
      PushWeb.random,
      PushMobile.random
    )
  )

case class Email(address: String, subject: String, body: String) extends NotificationOption
object Email extends Randomizable[Email]:
  override def random: Email = Email(
    address = faker.internet().emailAddress(),
    subject = faker.lorem().characters(10, 20),
    body = faker.lorem().characters(20, 100)
  )

case class Sms(number: String, body: String) extends NotificationOption
object Sms extends Randomizable[Sms]:
  override def random: Sms = Sms(
    number = faker.phoneNumber().phoneNumber(),
    body = faker.lorem().characters(20, 100)
  )

case class PushWeb(userId: UUID, body: String) extends NotificationOption
object PushWeb extends Randomizable[PushWeb]:
  override def random: PushWeb = PushWeb(
    userId = UUID.randomUUID(),
    body = faker.lorem().characters(20, 100)
  )

case class PushMobile(deviceId: UUID, body: String) extends NotificationOption
object PushMobile extends Randomizable[PushMobile]:
  override def random: PushMobile = PushMobile(
    deviceId = UUID.randomUUID(),
    body = faker.lorem().characters(20, 100)
  )
