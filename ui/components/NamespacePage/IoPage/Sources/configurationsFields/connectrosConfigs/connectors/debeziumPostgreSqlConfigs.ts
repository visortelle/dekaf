type PostgreSqlConfigs = {
  "database.hostname": string,
  "database.port": number,
  "database.user": string ,
  "database.password": string,
  "database.dbname": string,
  "database.server.name": string,
  "plugin.name": string,
  "schema.whitelist": string,
  "table.whitelist": string, // "public.users"
  "database.history.pulsar.service.url": string
}

export const postgreSqlDefault: PostgreSqlConfigs = {
  "database.hostname": '',
  "database.port": 1111,
  "database.user": '',
  "database.password": '',
  "database.dbname": '',
  "database.server.name": '',
  "plugin.name": '',
  "schema.whitelist": '',
  "table.whitelist": '', // "public.users"
  "database.history.pulsar.service.url": '',
}