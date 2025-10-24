# Namespaces

## Overview

In Apache Pulsar, namespace is a logical group of topics.

<img alt="apache pulsar resource hierarchy" src={require('../img/pulsar-resource-hierarchy.png').default} width="480px" />

The key features of namespaces are:

- **Grouping**: Namespaces allow users to create distinct sets of topics within a single [tenant](/docs/tenants).
- **Configuration**: Namespaces can have their own configurations, such as retention policies, message TTL (Time-to-Live), and replication settings. This allows users to customize the behavior of topics within each namespace according to their requirements.
- **Isolation**: Namespaces provide isolation on the broker or bookie level. This isolation ensures that topics within one namespace do not interfere with topics in another namespace.
- **Authorization and Access Control**: Namespaces provide a boundary for authorization and access control policies. Users can define access control policies at the namespace level to control who can publish or subscribe to topics within that namespace.

## Organizing topics into namespaces

The strategy for organizing topics within namespaces in Apache Pulsar depends on various factors, including the specific requirements and architecture of your system. Here are some common approaches to organizing topics within namespaces:

- **By Service**: You can organize topics based on the services or components of your application. Each service may have its own namespace containing topics related to that service. This approach helps maintain a clear separation between different parts of your application and can simplify management and monitoring.
- **By Team**: If there are multiple teams in your organization use Pulsar, you can organize topics based on the teams responsible for different parts of the system. Each team may have its own namespace containing topics related to their specific responsibilities. This approach facilitates collaboration and allows teams to manage their topics independently.
- **By Functionality**: Topics can be organized based on the functionality they serve within your application. For example, you may have namespaces for topics related to user authentication, data processing, notifications, etc. This approach helps group topics based on their purpose and can make it easier to locate and manage related topics.
- **By Branch or Environment**: It's common to have a live environment for each branch in the version control system (e.g., `development`, `staging`, `production`, `feature-a`, `feature-b`). Each environment may have its own namespace. This approach helps maintain isolation between different environments and can prevent accidental interference between topics in different stages of development.
