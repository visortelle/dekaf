package pulsar_auth

import java.net.HttpCookie
import com.tools.teal.pulsar.ui.api.v1.pulsar_auth as pb

def credentialsTypePbFromCredentials(credentials: Credentials): pb.CredentialsType =
    credentials match
        case EmptyCredentials(_) => pb.CredentialsType.CREDENTIALS_TYPE_EMPTY
        case OAuth2Credentials(_, _, _, _, _) => pb.CredentialsType.CREDENTIALS_TYPE_OAUTH2
        case JwtCredentials(_, _) => pb.CredentialsType.CREDENTIALS_TYPE_JWT
        case AuthParamsStringCredentials(_, _, _) => pb.CredentialsType.CREDENTIALS_TYPE_AUTH_PARAMS_STRING
