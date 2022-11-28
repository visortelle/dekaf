package config

import java.net.ServerSocket

def getFreePort =
    var freePort = 0
    val s = new ServerSocket(0)
    
    try freePort = s.getLocalPort
    catch {
        case e: Exception => e.printStackTrace()
    } finally if (s != null) s.close()
    
    freePort
