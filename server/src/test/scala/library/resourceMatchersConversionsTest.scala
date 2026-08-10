package library

import zio.test.*
import com.tools.teal.pulsar.ui.library.v1.resource_matchers as pb
import scala.util.Try

/** Unit coverage for `library/resourceMatchersConversions.scala` - the proto <-> model boundary.
  *
  * `resourceMatchersTest.scala` only exercises the `.test()` predicates in `resourceMatchers.scala`;
  * the conversions were untested, even though `LibraryServiceImpl.listLibraryItems` /
  * `getLibraryItemsCount` call `resourceMatcherFromPb` directly on UNTRUSTED request data, and
  * `LibraryItemMetadata.fromPb` calls it on every matcher of every item read off disk.
  *
  * The proto has no regex matcher variant - the shape vocabulary is exactly
  * instance | tenant{exact,all} | namespace{exact,all} | topic{exact,all}, enumerated below.
  * (`AllNamespaceMatcher.namespace_regex` is a declared proto FIELD with no model counterpart -
  * setting it is rejected rather than ignored; pinned by its own two tests. The disk-read path is
  * the one exception: `Library.scan` strips a set regex before converting, so a stored ITEM keeps
  * loading - pinned in libraryScanTest.)
  *
  * No shared mutable state, so the default parallel test execution is safe here.
  */
object resourceMatchersConversionsTest extends ZIOSpecDefault {

    private val tenantExact = TenantMatcher(matcher = ExactTenantMatcher(tenant = "tenant-a"))
    private val tenantAll = TenantMatcher(matcher = AllTenantMatcher())

    private val nsExactUnderExactTenant =
        NamespaceMatcher(matcher = ExactNamespaceMatcher(tenant = tenantExact, namespace = "ns-a"))
    private val nsExactUnderAllTenant =
        NamespaceMatcher(matcher = ExactNamespaceMatcher(tenant = tenantAll, namespace = "ns-a"))
    private val nsAllUnderExactTenant = NamespaceMatcher(matcher = AllNamespaceMatcher(tenant = tenantExact))
    private val nsAllUnderAllTenant = NamespaceMatcher(matcher = AllNamespaceMatcher(tenant = tenantAll))

    /** Every ResourceMatcher shape the model can express, including each nested tenant/namespace variant. */
    private val allShapes: List[ResourceMatcher] = List(
        ResourceMatcher(matcher = InstanceMatcher()),
        ResourceMatcher(matcher = tenantExact),
        ResourceMatcher(matcher = tenantAll),
        ResourceMatcher(matcher = nsExactUnderExactTenant),
        ResourceMatcher(matcher = nsExactUnderAllTenant),
        ResourceMatcher(matcher = nsAllUnderExactTenant),
        ResourceMatcher(matcher = nsAllUnderAllTenant),
        ResourceMatcher(matcher = TopicMatcher(matcher = ExactTopicMatcher(namespace = nsExactUnderExactTenant, topic = "topic-a"))),
        ResourceMatcher(matcher = TopicMatcher(matcher = ExactTopicMatcher(namespace = nsAllUnderAllTenant, topic = "topic-a"))),
        ResourceMatcher(matcher = TopicMatcher(matcher = AllTopicMatcher(namespace = nsExactUnderExactTenant))),
        ResourceMatcher(matcher = TopicMatcher(matcher = AllTopicMatcher(namespace = nsAllUnderAllTenant)))
    )

    /** The deepest shape: topic -> namespace -> tenant, every level an `exact`. */
    private val deepestShape =
        ResourceMatcher(matcher = TopicMatcher(matcher = ExactTopicMatcher(namespace = nsExactUnderExactTenant, topic = "topic-a")))

