package namespace_policies

import com.tools.teal.pulsar.ui.namespace_policies.v1.namespace_policies.SchemaCompatibilityStrategy as SchemaCompatibilityStrategyPb
import org.apache.pulsar.common.policies.data.SchemaCompatibilityStrategy

def schemaCompatibilityStrategyToPb(strategy: SchemaCompatibilityStrategy): SchemaCompatibilityStrategyPb =
    strategy match
        case SchemaCompatibilityStrategy.ALWAYS_COMPATIBLE =>
            SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_ALWAYS_COMPATIBLE
        case SchemaCompatibilityStrategy.ALWAYS_INCOMPATIBLE =>
            SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_ALWAYS_INCOMPATIBLE
        case SchemaCompatibilityStrategy.BACKWARD =>
            SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_BACKWARD
        case SchemaCompatibilityStrategy.BACKWARD_TRANSITIVE =>
            SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_BACKWARD_TRANSITIVE
        case SchemaCompatibilityStrategy.FORWARD =>
            SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_FORWARD
        case SchemaCompatibilityStrategy.FORWARD_TRANSITIVE =>
            SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_FORWARD_TRANSITIVE
        case SchemaCompatibilityStrategy.FULL =>
            SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_FULL
        case SchemaCompatibilityStrategy.FULL_TRANSITIVE =>
            SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_FULL_TRANSITIVE
        case SchemaCompatibilityStrategy.UNDEFINED =>
            SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_UNDEFINED

def schemaCompatibilityStrategyFromPb(strategy: SchemaCompatibilityStrategyPb): SchemaCompatibilityStrategy =
    strategy match
        case SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_ALWAYS_COMPATIBLE =>
            SchemaCompatibilityStrategy.ALWAYS_COMPATIBLE
        case SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_ALWAYS_INCOMPATIBLE =>
            SchemaCompatibilityStrategy.ALWAYS_INCOMPATIBLE
        case SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_BACKWARD =>
            SchemaCompatibilityStrategy.BACKWARD
        case SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_BACKWARD_TRANSITIVE =>
            SchemaCompatibilityStrategy.BACKWARD_TRANSITIVE
        case SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_FORWARD =>
            SchemaCompatibilityStrategy.FORWARD
        case SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_FORWARD_TRANSITIVE =>
            SchemaCompatibilityStrategy.FORWARD_TRANSITIVE
        case SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_FULL =>
            SchemaCompatibilityStrategy.FULL
        case SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_FULL_TRANSITIVE =>
            SchemaCompatibilityStrategy.FULL_TRANSITIVE
        case SchemaCompatibilityStrategyPb.SCHEMA_COMPATIBILITY_STRATEGY_UNDEFINED =>
            SchemaCompatibilityStrategy.UNDEFINED
        case _ =>
            SchemaCompatibilityStrategy.UNDEFINED
