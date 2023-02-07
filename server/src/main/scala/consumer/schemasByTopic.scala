package consumer

import _root_.client.adminClient
import org.apache.pulsar.common.schema.SchemaInfo

import java.util.concurrent.TimeUnit
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.concurrent.duration.Duration
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import scala.jdk.FutureConverters.*

type TopicName = String
type SchemasByVersion = Map[Long, SchemaInfo]
type SchemasByTopic = Map[TopicName, SchemasByVersion]

def getSchemasByVersion(topic: TopicName): SchemasByVersion =
    val schemas = try {
        adminClient.schemas.getAllSchemas(topic).asScala.toVector
    } catch {
        case _ => return Map.empty
    }

    given ExecutionContext = ExecutionContext.global
    val versionsFutures = schemas.map(s => adminClient.schemas.getVersionBySchemaAsync(topic, s)).map(_.asScala)
    val versions = Await.result(Future.sequence(versionsFutures), Duration(1, TimeUnit.MINUTES)).map(_.toLong)

    versions.zip(schemas).toMap

def getSchemasByTopic(topics: Seq[TopicName]): SchemasByTopic =
    topics.map(topicName => (topicName, getSchemasByVersion(topicName))).toMap