    def spec = suite(this.getClass.toString)(
        test("every matcher shape survives a model -> pb -> model round-trip") {
            val broken = allShapes.filter(shape => resourceMatcherFromPb(resourceMatcherToPb(shape)) != shape)
            assertTrue(
                allShapes.size == 11, // instance + 2 tenant + 4 namespace + 4 topic
                allShapes.distinct.size == 11, // the shapes really are distinct - equality discriminates
                broken.isEmpty
            )
        },
        test("toPb populates the nested pb message fields instead of leaving them unset") {
            // A dropped nested field would round-trip "fine" only because fromPb would blow up on it -
            // assert the pb intermediate directly so the two directions cannot hide each other's bug.
            val encoded = resourceMatcherToPb(deepestShape)
            val exactTopic = encoded.matcher.topic.flatMap(_.matcher.exact)
            val namespace = exactTopic.flatMap(_.namespace)
            val exactNamespace = namespace.flatMap(_.matcher.exact)
            val tenant = exactNamespace.flatMap(_.tenant)

            assertTrue(
                exactTopic.map(_.topic).contains("topic-a"),
                namespace.isDefined,
                exactNamespace.map(_.namespace).contains("ns-a"),
                tenant.isDefined,
                tenant.flatMap(_.matcher.exact).map(_.tenant).contains("tenant-a")
            )
        },
        test("a wire-encoded matcher decodes back into the same model value") {
            // The on-disk library format and the gRPC surface are both real protobuf bytes, so exercise
            // the encode/parse legs too - not just the in-memory case-class hop.
            val bytes = resourceMatcherToPb(deepestShape).toByteArray
            val decoded = resourceMatcherFromPb(pb.ResourceMatcher.parseFrom(bytes))
            assertTrue(
                bytes.nonEmpty,
                decoded == deepestShape,
                // a different-tenant shape must NOT decode equal - guards against a degenerate compare
                decoded != ResourceMatcher(matcher =
                    TopicMatcher(matcher =
                        ExactTopicMatcher(
                            namespace = NamespaceMatcher(matcher =
                                ExactNamespaceMatcher(tenant = TenantMatcher(matcher = ExactTenantMatcher("tenant-b")), namespace = "ns-a")
                            ),
                            topic = "topic-a"
                        )
                    )
                )
            )
        },
        test("an unset oneof is rejected with IllegalArgumentException") {
            // The oneof discriminators ARE guarded (`case _ => throw new IllegalArgumentException`),
            // which LibraryServiceImpl maps to INVALID_ARGUMENT. This is the contrast case for the
            // unset-nested-message tests below.
            val resource = Try(resourceMatcherFromPb(pb.ResourceMatcher()))
            val tenant = Try(tenantMatcherFromPb(pb.TenantMatcher()))
            val namespace = Try(namespaceMatcherFromPb(pb.NamespaceMatcher()))
            val topic = Try(topicMatcherFromPb(pb.TopicMatcher()))

            assertTrue(
                resource.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                tenant.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                namespace.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                topic.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException])
            )
        },
        test("an unset nested message field is rejected cleanly, not with NoSuchElementException") {
            // REGRESSION (fixed 2026-07-25) - resourceMatchersConversions.scala used to call `.get` on the
            // Option-typed nested proto field. A default-constructed proto (an older client, or any
            // request that simply omits the field) therefore raises NoSuchElementException, which
            // LibraryServiceImpl's `case e: Exception` maps to INTERNAL - a 500 for what is plainly
            // caller-supplied malformed input. It should be an IllegalArgumentException like every
            // other malformed-input path in this same file (-> INVALID_ARGUMENT).
            val exactNamespace = Try(exactNamespaceMatcherFromPb(pb.ExactNamespaceMatcher(namespace = "ns-a")))
            val allNamespace = Try(allNamespaceMatcherFromPb(pb.AllNamespaceMatcher()))
            val exactTopic = Try(exactTopicMatcherFromPb(pb.ExactTopicMatcher(topic = "topic-a")))
            val allTopic = Try(allTopicMatcherFromPb(pb.AllTopicMatcher()))

            assertTrue(
                // all four do fail - the defect is the TYPE of failure
                exactNamespace.isFailure,
                allNamespace.isFailure,
                exactTopic.isFailure,
                allTopic.isFailure,
                exactNamespace.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                allNamespace.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                exactTopic.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                allTopic.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException])
            )
        },
        test("a request whose nested matcher field is unset is rejected cleanly at the public entry point") {
            // REGRESSION (fixed 2026-07-25) - same root cause as above, reached the way a real client does:
            // ListLibraryItemsRequest.contexts -> resourceMatcherFromPb. A client that sends
            // {namespace: {exact: {namespace: "ns-a"}}} (tenant omitted) gets INTERNAL instead of
            // INVALID_ARGUMENT. Expected: IllegalArgumentException.
            val namespaceWithoutTenant = pb.ResourceMatcher(matcher =
                pb.ResourceMatcher.Matcher.Namespace(
                    pb.NamespaceMatcher(matcher = pb.NamespaceMatcher.Matcher.Exact(pb.ExactNamespaceMatcher(namespace = "ns-a")))
                )
            )
            val topicWithoutNamespace = pb.ResourceMatcher(matcher =
                pb.ResourceMatcher.Matcher.Topic(
                    pb.TopicMatcher(matcher = pb.TopicMatcher.Matcher.Exact(pb.ExactTopicMatcher(topic = "topic-a")))
                )
            )
            val namespaceResult = Try(resourceMatcherFromPb(namespaceWithoutTenant))
            val topicResult = Try(resourceMatcherFromPb(topicWithoutNamespace))

            assertTrue(
                namespaceResult.isFailure,
                topicResult.isFailure,
                namespaceResult.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                topicResult.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException])
            )
        },
        test("a set AllNamespaceMatcher.namespace_regex is rejected instead of silently widening the scope") {
            // REGRESSION (fixed 2026-07-26) - the conversion used to ACCEPT a nonempty
            // `namespace_regex`, log a server-side warning, drop it, and return a plain
            // all-namespaces matcher. A caller asking for `audit-.*` therefore got success plus a
            // strictly WIDER scope than it requested, and the only record of that was a log line it
            // cannot see. Scope widening must never be the quiet outcome of an unimplemented field.
            //
            // The field stays unimplemented on purpose - matchers are tested against other
            // MATCHERS, not against a concrete namespace, so All-vs-All would have to decide
            // whether one regex subsumes another, undecidable in general. Narrow with
            // ExactNamespaceMatcher instead. "Unimplemented" therefore has to mean rejected, not
            // ignored: IllegalArgumentException is the INVALID_ARGUMENT channel LibraryServiceImpl
            // already maps for malformed request data.
            val allWithRegex = pb.AllNamespaceMatcher(tenant = Some(tenantMatcherToPb(tenantAll)), namespaceRegex = "audit-.*")
            val withRegex = pb.NamespaceMatcher(matcher = pb.NamespaceMatcher.Matcher.All(allWithRegex))

            val direct = Try(allNamespaceMatcherFromPb(allWithRegex))
            val viaNamespace = Try(namespaceMatcherFromPb(withRegex))
            // the way a real client reaches it: ListLibraryItemsRequest.contexts -> resourceMatcherFromPb
            val viaEntryPoint = Try(resourceMatcherFromPb(pb.ResourceMatcher(matcher = pb.ResourceMatcher.Matcher.Namespace(withRegex))))

            assertTrue(
                direct.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                viaNamespace.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                viaEntryPoint.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                // the message must name the field and echo the pattern, or the caller cannot tell
                // which part of its request was refused
                viaEntryPoint.failed.toOption.exists(_.getMessage.contains("namespace_regex")),
                viaEntryPoint.failed.toOption.exists(_.getMessage.contains("audit-.*"))
            )
        },
        test("an unset namespace_regex still converts - the rejection is scoped to the field being SET") {
            // This conversion runs on every stored item (LibraryItemMetadata.fromPb), so it must be
            // inert for the default value - refusing an UNSET regex would make every library item
            // unreadable. Nothing writes the field: the UI never sets it, and decoding all 329 items
            // in the dogfooding data dir with `protoc --decode` found zero occurrences. (A SET regex
            // on the disk-read path is handled BEFORE this conversion - Library.scan strips it and
            // keeps the item; libraryScanTest pins that. The refusal above stays load-bearing for
            // request data: list/count contexts and saveLibraryItem.)
            val allNamespaces = pb.AllNamespaceMatcher(tenant = Some(tenantMatcherToPb(tenantAll)))
            val expected = AllNamespaceMatcher(tenant = tenantAll)

            val decoded = Try(allNamespaceMatcherFromPb(allNamespaces))
            // the exact shape an on-disk item arrives in: parsed back from real protobuf bytes
            val fromBytes = Try(allNamespaceMatcherFromPb(pb.AllNamespaceMatcher.parseFrom(allNamespaces.toByteArray)))

            assertTrue(
                decoded.toOption.contains(expected),
                fromBytes.toOption.contains(expected)
            )
        }
    )
}
