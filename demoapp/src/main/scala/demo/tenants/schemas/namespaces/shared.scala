package demo.tenants.schemas.namespaces

import generators.{NonPartitioned, Partitioned, TopicIndex, TopicPartitioning, TopicPersistency, Persistent, NonPersistent}
import net.datafaker.Faker

val faker = new Faker()

def mkRandomPartitionedOrNonPartitioned: TopicIndex => TopicPartitioning =
  if faker.number().randomDouble(2, 0, 1) > 0.8 then
    _ => NonPartitioned()
  else
    _ => Partitioned(faker.number().numberBetween(1, 10))

def mkRandomPersistency: TopicIndex => TopicPersistency =
  if faker.number().randomDouble(2, 0, 1) > 0.8 then
    _ => NonPersistent()
  else
    _ => Persistent()
