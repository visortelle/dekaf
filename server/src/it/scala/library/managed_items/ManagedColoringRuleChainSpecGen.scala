package library.managed_items

object ManagedColoringRuleChainSpecGen:
    def empty: ManagedColoringRuleChainSpec = ManagedColoringRuleChainSpec(
        isEnabled = true,
        coloringRules = Vector.empty
    )
