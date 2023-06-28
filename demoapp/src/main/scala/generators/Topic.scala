package generators

case class Persistent()
case class NonPersistent()
type Persistency = Persistent | NonPersistent

case class Partitioned(partitions: Int)
case class NonPartitioned()
type Partitioning = Partitioned | NonPartitioned

case class Topic(
    name: String,
    tenant: String,
    namespace: String,
    partitioning: Partitioning,
    persistency: Persistency,
) 
