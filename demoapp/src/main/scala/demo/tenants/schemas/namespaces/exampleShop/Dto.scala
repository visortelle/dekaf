package demo.tenants.schemas.namespaces.exampleShop
import java.util.UUID
import java.time.LocalDate
import _root_.demo.tenants.schemas.namespaces.faker

object Dto:
  case class Money(amount: Double, currency: String)
  object Money:
    def apply(amount: Double): Money = Money(amount, "USD")

    def random: Money = Money(
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
  object Address:
    def random: Address = Address(
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
    expirationDate: LocalDate,
    number: String,
    holderName: String,
    securityCode: Short
  ) extends PaymentOption
  object CreditCard:
    def random: CreditCard = CreditCard(
      expirationDate = LocalDate.now().plusYears(faker.number().numberBetween(1, 10)),
      number = faker.business().creditCardNumber(),
      holderName = faker.name().fullName().toUpperCase,
      securityCode = faker.number().randomNumber(3, true).shortValue
    )

  case class DebitCard(
    expirationDate: LocalDate,
    number: String,
    holderName: String,
    securityCode: Short
  ) extends PaymentOption
  object DebitCard:
    def random: DebitCard = DebitCard(
      expirationDate = LocalDate.now().plusYears(faker.number().numberBetween(1, 10)),
      number = faker.business().creditCardNumber(),
      holderName = faker.name().fullName().toUpperCase,
      securityCode = faker.number().randomNumber(3, true).shortValue
    )

  case class PayPal(email: String, password: String) extends PaymentOption
  object PayPal:
    def random: PayPal = PayPal(
      email = faker.internet().emailAddress(),
      password = faker.internet().password()
    )
  case class PaymentMethod(id: UUID, amount: Money, option: PaymentOption)
  object PaymentMethod:
    def random: PaymentMethod = PaymentMethod(
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
  object Product:
    def random: Product = Product(
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
  object InventoryItem:
    def random: InventoryItem = InventoryItem(
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
  object CatalogItem:
    def random: CatalogItem = CatalogItem(
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
  object CartItem:
    def random: CartItem = CartItem(
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
  object OrderItem:
    def random: OrderItem = OrderItem(
      id = UUID.randomUUID(),
      product = Product.random,
      quantity = faker.number().numberBetween(1, 1000).shortValue,
      unitPrice = Money.random
    )

  case class Profile(
    firstName: String,
    lastName: String,
    email: String,
    birthdate: Option[LocalDate],
    gender: String
  )
  object Profile:
    def random: Profile = Profile(
      firstName = faker.name().firstName(),
      lastName = faker.name().lastName(),
      email = faker.internet().emailAddress(),
      birthdate = if faker.bool().bool() then Some(faker.date().birthday().toLocalDateTime.toLocalDate) else None,
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
  object ShoppingCart:
    def random: ShoppingCart =
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
