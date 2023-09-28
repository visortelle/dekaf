package library

def getUserManagedItemMetadata(item: UserManagedItem): UserManagedItemMetadata =
    item.consumerSessionConfig
        .map(_.metadata)
        .getOrElse(
            item.consumerSessionConfigStartFrom
                .map(_.metadata)
                .getOrElse(
                    item.consumerSessionConfigPauseTrigger
                        .map(_.metadata)
                        .getOrElse(
                            item.messageId
                                .map(_.metadata)
                                .getOrElse(
                                    item.dateTime
                                        .map(_.metadata)
                                        .getOrElse(
                                            item.relativeDateTime
                                                .map(_.metadata)
                                                .getOrElse(
                                                    item.messageFilter
                                                        .map(_.metadata)
                                                        .getOrElse(
                                                            item.messageFilterChain
                                                                .map(_.metadata)
                                                                .getOrElse(
                                                                    throw new Exception("No metadata found in UserManagedItem")
                                                                )
                                                        )
                                                )
                                        )
                                )
                        )
                )
        )

type UserManagedItemSpec =
    UserManagedConsumerSessionConfigSpec | UserManagedConsumerSessionConfigStartFromSpec | UserManagedConsumerSessionConfigPauseTriggerSpec |
        UserManagedMessageIdSpec | UserManagedDateTimeSpec | UserManagedRelativeDateTimeSpec | UserManagedMessageFilterSpec | UserManagedMessageFilterChainSpec

def getUserManagedItemSpec(item: UserManagedItem): UserManagedItemSpec =
    item.consumerSessionConfig
        .map(_.spec)
        .getOrElse(
            item.consumerSessionConfigStartFrom
                .map(_.spec)
                .getOrElse(
                    item.consumerSessionConfigPauseTrigger
                        .map(_.spec)
                        .getOrElse(
                            item.messageId
                                .map(_.spec)
                                .getOrElse(
                                    item.dateTime
                                        .map(_.spec)
                                        .getOrElse(
                                            item.relativeDateTime
                                                .map(_.spec)
                                                .getOrElse(
                                                    item.messageFilter
                                                        .map(_.spec)
                                                        .getOrElse(
                                                            item.messageFilterChain
                                                                .map(_.spec)
                                                                .getOrElse(
                                                                    throw new Exception("No spec found in UserManagedItem")
                                                                )
                                                        )
                                                )
                                        )
                                )
                        )
                )
        )
