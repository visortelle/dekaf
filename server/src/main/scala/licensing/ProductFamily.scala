package licensing

case class Product(
    name: String,
    keygenProductId: String
)

val ProductFamily: List[Product] = List(
    Product(
        name = "Dekaf Community Edition",
        keygenProductId = "da840454-c4a1-4655-ac5d-695e7621afd7"
    ),
    Product(
        name = "Dekaf Standard Edition",
        keygenProductId = "7da73e26-c1bf-4aef-aca0-9bfb3bfc4f90"
    ),
    Product(
        name = "Dekaf Enterprise Edition",
        keygenProductId = "653220a5-a0d8-46ac-8a6a-ae5db2d46e8e"
    )
)
