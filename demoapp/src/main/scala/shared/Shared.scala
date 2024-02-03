package shared

import org.apache.pulsar.client.api.{Consumer, Producer}

object Shared:
  var isAcceptingNewMessages = true
  var allConsumers: List[Consumer[Array[Byte]]] = List.empty
  var allProducers: List[Producer[Array[Byte]]] = List.empty
