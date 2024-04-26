package testing

object PulsarResources:
    enum TopicPersistency:
        case Persistent, NonPersistent

    case class Tenant(
        name: String
    ):
        def fqn: String = name

    case class Namespace(
        tenant: Tenant,
        name: String
    ):
        def fqn: String = s"${tenant.fqn}/$name"

    case class Topic(
        persistency: TopicPersistency,
        namespace: Namespace,
        name: String
    ):
        def fqn: String = persistency match
            case TopicPersistency.Persistent    => s"persistent://${namespace.fqn}/$name"
            case TopicPersistency.NonPersistent => s"non-persistent://${namespace.fqn}/$name"
