package library

case class ExactTenantMatcher(tenant: String):
    def test(target: TenantMatcher): Boolean = target.matcher match
        case t: AllTenantMatcher   => true
        case t: ExactTenantMatcher => t.tenant == tenant

case class AllTenantMatcher():
    def test(target: TenantMatcher): Boolean = true

case class TenantMatcher(matcher: ExactTenantMatcher | AllTenantMatcher):
    def test(target: TenantMatcher): Boolean = matcher match
        case m: ExactTenantMatcher => m.test(target)
        case m: AllTenantMatcher   => m.test(target)

case class AllNamespaceMatcher(tenant: TenantMatcher):
    def test(target: NamespaceMatcher): Boolean = target.matcher match
        case t: AllNamespaceMatcher   => tenant.test(t.tenant)
        case t: ExactNamespaceMatcher => tenant.test(t.tenant)

case class ExactNamespaceMatcher(tenant: TenantMatcher, namespace: String):
    def test(target: NamespaceMatcher): Boolean = target.matcher match
        case t: AllNamespaceMatcher   => tenant.test(t.tenant)
        case t: ExactNamespaceMatcher => tenant.test(t.tenant) && t.namespace == namespace

case class NamespaceMatcher(matcher: ExactNamespaceMatcher | AllNamespaceMatcher):
    def test(target: NamespaceMatcher): Boolean = matcher match
        case m: ExactNamespaceMatcher => m.test(target)
        case m: AllNamespaceMatcher   => m.test(target)

case class AllTopicMatcher(namespace: NamespaceMatcher):
    def test(target: TopicMatcher): Boolean = target.matcher match
        case t: AllTopicMatcher => namespace.test(t.namespace)
        case t: ExactTopicMatcher => namespace.test(t.namespace)

case class ExactTopicMatcher(namespace: NamespaceMatcher, topic: String):
    def test(target: TopicMatcher): Boolean = target.matcher match
        case t: AllTopicMatcher => namespace.test(t.namespace)
        case t: ExactTopicMatcher => namespace.test(t.namespace) && t.topic == topic

case class TopicMatcher(matcher: AllTopicMatcher | ExactTopicMatcher):
    def test(target: TopicMatcher): Boolean = matcher match
        case m: ExactTopicMatcher  => m.test(target)
        case m: AllTopicMatcher => m.test(target)

case class ResourceMatcher(matcher: TenantMatcher | NamespaceMatcher | TopicMatcher):
    def test(target: ResourceMatcher): Boolean = (matcher, target.matcher) match
        case  (m: TenantMatcher,  t: TenantMatcher) => m.test(t)
        case (m: NamespaceMatcher, t: NamespaceMatcher) => m.test(t)
        case (m: TopicMatcher, t: TopicMatcher) => m.test(t)
