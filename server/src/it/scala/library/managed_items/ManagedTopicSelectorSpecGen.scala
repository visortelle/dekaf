package library.managed_items

object ManagedTopicSelectorSpecGen:
    def currentTopic: ManagedTopicSelectorSpec =
        ManagedTopicSelectorSpec(
            topicSelector = CurrentTopicSelector()
        )
