1. Run docker
2. Execute in pulsar: bin/pulsar-admin schemas upload pulsar-postgres-jdbc-sink-topic -f ./connectors/avro-schema.json
3. Execute in pulsar: bin/pulsar-admin schemas get pulsar-postgres-jdbc-sink-topic