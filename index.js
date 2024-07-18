const express = require("express");
const client = require("prom-client"); //Metrix collection
const responeTime = require("response-time");
const { doSomeHeavyTask } = require("./utils");

const app = express();

const PORT = 8000;

//this part collect the metrix of our server
const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics({ register: client.register });

const reqResTime = new client.Histogram({
  name: "http_express_req_res_time",
  help: "this tells how much time is taken by req and res",
  labelNames: ["method", "route", "status_code"],
  buckets: [1, 50, 100, 200, 400, 500, 800, 1000, 2000],
});

const totalReqCounter = new client.Counter({
  name: "total_request",
  help: "tells total request",
});

app.use(
  responeTime((req, res, time) => {
    totalReqCounter.inc();
    reqResTime
      .labels({
        method: req.method,
        route: req.url,
        status_code: res.statusCode,
      })
      .observe(time);
  })
);

app.get("/", (req, res) => {
  return res.json({ message: `hello form express server ` });
});

app.get("/slow", async (req, res) => {
  try {
    const timeTaken = await doSomeHeavyTask();
    return res.json({
      status: "Success",
      message: `Heavy task is completed in ${timeTaken} ms`,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "Error", error: "Internal server error" });
  }
});

//sending the server metrics , on this route
app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", client.register.contentType);

  const metrics = await client.register.metrics();
  res.send(metrics);
});

app.listen(PORT, () => {
  console.log(`Express server started running on port :${PORT}`);
});
