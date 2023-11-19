package consumer.session_target.topic_selector

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

enum RegexSubscriptionMode:
    case PersistentOnly, NonPersistentOnly, All

object RegexSubscriptionMode:
    def fromPb(v: pb.RegexSubscriptionMode): RegexSubscriptionMode =
        v match
            case pb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_PERSISTENT_ONLY => RegexSubscriptionMode.PersistentOnly
            case pb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_NON_PERSISTENT_ONLY => RegexSubscriptionMode.NonPersistentOnly
            case pb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_ALL_TOPICS => RegexSubscriptionMode.All
        
    def toPb(v: RegexSubscriptionMode): pb.RegexSubscriptionMode =
        v match
            case RegexSubscriptionMode.PersistentOnly => pb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_PERSISTENT_ONLY
            case RegexSubscriptionMode.NonPersistentOnly => pb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_NON_PERSISTENT_ONLY
            case RegexSubscriptionMode.All => pb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_ALL_TOPICS