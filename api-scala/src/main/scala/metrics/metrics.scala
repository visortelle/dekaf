package metrics

/* Metrics JSON data example:
[
    {
        "metrics": {
            "brk_ml_cache_evictions": 0,
            "brk_ml_cache_hits_rate": 0.0,
            "brk_ml_cache_hits_throughput": 0.0
        },
        "dimensions": {}
    },
    {
        "metrics": {
            "brk_lb_bandwidth_in_usage": 0.0,
            "brk_lb_bandwidth_out_usage": 0.0
        },
        "dimensions": {
            "broker": "pulsar-devenv-broker-1.pulsar-devenv-broker.pulsar-devenv.svc.cluster.local",
            "metric": "loadBalancing"
        }
    }
]
 */

import io.circe._
import io.circe.syntax._
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

type DimensionKey = String
type DimensionValue = String
type Dimensions = Map[DimensionKey, DimensionValue]

type MetricKey = String
type MetricValue = Double
type Metrics = Map[MetricKey, MetricValue]

case class MetricsEntry(
    metrics: Metrics,
    dimensions: Dimensions
)

given metricsEntryEncoder: Encoder[MetricsEntry] = deriveEncoder[MetricsEntry]
given metricsEntryDecoder: Decoder[MetricsEntry] = deriveDecoder[MetricsEntry]

type MetricsEntries = List[MetricsEntry]

def findMetricsEntryByDimensions(dimensions: Dimensions, metricsEntries: MetricsEntries): Option[MetricsEntry] =
    metricsEntries.find(entry => entry.dimensions.eq(dimensions))

