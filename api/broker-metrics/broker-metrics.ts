// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { cloneDeep, isPlainObject, mergeWith } from "lodash";
import * as Either from "fp-ts/Either";
import * as pulsarAdmin from "pulsar-admin-client-fetch";
import { AbortController } from "node-abort-controller";
import { Request, Response } from "express";

export type DimensionKey = string;
export type DimensionValue = string;
export type ByDimensionFilter = Record<DimensionKey, DimensionValue>;
export type ByDimensionsFilter = Record<string, ByDimensionFilter>;
export type Filter =
  | { type: "by-dimensions"; filter: ByDimensionsFilter }
  | { type: "by-tenant"; tenant: string }
  | { type: "all-tenants" };

export type Metric<MS> = {
  metrics?: MS;
  dimensions?: Record<string, any>;
};

export type Metrics<MS> = Metric<MS>[];

export type MetricsMap<MS> = Record<string, Metrics<MS>>;

export type ApiError = { error: string };

type AnyMetricSchema = Record<string, any>;

type State = {
  metrics: Metrics<AnyMetricSchema> | undefined;
  metricsUpdateTimeout: NodeJS.Timeout | undefined;
};
const state: State = {
  metrics: undefined,
  metricsUpdateTimeout: undefined,
};

const pulsarAdminClient = new pulsarAdmin.Client({
  BASE: "http://localhost:3001/pulsar-broker-web/admin/v2",
  HEADERS: { "Content-Type": "application/json" },
});

async function refreshState() {
  const res = await pulsarAdminClient.brokerStats
    .getMetrics()
    .catch((err) => console.log(err));

  if (res !== undefined) {
    state.metrics = res;
  }

  scheduleRefreshState();
}

function scheduleRefreshState() {
  clearTimeout(state.metricsUpdateTimeout);
  state.metricsUpdateTimeout = setTimeout(refreshState, 5 * 1000);
}

export default async function handler(req: Request, res: Response) {
  if (state.metrics === undefined) {
    await refreshState();
    scheduleRefreshState();
  }

  let filter: Filter = { type: "all-tenants" };

  try {
    filter = JSON.parse(req.query.filter as string);
  } catch (err) {
    console.log(err);
  }

  let filteredMetrics: MetricsMap<AnyMetricSchema> = {};
  if (filter.type === "by-dimensions") {
    const validationResult = validateByDimensionsFilter(filter.filter);
    if (Either.isLeft(validationResult)) {
      return res.status(400).json({ error: validationResult.left.message });
    }
    filteredMetrics = applyByDimensionsFilter(
      state.metrics || [],
      filter.filter
    );
  } else if (filter.type === "all-tenants") {
    filteredMetrics = applyAllTenantsFilter(state.metrics || []);
  }

  return res.status(200).json(filteredMetrics);
}

function applyAllTenantsFilter(
  metrics: Metrics<AnyMetricSchema>
): MetricsMap<AnyMetricSchema> {
  const getMetricsSumByTenant = (tenant: string): Record<string, number> => {
    return metrics.reduce<Record<string, number>>((result, metric) => {
      const [te, ns, to] = (metric?.dimensions?.namespace || "").split("/");

      if (ns === undefined || to === undefined || te !== tenant) {
        return result;
      }

      const mergeDest = cloneDeep(result);
      const mergeSrc = metric.metrics;
      mergeWith(mergeDest, mergeSrc, (destValue, srcValue) => {
        if (destValue === undefined && typeof srcValue === "number") {
          return srcValue;
        }
        if (typeof destValue === "number" && typeof srcValue === "number") {
          return destValue + srcValue;
        }

        return destValue;
      });

      return mergeDest;
    }, {});
  };

  const getTenants = (): string[] => {
    return metrics.reduce<string[]>((result, metric) => {
      const [te, ns, to] = (metric?.dimensions?.namespace || "").split("/");
      if (ns === undefined || to === undefined) {
        return result.concat([te]);
      }
      return result;
    }, []);
  };

  const tenants = getTenants();
  return tenants.reduce((result, tenant) => {
    const metricsSum = getMetricsSumByTenant(tenant);
    return { ...result, [tenant]: metricsSum };
  }, {});
}

function applyByDimensionsFilter(
  metrics: Metrics<AnyMetricSchema>,
  filters: ByDimensionsFilter
): MetricsMap<AnyMetricSchema> {
  return Object.keys(filters).reduce((result, key) => {
    const filter: ByDimensionFilter = filters[key];
    const filteredMetrics = applyByDimensionFilter(metrics, filter);
    return { ...result, [key]: filteredMetrics };
  }, {});
}

function applyByDimensionFilter(
  metrics: Metrics<AnyMetricSchema>,
  filter: ByDimensionFilter
): Metrics<AnyMetricSchema> {
  return metrics.filter((metric) => {
    const metricDimensions = metric.dimensions || {};
    return Object.keys(filter).every((dimensionKey) => {
      return metricDimensions[dimensionKey] === filter[dimensionKey];
    });
  });
}

function validateByDimensionsFilter(
  filters: ByDimensionsFilter
): Either.Either<Error, void> {
  if (!isPlainObject(filters)) {
    return Either.left(
      Error(
        `?filter= should be in form { \"key\": { \"dimensionKey\": \"dimensionValue\" }[] }. Got: ${JSON.stringify(
          filters
        )}`
      )
    );
  }

  const err = Object.keys(filters).reduce<Either.Either<Error, void>>(
    (result, key) => {
      if (Either.isLeft(result)) {
        return result;
      }
      const filter: ByDimensionFilter = filters[key];
      return validateFilter(filter);
    },
    Either.right(undefined)
  );

  if (Either.isLeft(err)) {
    return err;
  }

  return Either.right(undefined);
}

function validateFilter(filter: ByDimensionFilter): Either.Either<Error, void> {
  if (
    !isPlainObject(filter) ||
    !Object.keys(filter).every((dimensionKey) => {
      return (
        typeof dimensionKey === "string" ||
        typeof filter[dimensionKey] === "string"
      );
    })
  ) {
    return Either.left(
      new Error(
        `Each filter entry should be in form { "dimensionKey": "dimensionValue" }[]. Got: ${typeof filter} ${JSON.stringify(
          filter
        )}`
      )
    );
  }
  if (Object.keys(filter).length === 0) {
    return Either.left(new Error("?filter= is required"));
  }

  return Either.right(undefined);
}
