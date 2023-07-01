package consumer

import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.common.schema.SchemaInfo

import java.util.concurrent.TimeUnit
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.concurrent.duration.Duration
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import scala.jdk.FutureConverters.*

type TopicName = String
type SchemasByVersion = Map[Long, SchemaInfo]

object SchemasByVersion:
    def getLatest(schemas: SchemasByVersion): Option[SchemaInfo] = schemas match
        case _ if schemas.isEmpty => None
        case _ => Some(schemas.maxBy(_._1)._2)
        
type SchemasByTopic = Map[TopicName, SchemasByVersion]

def getSchemasByVersion(pulsarAdmin: PulsarAdmin, topic: TopicName): SchemasByVersion =
    val schemas = try {
        pulsarAdmin.schemas.getAllSchemas(topic).asScala.toVector
    } catch {
        case _ => return Map.empty
    }

    given ExecutionContext = ExecutionContext.global
    val versionsFutures = schemas.map(s => pulsarAdmin.schemas.getVersionBySchemaAsync(topic, s)).map(_.asScala)
    val versions = Await.result(Future.sequence(versionsFutures), Duration(1, TimeUnit.MINUTES)).map(_.toLong)

    versions.zip(schemas).toMap

def getSchemasByTopic(pulsarAdmin: PulsarAdmin, topics: Seq[TopicName]): SchemasByTopic =
    topics.map(topicName => (topicName, getSchemasByVersion(pulsarAdmin, topicName))).toMap
