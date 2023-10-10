package postgres.embedded_postgres_config

case class EmbeddedPostgresConfig(
    listenPort: Int,
    adminUser: String,
    adminPassword: String,
    createDatabases: List[String]
)
