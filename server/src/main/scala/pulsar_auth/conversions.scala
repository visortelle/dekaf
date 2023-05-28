package pulsar_auth

import java.net.HttpCookie
import com.tools.teal.pulsar.ui.api.v1.pulsar_auth as pb

def cookieToMaskedCredentialsPb(header: String): List[pb.MaskedCredentials] =
    val cookies = HttpCookie.parse(header)

    List.empty
