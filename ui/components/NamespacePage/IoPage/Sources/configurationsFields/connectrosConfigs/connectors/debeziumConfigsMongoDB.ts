type MongoDbConfigs = {
  "mongodb.hosts": string,
  "mongodb.name": string,
  "mongodb.user": string,
  "mongodb.password": string,
  "mongodb.task.id": number,
  "database.whitelist": string,
  "database.history.pulsar.service.url": string,
}

export const mongoDbDefault: MongoDbConfigs = {
  "mongodb.hosts": '',
  "mongodb.name": '',
  "mongodb.user": '',
  "mongodb.password": '',
  "mongodb.task.id": 1,
  "database.whitelist": '',
  "database.history.pulsar.service.url": '',
}