package library.managed_items

object ManagedValueProjectionListSpecGen:
    def empty: ManagedValueProjectionListSpec = ManagedValueProjectionListSpec(
        isEnabled = true,
        projections = Vector.empty
    )
