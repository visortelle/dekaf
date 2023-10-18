package postgres

import io.circe.*
import io.circe.generic.semiauto.*
import io.circe.syntax.*

enum PostgresVariant:
    case embedded, postgres
given Decoder[PostgresVariant] = deriveDecoder[PostgresVariant]
given Encoder[PostgresVariant] = deriveEncoder[PostgresVariant]
