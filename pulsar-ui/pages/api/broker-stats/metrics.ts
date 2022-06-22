// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { isPlainObject } from "lodash";
import { NextApiRequest, NextApiResponse } from "next";
import * as Either from "fp-ts/Either";
import * as pulsarAdmin from "pulsar-admin-client-fetch";
import { AbortController } from "node-abort-controller";

// Fix AbortController is not defined error
(global as any).AbortController = AbortController;

type DimensionKey = string;
type DimensionValue = string;
type Filter = Record<DimensionKey, DimensionValue>;
type Filters = Record<string, Filter>;

type Metric = {
  metrics?: Record<string, any>;
  dimensions?: Record<string, any>;
};

type Metrics = Metric[];

type MetricsMap = Record<string, Metrics>;

type ApiError = { error: string };

const metricsUpdateInterval = 3 * 1000;

type State = {
  metricsUpdateTimeout: NodeJS.Timeout | undefined;
  metrics: Metrics | undefined;
};
const state: State = {
  metrics: undefined,
  metricsUpdateTimeout: undefined,
};

const pulsarAdminClient = new pulsarAdmin.Client({
  BASE: "http://localhost:3000/api/pulsar-broker-web/admin/v2",
  HEADERS: { "Content-Type": "application/json" },
});

async function updateMetrics() {
  const res = await pulsarAdminClient.brokerStats
    .getMetrics()
    .catch((err) => console.log(err));

  if (res !== undefined) {
    state.metrics = res;
  }

  scheduleMetricsUpdate();
}

function scheduleMetricsUpdate() {
  clearTimeout(state.metricsUpdateTimeout);
  state.metricsUpdateTimeout = setTimeout(updateMetrics, metricsUpdateInterval);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MetricsMap | ApiError>
) {
  if (state.metrics === undefined) {
    await updateMetrics();
    scheduleMetricsUpdate();
  }

  let filters: Filters = {};
  try {
    filters = JSON.parse(req.query.filters as string);
  } catch (err) {
    console.log(err);
  }

  const validationResult = validateFilters(filters);
  if (Either.isLeft(validationResult)) {
    return res.status(400).json({ error: validationResult.left.message });
  }

  const filteredMetrics = applyFilters(state.metrics || [], filters);
  return res.status(200).json(filteredMetrics);
}

function applyFilters(metrics: Metrics, filters: Filters): MetricsMap {
  return Object.keys(filters).reduce((result, key) => {
    const filter: Filter = filters[key];
    const filteredMetrics = applyFilter(metrics, filter);
    return { ...result, [key]: filteredMetrics };
  }, {});
}

function applyFilter(metrics: Metrics, filter: Filter): Metrics {
  return metrics.filter((metric) => {
    const metricDimensions = metric.dimensions || {};
    return Object.keys(filter).every((dimensionKey) => {
      return metricDimensions[dimensionKey] === filter[dimensionKey];
    });
  });
}

function validateFilters(filters: Filters): Either.Either<Error, void> {
  if (!isPlainObject(filters)) {
    return Either.left(
      Error(
        `?filters= should be in form { \"key\": { \"dimensionKey\": \"dimensionValue\" }[] }. Got: ${JSON.stringify(
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
      const filter: Filter = filters[key];
      return validateFilter(filter);
    },
    Either.right(undefined)
  );

  if (Either.isLeft(err)) {
    return err;
  }

  return Either.right(undefined);
}

function validateFilter(filter: Filter): Either.Either<Error, void> {
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
