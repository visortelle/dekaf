import express from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import batchHandler from "./batch";
import morgan from 'morgan';
import cors from 'cors';
import compression from 'compression';
import brokerMetricsHandler from './broker-metrics/broker-metrics';
import { router as metricsRouter } from './metrics/metrics';
import { polyfill } from "./polyfill";

polyfill();

const port = 3001;
const app = express();

type Config = {
  pulsarBrokerWebUrl: string;
};

const defaultConfig: Config = {
  pulsarBrokerWebUrl: "http://localhost:8080",
};

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(compression());

app.use("/batch", batchHandler);
app.use("/broker-metrics", brokerMetricsHandler);
app.use("/metrics", metricsRouter);
app.use(
  "/pulsar-broker-web",
  createProxyMiddleware({
    target: defaultConfig.pulsarBrokerWebUrl,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: {
      "^/pulsar-broker-web": "/",
    },
    followRedirects: true,
    proxyTimeout: 15 * 1000,
    onProxyReq: fixRequestBody, // fix proxied POST requests when bodyParser is applied before this middleware.
  })
);
app.get("/", (_, res) => res.send(`Hello! I'm Pulsar UI server.`));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

export default {};
