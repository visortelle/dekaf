// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import batchelor from "batchelorjs";

var config = {
  maxConcurrentBatches: 100,
  logger: console,
  request: {
    method: "POST",
    timeout: 10000,
    ip: "unknown",
    headers: {},
    data: "",
  },
  whiteList: ["*"],
};

batchelor.configure(config);

export default function handler(req, res) {
  const body = JSON.parse(req.body);

  batchelor.execute(body, function (err, results) {
    if (err) {
      console.error(err);
    } else {
      res.send(JSON.stringify(results));
    }
  });
}
