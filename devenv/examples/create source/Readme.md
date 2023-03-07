className - debeziumPostgreSql  (org.apache.pulsar.io.debezium.DebeziumSource.DebeziumPostgresSource)

archive - https://archive.apache.org/dist/pulsar/pulsar-2.11.0/connectors/pulsar-io-debezium-postgres-2.11.0.nar

X bin/pulsar-admin source localrun --source-config-file debezium-postgres-source-config.yaml
X bin/pulsar-admin source localrun --source-config-file connectors/debezium-postgres-source-config.yaml

bin/pulsar-admin source create --source-config-file connectors/debezium-postgres-source-config.yaml

bin/pulsar-admin sources list
bin/pulsar-admin sources get --tenant public --namespace default --name mySource
bin/pulsar-admin sources status --tenant public --namespace default --name mySource


bin/pulsar-admin sources get --tenant public --namespace default --name debezium-postgres-source
bin/pulsar-admin sources status --tenant public --namespace default --name debezium-postgres-source


    "database.user": "postgres",
    "database.dbname": "postgres",
    "database.hostname": "postgresql",
    "database.password": "postgres",
    "database.history.pulsar.service.url": "pulsar://127.0.0.1:6650",
    "database.server.name": "postgresdb",
    "database.port": "5432",
    "plugin.name": "pgoutput",
    "schema.whitelist": "public",
    "table.whitelist": "public.users"


bin/pulsar-admin source localrun \
    --archive connectors/pulsar-io-debezium-postgres-2.11.0.nar \
    --name debezium-postgres-source \
    --tenant public \
    --namespace default \
    --source-config '{"database.hostname": "postgresql","database.port": "5432","database.user": "postgres","database.password": "postgres","database.dbname": "users","database.server.name": "postgresdb","schema.whitelist": "public","table.whitelist": "public.users","pulsar.service.url": "pulsar://127.0.0.1:6650"}'




 --name mysql
 -p 3306:3306 
 -e MYSQL_ROOT_PASSWORD=debezium 
 -e MYSQL_USER=mysqluser 
 -e MYSQL_PASSWORD=mysqlpw
 debezium/example-mysql:0.9


tenant: "test"
namespace: "test-namespace"
name: "debezium-kafka-source"
topicName: "kafka-connect-topic"
archive: "connectors/pulsar-io-kafka-connect-adaptor-2.3.0.nar"
parallelism: 1

configs:
  task.class: "io.debezium.connector.mysql.MySqlConnectorTask"
  database.hostname: "localhost"
  database.port: "3306"
  database.user: "debezium"
  database.password: "dbz"
  database.server.id: "184054"
  database.server.name: "dbserver1"
  database.whitelist: "inventory"
  database.history: "org.apache.pulsar.io.debezium.PulsarDatabaseHistory"
  database.history.pulsar.topic: "history-topic"
  database.history.pulsar.service.url: "pulsar://127.0.0.1:6650"
  key.converter: "org.apache.kafka.connect.json.JsonConverter"
  value.converter: "org.apache.kafka.connect.json.JsonConverter"
  pulsar.service.url: "pulsar://127.0.0.1:6650"
  offset.storage.topic: "offset-topic"



## jdbcUrl: "jdbc:postgresql://postgresql:5432/postgres"

postgresql
5432
postgres
postgres
postgres
dbserver1


users
pulsar://pulsar:6650
