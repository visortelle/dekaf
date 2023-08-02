package markdown

import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.markdown.v1.markdown.MarkdownServiceGrpc
import com.tools.teal.pulsar.ui.markdown.v1.markdown.{GetInstanceMarkdownRequest, GetInstanceMarkdownResponse}
import config.Config

import java.io.File
import scala.concurrent.Future
import scala.io.Source

class MarkdownServiceImpl(appConfig: Config) extends MarkdownServiceGrpc.MarkdownService {
    override def getInstanceMarkdown(request: GetInstanceMarkdownRequest): Future[GetInstanceMarkdownResponse] = {

        try {
            val instanceSourceStream = getClass.getResourceAsStream(appConfig.resourcesInfoMarkdowns.instance)
            val instanceSource = Source.fromInputStream(instanceSourceStream)

            val instanceMarkdown = instanceSource
                .mkString
                .replace("{{publicUrl}}", appConfig.publicUrl)
                .replace("{{clusterName}}", request.clusterName)
                .replace("{{instanceUrl}}", appConfig.resourcesInfoMarkdowns.vars("instanceUrl"))
                .replace("{{proxyServiceName}}", 
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
            case e: Exception => {
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index)
                return Future.successful(
                    GetInstanceMarkdownResponse(status = Some(status))
                )
            }
        }
    }
}
