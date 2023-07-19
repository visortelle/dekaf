package licensing

import zio.*
import zio.http.Client
import keygen.KeygenMachine

class KeygenClient(val activationToken: String):
    def activateMachine(machine: KeygenMachine): Task[Unit] = ???
