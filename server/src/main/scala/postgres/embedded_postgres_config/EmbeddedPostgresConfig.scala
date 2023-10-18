package postgres.embedded_postgres_config

case class EmbeddedPostgresConfig(
    host: String,
    port: Int,
    dataDir: String,
    user: String,
    password: String,
    database: String
)
