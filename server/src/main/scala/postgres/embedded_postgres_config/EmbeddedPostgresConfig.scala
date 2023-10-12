package postgres.embedded_postgres_config

case class EmbeddedPostgresConfig(
    listenPort: Int,
    pgdataDir: String,
)
