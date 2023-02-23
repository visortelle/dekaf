To create and use a sink, we need several elements: a database, a theme, and a theme schema.

An example will be given on postgresdb.

Example of creating a table in a folder docker-entrypoint-initdb.d/create_tables.sql

1. After creating the database and theme, you must create a theme schema. Example scheme:

{
  "type": "record",
  "name": "TestX",
  "fields": [
    {
      "name": "id",
      "type": "int"
    },
    {
      "name": "name",
      "type": "string"
    },
    {
      "name": "age",
      "type": "int"
    },
    {
      "name": "address",
      "type": "string"
    }
  ]
}

2. The next step is to create the sink. You must select a tenant, namespace, and theme/themes. In the connector path, select connector for your database, and in the config write the data to connect to your database. Example database config:

{
  "userName": "postgres",
  "password": "postgres",
  "jdbcUrl": "jdbc:postgresql://postgresql:5432/postgres",
  "tableName": "users"
}

3. You can check the condition of your sink by writing this command:

  bin/pulsar-admin sinks status \
  --tenant public \
  --namespace default \
  --name users-sink

4. If running = true, it works fine. To check, you can send a message in the topic/messages with this content:

{
  "id": 25,
  "name": "bestName",
  "age": 25,
  "address": "ul. Pyshkina"
}

5. And then check the database for the new field