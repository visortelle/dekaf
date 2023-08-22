package markdown

import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.markdown.v1.markdown.{GetInstanceMarkdownRequest, GetInstanceMarkdownResponse, GetNamespaceMarkdownRequest, GetNamespaceMarkdownResponse, GetTenantMarkdownRequest, GetTenantMarkdownResponse, GetTopicMarkdownRequest, GetTopicMarkdownResponse, MarkdownServiceGrpc}
import config.Config

import java.io.File
import java.net.URLEncoder
import scala.concurrent.Future
import scala.io.Source

class MarkdownServiceImpl(appConfig: Config) extends MarkdownServiceGrpc.MarkdownService {
    override def getInstanceMarkdown(request: GetInstanceMarkdownRequest): Future[GetInstanceMarkdownResponse] =
        appConfig.instanceMarkdownPath match
            case Some(instanceMarkdownPath) =>
                try
                    val instanceSourceStream = getClass.getResourceAsStream(instanceMarkdownPath)
                    val instanceSource = Source.fromInputStream(instanceSourceStream)
                    val instanceRawMarkdown = instanceSource.mkString
                    instanceSource.close()

                    val instanceMarkdown = replaceVariablesWithConfigValues(instanceRawMarkdown, appConfig.markdownsVariables)
                        .replace("{{clusterName}}", request.clusterName)

                    val status: Status = Status(code = Code.OK.index)
                    Future.successful(
                        GetInstanceMarkdownResponse(
                            status = Some(status),
                            markdown = instanceMarkdown
                        )
                    )
                catch
                    case e: Exception =>
                        val status: Status = Status(
                            code = Code.INTERNAL.index,
                            message = "Unable to read the instance markdown."
                        )
                        Future.successful(
                            GetInstanceMarkdownResponse(status = Some(status))
                        )
            case None =>
                val status: Status = Status(
                    code = Code.FAILED_PRECONDITION.index,
                    message = "No instance markdown provided in the config."
                )
                Future.successful(
                    GetInstanceMarkdownResponse(status = Some(status))
                )


    override def getTenantMarkdown(request: GetTenantMarkdownRequest): Future[GetTenantMarkdownResponse] =
        appConfig.tenantMarkdownPath match
            case Some(tenantMarkdownPath) =>
                try
                    val tenantSourceStream = getClass.getResourceAsStream(tenantMarkdownPath)
                    val tenantSource = Source.fromInputStream(tenantSourceStream)
        
                    val tenantMarkdown = replaceVariablesWithConfigValues(tenantSource.mkString, appConfig.markdownsVariables)
                        .replace("{{clusterName}}", request.clusterName)
                        .replace("{{tenant}}", URLEncoder.encode(request.tenant, "UTF-8"))
                    
                    tenantSource.close()
        
                    val status: Status = Status(code = Code.OK.index)
                    Future.successful(
                        GetTenantMarkdownResponse(
                            status = Some(status),
                            markdown = tenantMarkdown
                        )
                    )
                catch
                    case e: Exception =>
                        val status: Status = Status(
                            code = Code.INTERNAL.index,
                            message = "Unable to read the tenant markdown."
                        )
                        Future.successful(
                            GetTenantMarkdownResponse(status = Some(status))
                        )
            case None =>
                val status: Status = Status(
                    code = Code.FAILED_PRECONDITION.index,
                    message = "No tenant markdown provided in the config."
                )
                Future.successful(
                    GetTenantMarkdownResponse(status = Some(status))
                )

    override def getNamespaceMarkdown(request: GetNamespaceMarkdownRequest): Future[GetNamespaceMarkdownResponse] =
        appConfig.namespaceMarkdownPath match
            case Some(namespaceMarkdownPath) =>
                try
                    val namespaceSourceStream = getClass.getResourceAsStream(namespaceMarkdownPath)
                    val namespaceSource = Source.fromInputStream(namespaceSourceStream)
        
                    val namespaceMarkdown = replaceVariablesWithConfigValues(namespaceSource.mkString, appConfig.markdownsVariables)
                        .replace("{{clusterName}}", request.clusterName)
                        .replace("{{namespaceFqnEncoded}}", URLEncoder.encode(request.namespaceFqn, "UTF-8"))
        
                    namespaceSource.close()
        
                    val status: Status = Status(code = Code.OK.index)
                    Future.successful(
                        GetNamespaceMarkdownResponse(
                            status = Some(status),
                            markdown = namespaceMarkdown
                        )
                    )
                catch
                    case e: Exception =>
                        val status: Status = Status(
                            code = Code.INTERNAL.index,
                            message = "Unable to read the namespace markdown."
                        )
                        Future.successful(
                            GetNamespaceMarkdownResponse(status = Some(status))
                        )
            case None =>
                val status: Status = Status(
                    code = Code.FAILED_PRECONDITION.index,
                    message = "No namespace markdown provided in the config."
                )
                Future.successful(
                    GetNamespaceMarkdownResponse(status = Some(status))
                )

    override def getTopicMarkdown(request: GetTopicMarkdownRequest): Future[GetTopicMarkdownResponse] =
        appConfig.topicMarkdownPath match
            case Some(topicMarkdownPath) =>
                try
                    val topicSourceStream = getClass.getResourceAsStream(topicMarkdownPath)
                    val topicSource = Source.fromInputStream(topicSourceStream)
        
                    val topicMarkdown = replaceVariablesWithConfigValues(topicSource.mkString, appConfig.markdownsVariables)
                        .replace("{{clusterName}}", request.clusterName)
                        .replace("{{namespaceFqnEncoded}}", URLEncoder.encode(request.namespaceFqn, "UTF-8"))
                        .replace("{{topicFqnEncoded}}", URLEncoder.encode(request.topicFqn, "UTF-8"))
        
                    topicSource.close()
        
                    val status: Status = Status(code = Code.OK.index)
                    Future.successful(
                        GetTopicMarkdownResponse(
                            status = Some(status),
                            markdown = topicMarkdown
                        )
                    )
                catch
                    case e: Exception =>
                        val status: Status = Status(
                            code = Code.INTERNAL.index,
                            message = "Unable to read the topic markdown."
                        )
                        Future.successful(
                            GetTopicMarkdownResponse(status = Some(status))
                        ) 
            case None =>
                val status: Status = Status(
                    code = Code.FAILED_PRECONDITION.index,
                    message = "No topic markdown provided in the config."
                )
                Future.successful(
                    GetTopicMarkdownResponse(status = Some(status))
                )
    
    private def replaceVariablesWithConfigValues(text: String, variablesMapOption: Option[Map[String, String]]): String =
        variablesMapOption match
            case Some(map) => map.foldLeft(text) { (currentText, keyValue) =>
                val (key, value) = keyValue
                currentText.replace(s"{{$key}}", value)
            }
            case None => text
}
