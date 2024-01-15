package library

import conversions.primitiveConvTest.suite
import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

object resourceMatchersTest extends ZIOSpecDefault {
    def spec = suite(this.getClass.toString)(
        /*
        =================
         * TenantMatcher *
        =================
         */
        test(TenantMatcher.getClass.toString) {
            assertTrue {
                !ResourceMatcher(
                    matcher = TenantMatcher(
                        matcher = ExactTenantMatcher(tenant = "tenant-a")
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TenantMatcher(
                            matcher = ExactTenantMatcher(tenant = "tenant-b")
                        )
                    )
                )
            }
        },
        test(TenantMatcher.getClass.toString) {
            assertTrue {
                ResourceMatcher(
                    matcher = TenantMatcher(
                        matcher = ExactTenantMatcher(tenant = "tenant-a")
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TenantMatcher(
                            matcher = ExactTenantMatcher(tenant = "tenant-a")
                        )
                    )
                )
            }
        },
        test(TenantMatcher.getClass.toString) {
            assertTrue {
                ResourceMatcher(
                    matcher = TenantMatcher(
                        matcher = ExactTenantMatcher(tenant = "tenant-a")
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TenantMatcher(
                            matcher = AllTenantMatcher()
                        )
                    )
                )
            }
        },
        test(TenantMatcher.getClass.toString) {
            assertTrue {
                ResourceMatcher(
                    matcher = TenantMatcher(
                        matcher = AllTenantMatcher()
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TenantMatcher(
                            matcher = AllTenantMatcher()
                        )
                    )
                )
            }
        },
        test(TenantMatcher.getClass.toString) {
            assertTrue {
                ResourceMatcher(
                    matcher = TenantMatcher(
                        matcher = AllTenantMatcher()
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TenantMatcher(
                            matcher = ExactTenantMatcher(tenant = "tenant-a")
                        )
                    )
                )
            }
        },
        /*
        =====================
         * NamespaceMatcher *
        =====================
         */
        test(NamespaceMatcher.getClass.toString) {
            assertTrue {
                !ResourceMatcher(
                    matcher = NamespaceMatcher(
                        matcher = AllNamespaceMatcher(
                            tenant = TenantMatcher(
                                matcher = ExactTenantMatcher("tenant-a")
                            )
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = NamespaceMatcher(
                            matcher = AllNamespaceMatcher(
                                tenant = TenantMatcher(
                                    matcher = ExactTenantMatcher("tenant-b")
                                )
                            )
                        )
                    )
                )
            }
        },
        test(NamespaceMatcher.getClass.toString) {
            assertTrue {
                ResourceMatcher(
                    matcher = NamespaceMatcher(
                        matcher = AllNamespaceMatcher(
                            tenant = TenantMatcher(
                                matcher = ExactTenantMatcher("tenant-a")
                            )
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = NamespaceMatcher(
                            matcher = AllNamespaceMatcher(
                                tenant = TenantMatcher(
                                    matcher = ExactTenantMatcher("tenant-a")
                                )
                            )
                        )
                    )
                )
            }
        },
        test(NamespaceMatcher.getClass.toString) {
            assertTrue {
                ResourceMatcher(
                    matcher = NamespaceMatcher(
                        matcher = ExactNamespaceMatcher(
                            tenant = TenantMatcher(
                                matcher = ExactTenantMatcher("tenant-a")
                            ),
                            namespace = "namespace-a"
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = NamespaceMatcher(
                            matcher = AllNamespaceMatcher(
                                tenant = TenantMatcher(
                                    matcher = ExactTenantMatcher("tenant-a")
                                )
                            )
                        )
                    )
                )
            }
        },
        test(NamespaceMatcher.getClass.toString) {
            assertTrue {
                ResourceMatcher(
                    matcher = NamespaceMatcher(
                        matcher = AllNamespaceMatcher(
                            tenant = TenantMatcher(
                                matcher = ExactTenantMatcher("tenant-a")
                            )
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = NamespaceMatcher(
                            matcher = ExactNamespaceMatcher(
                                tenant = TenantMatcher(
                                    matcher = ExactTenantMatcher("tenant-a")
                                ),
                                namespace = "namespace-a"
                            )
                        )
                    )
                )
            }
        },
        test(NamespaceMatcher.getClass.toString) {
            assertTrue {
                ResourceMatcher(
                    matcher = NamespaceMatcher(
                        matcher = ExactNamespaceMatcher(
                            tenant = TenantMatcher(
                                matcher = ExactTenantMatcher("tenant-a")
                            ),
                            namespace = "namespace-a"
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = NamespaceMatcher(
                            matcher = ExactNamespaceMatcher(
                                tenant = TenantMatcher(
                                    matcher = ExactTenantMatcher("tenant-a")
                                ),
                                namespace = "namespace-a"
                            )
                        )
                    )
                )
            }
        },
        test(NamespaceMatcher.getClass.toString) {
            assertTrue {
                !ResourceMatcher(
                    matcher = NamespaceMatcher(
                        matcher = ExactNamespaceMatcher(
                            tenant = TenantMatcher(
                                matcher = ExactTenantMatcher("tenant-a")
                            ),
                            namespace = "namespace-a"
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = NamespaceMatcher(
                            matcher = ExactNamespaceMatcher(
                                tenant = TenantMatcher(
                                    matcher = ExactTenantMatcher("tenant-a")
                                ),
                                namespace = "namespace-b"
                            )
                        )
                    )
                )
            }
        },
        test(NamespaceMatcher.getClass.toString) {
            assertTrue {
                !ResourceMatcher(
                    matcher = NamespaceMatcher(
                        matcher = ExactNamespaceMatcher(
                            tenant = TenantMatcher(
                                matcher = ExactTenantMatcher("tenant-a")
                            ),
                            namespace = "namespace-a"
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = NamespaceMatcher(
                            matcher = ExactNamespaceMatcher(
                                tenant = TenantMatcher(
                                    matcher = ExactTenantMatcher("tenant-b")
                                ),
                                namespace = "namespace-a"
                            )
                        )
                    )
                )
            }
        },
        /*
        =====================
         * TopicMatcher *
        =====================
         */
        test(TopicMatcher.getClass.toString) {
            assertTrue {
                ResourceMatcher(
                    matcher = TopicMatcher(
                        matcher = AllTopicMatcher(
                            namespace = NamespaceMatcher(
                                matcher = ExactNamespaceMatcher(
                                    tenant = TenantMatcher(
                                        matcher = ExactTenantMatcher(
                                            tenant = "tenant-a"
                                        )
                                    ),
                                    namespace = "namespace-a"
                                )
                            )
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TopicMatcher(
                            matcher = AllTopicMatcher(
                                namespace = NamespaceMatcher(
                                    matcher = ExactNamespaceMatcher(
                                        tenant = TenantMatcher(
                                            matcher = ExactTenantMatcher(
                                                tenant = "tenant-a"
                                            )
                                        ),
                                        namespace = "namespace-a"
                                    )
                                )
                            )
                        )
                    )
                )
            }
        },
        test(TopicMatcher.getClass.toString) {
            assertTrue {
                !ResourceMatcher(
                    matcher = TopicMatcher(
                        matcher = AllTopicMatcher(
                            namespace = NamespaceMatcher(
                                matcher = ExactNamespaceMatcher(
                                    tenant = TenantMatcher(
                                        matcher = ExactTenantMatcher(
                                            tenant = "tenant-a"
                                        )
                                    ),
                                    namespace = "namespace-a"
                                )
                            )
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TopicMatcher(
                            matcher = AllTopicMatcher(
                                namespace = NamespaceMatcher(
                                    matcher = ExactNamespaceMatcher(
                                        tenant = TenantMatcher(
                                            matcher = ExactTenantMatcher(
                                                tenant = "tenant-a"
                                            )
                                        ),
                                        namespace = "namespace-b"
                                    )
                                )
                            )
                        )
                    )
                )
            }
        },
        test(TopicMatcher.getClass.toString) {
            assertTrue {
                ResourceMatcher(
                    matcher = TopicMatcher(
                        matcher = ExactTopicMatcher(
                            namespace = NamespaceMatcher(
                                matcher = ExactNamespaceMatcher(
                                    tenant = TenantMatcher(
                                        matcher = ExactTenantMatcher(
                                            tenant = "tenant-a"
                                        )
                                    ),
                                    namespace = "namespace-a"
                                )
                            ),
                            topic = "topic-a"
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TopicMatcher(
                            matcher = AllTopicMatcher(
                                namespace = NamespaceMatcher(
                                    matcher = ExactNamespaceMatcher(
                                        tenant = TenantMatcher(
                                            matcher = ExactTenantMatcher(
                                                tenant = "tenant-a"
                                            )
                                        ),
                                        namespace = "namespace-a"
                                    )
                                )
                            )
                        )
                    )
                )
            }
        },
        test(TopicMatcher.getClass.toString) {
            assertTrue {
                !ResourceMatcher(
                    matcher = TopicMatcher(
                        matcher = ExactTopicMatcher(
                            namespace = NamespaceMatcher(
                                matcher = ExactNamespaceMatcher(
                                    tenant = TenantMatcher(
                                        matcher = ExactTenantMatcher(
                                            tenant = "tenant-a"
                                        )
                                    ),
                                    namespace = "namespace-a"
                                )
                            ),
                            topic = "topic-a"
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TopicMatcher(
                            matcher = AllTopicMatcher(
                                namespace = NamespaceMatcher(
                                    matcher = ExactNamespaceMatcher(
                                        tenant = TenantMatcher(
                                            matcher = ExactTenantMatcher(
                                                tenant = "tenant-a"
                                            )
                                        ),
                                        namespace = "namespace-b"
                                    )
                                )
                            )
                        )
                    )
                )
            }
        },
        test(TopicMatcher.getClass.toString) {
            assertTrue {
                ResourceMatcher(
                    matcher = TopicMatcher(
                        matcher = AllTopicMatcher(
                            namespace = NamespaceMatcher(
                                matcher = ExactNamespaceMatcher(
                                    tenant = TenantMatcher(
                                        matcher = ExactTenantMatcher(
                                            tenant = "tenant-a"
                                        )
                                    ),
                                    namespace = "namespace-a"
                                )
                            )
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TopicMatcher(
                            matcher = ExactTopicMatcher(
                                namespace = NamespaceMatcher(
                                    matcher = ExactNamespaceMatcher(
                                        tenant = TenantMatcher(
                                            matcher = ExactTenantMatcher(
                                                tenant = "tenant-a"
                                            )
                                        ),
                                        namespace = "namespace-a"
                                    )
                                ),
                                topic = "topic-a"
                            )
                        )
                    )
                )
            }
        },
        test(TopicMatcher.getClass.toString) {
            assertTrue {
                !ResourceMatcher(
                    matcher = TopicMatcher(
                        matcher = AllTopicMatcher(
                            namespace = NamespaceMatcher(
                                matcher = ExactNamespaceMatcher(
                                    tenant = TenantMatcher(
                                        matcher = ExactTenantMatcher(
                                            tenant = "tenant-a"
                                        )
                                    ),
                                    namespace = "namespace-b"
                                )
                            )
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TopicMatcher(
                            matcher = ExactTopicMatcher(
                                namespace = NamespaceMatcher(
                                    matcher = ExactNamespaceMatcher(
                                        tenant = TenantMatcher(
                                            matcher = ExactTenantMatcher(
                                                tenant = "tenant-a"
                                            )
                                        ),
                                        namespace = "namespace-a"
                                    )
                                ),
                                topic = "topic-a"
                            )
                        )
                    )
                )
            }
        },
        test(TopicMatcher.getClass.toString) {
            assertTrue {
                ResourceMatcher(
                    matcher = TopicMatcher(
                        matcher = ExactTopicMatcher(
                            namespace = NamespaceMatcher(
                                matcher = ExactNamespaceMatcher(
                                    tenant = TenantMatcher(
                                        matcher = ExactTenantMatcher(
                                            tenant = "tenant-a"
                                        )
                                    ),
                                    namespace = "namespace-a"
                                )
                            ),
                            topic = "topic-a"
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TopicMatcher(
                            matcher = ExactTopicMatcher(
                                namespace = NamespaceMatcher(
                                    matcher = ExactNamespaceMatcher(
                                        tenant = TenantMatcher(
                                            matcher = ExactTenantMatcher(
                                                tenant = "tenant-a"
                                            )
                                        ),
                                        namespace = "namespace-a"
                                    )
                                ),
                                topic = "topic-a"
                            )
                        )
                    )
                )
            }
        },
        test(TopicMatcher.getClass.toString) {
            assertTrue {
                !ResourceMatcher(
                    matcher = TopicMatcher(
                        matcher = ExactTopicMatcher(
                            namespace = NamespaceMatcher(
                                matcher = ExactNamespaceMatcher(
                                    tenant = TenantMatcher(
                                        matcher = ExactTenantMatcher(
                                            tenant = "tenant-a"
                                        )
                                    ),
                                    namespace = "namespace-a"
                                )
                            ),
                            topic = "topic-a"
                        )
                    )
                ).test(
                    ResourceMatcher(
                        matcher = TopicMatcher(
                            matcher = ExactTopicMatcher(
                                namespace = NamespaceMatcher(
                                    matcher = ExactNamespaceMatcher(
                                        tenant = TenantMatcher(
                                            matcher = ExactTenantMatcher(
                                                tenant = "tenant-a"
                                            )
                                        ),
                                        namespace = "namespace-a"
                                    )
                                ),
                                topic = "topic-b"
                            )
                        )
                    )
                )
            }
        }
    )
}
