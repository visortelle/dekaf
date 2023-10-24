package producer

import zio.*

trait ProducerSessionController:
    def resume(): UIO[Unit]
    def pause(): UIO[Unit]
    def finish(): UIO[Unit]

case class ProducerSessionControllerImpl() extends ProducerSessionController:
    override def resume(): UIO[Unit] = ZIO.unit
    override def pause(): UIO[Unit] = ZIO.unit
    override def finish(): UIO[Unit] = ZIO.unit

object ProducerSessionControllerImpl:
    def make(producerSession: ProducerSession): ProducerSessionController =
        ProducerSessionController()
