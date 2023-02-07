1. Run docker
2. Execute in pulsar: bin/pulsar-admin schemas upload users -f ./connectors/avro-schema.json
3. Execute in pulsar: bin/pulsar-admin schemas get users
                      bin/pulsar-admin sinks list --tenant public --namespace default
                      bin/pulsar-admin sinks status --tenant public --namespace default --name users
                      bin/pulsar-admin sinks stop --tenant public --namespace default --name user