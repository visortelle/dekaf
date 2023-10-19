package producer

import zio.*

trait ProduceMessagesTaskController:
    def init(): Task[Unit]
    def resume(): Task[Unit]
    def pause(): Task[Unit]
    def stop(): Task[Unit]
