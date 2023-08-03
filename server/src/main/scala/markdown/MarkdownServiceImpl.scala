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
        try {
            val instanceSourceStream = getClass.getResourceAsStream(appConfig.resourcesInfoMarkdowns.instance)
            val instanceSource = Source.fromInputStream(instanceSourceStream)

            val instanceMarkdown = instanceSource
                .mkString
                .replace("{{publicUrl}}", appConfig.publicUrl)
                .replace("{{clusterName}}", request.clusterName)
                .replace("{{instanceUrl}}", appConfig.resourcesInfoMarkdowns.vars("instanceUrl"))
                .replace("{{proxyResourceName}}",
                    appConfig.proxies
                        .find(_.to == appConfig.resourcesInfoMarkdowns.vars("toolUrl"))
                        .get
                        .name
                )

            instanceSource.close()

            val status: Status = Status(code = Code.OK.index)
            Future.successful(
                GetInstanceMarkdownResponse(
                    status = Some(status),
                    markdown = instanceMarkdown
                )
            )
        } catch {
            case e: Exception =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index)
                Future.successful(
                    GetInstanceMarkdownResponse(status = Some(status))
                )
        }

    override def getTenantMarkdown(request: GetTenantMarkdownRequest): Future[GetTenantMarkdownResponse] =
        try {
            val tenantSourceStream = getClass.getResourceAsStream(appConfig.resourcesInfoMarkdowns.tenant)
            val tenantSource = Source.fromInputStream(tenantSourceStream)

            val tenantMarkdown = tenantSource
                .mkString
                .replace("{{publicUrl}}", appConfig.publicUrl)
                .replace("{{clusterName}}", request.clusterName)
                .replace("{{tenant}}", URLEncoder.encode(request.tenant, "UTF-8"))
                .replace("{{proxyResourceName}}",
                    appConfig.proxies
                        .find(_.to == appConfig.resourcesInfoMarkdowns.vars("toolUrl"))
                        .get
                        .name
                )

            tenantSource.close()

            val status: Status = Status(code = Code.OK.index)
            Future.successful(
                GetTenantMarkdownResponse(
                    status = Some(status),
                    markdown = tenantMarkdown
                )
            )
        } catch {
            case e: Exception =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index)
                Future.successful(
                    GetTenantMarkdownResponse(status = Some(status))
                )
        }

    override def getNamespaceMarkdown(request: GetNamespaceMarkdownRequest): Future[GetNamespaceMarkdownResponse] =
        try {
            val namespaceSourceStream = getClass.getResourceAsStream(appConfig.resourcesInfoMarkdowns.namespace)
            val namespaceSource = Source.fromInputStream(namespaceSourceStream)

            val namespaceMarkdown = namespaceSource
                .mkString
                .replace("{{publicUrl}}", appConfig.publicUrl)
                .replace("{{clusterName}}", request.clusterName)
                .replace("{{namespaceFqnEncoded}}", URLEncoder.encode(request.namespaceFqn, "UTF-8"))
                .replace("{{proxyResourceName}}",
                    appConfig.proxies
                        .find(_.to == appConfig.resourcesInfoMarkdowns.vars("toolUrl"))
                        .get
                        .name
                )

            namespaceSource.close()

            val status: Status = Status(code = Code.OK.index)
            Future.successful(
                GetNamespaceMarkdownResponse(
                    status = Some(status),
                    markdown = namespaceMarkdown
                )
            )
        } catch {
            case e: Exception =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index)
                Future.successful(
                    GetNamespaceMarkdownResponse(status = Some(status))
                )
        }

    override def getTopicMarkdown(request: GetTopicMarkdownRequest): Future[GetTopicMarkdownResponse] =
        try {
            val topicSourceStream = getClass.getResourceAsStream(appConfig.resourcesInfoMarkdowns.topic)
            val topicSource = Source.fromInputStream(topicSourceStream)

            val topicMarkdown = topicSource
                .mkString
                .replace("{{publicUrl}}", appConfig.publicUrl)
                .replace("{{clusterName}}", request.clusterName)
                .replace("{{namespaceFqnEncoded}}", URLEncoder.encode(request.namespaceFqn, "UTF-8"))
                .replace("{{topicFqnEncoded}}", URLEncoder.encode(request.topicFqn, "UTF-8"))
                .replace("{{proxyResourceName}}",
                    appConfig.proxies
                        .find(_.to == appConfig.resourcesInfoMarkdowns.vars("toolUrl"))
                        .get
                        .name
                )

            topicSource.close()

            val status: Status = Status(code = Code.OK.index)
            Future.successful(
                GetTopicMarkdownResponse(
                    status = Some(status),
                    markdown = topicMarkdown
                )
            )
        } catch {
            case e: Exception =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index)
                Future.successful(
                    GetTopicMarkdownResponse(status = Some(status))
                )
        }

}
