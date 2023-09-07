package routes.tenants._tenant_id.namespaces._namespace_id.create_topic

import com.microsoft.playwright.Locator
import routes.tenants._tenant_id.namespaces._namespace_id.policies.Properties

case class CreateTopicPage(root: Locator):
  val topicNameInput: Locator = root.getByTestId("topic-name-input")
  val topicPersistencySelect: Locator = root.getByTestId("topic-persistency-select")
  val topicPartitioningSelect: Locator = root.getByTestId("topic-partitioning-select")
  val topicPartitionsCountInput: Locator = root.getByTestId("topic-partitions-count-input")
  val topicProperties: Properties = Properties(root.getByTestId("properties"))
  val topicCreateButton: Locator = root.getByTestId("topic-create-button")
