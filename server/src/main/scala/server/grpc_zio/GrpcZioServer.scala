package server.grpc_zio

import zio.*
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb

//object GrpcZioServer extends ServerMain {
//    override def port: Int = 8980
//
//    val createRouteGuide = for {
//        routeNotes <- Ref.make(Map.empty[Point, List[RouteNote]])
//    } yield new RouteGuideService(featuresDatabase.feature, routeNotes)
//
//    def services: ServiceList[Any] =
//        ServiceList.addZIO(createRouteGuide)
//}
