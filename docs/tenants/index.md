# Tenants

## Overview

In Apache Pulsar, a tenant[^1] is a logical isolation unit within a Pulsar instance.
It provides a way to group and segregate [namespaces](/docs/namespaces) among different users or groups of users.

<img alt="apache pulsar resource hierarchy" src={require('../img/pulsar-resource-hierarchy.png').default} width="480px" />

Tenants allow for multi-tenancy[^2], where multiple teams or organizations can share a single Pulsar instance while being isolated from each other.

This isolation ensures that resources are allocated and managed independently, providing security, resource management, and administrative control within the Pulsar system.
Each tenant can have its own set of namespaces, topics, and configurations, providing flexibility and customization to suit the needs of different users or applications.

[^1]: [Multitenancy](https://en.wikipedia.org/wiki/Multitenancy) article in Wikipedia
[^2]: [Multi Tenancy](https://pulsar.apache.org/docs/next/concepts-multi-tenancy/) in the official Pulsar documentation
