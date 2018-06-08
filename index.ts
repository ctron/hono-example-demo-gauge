import * as express from 'express';
import * as path from 'path';
import * as Kafka from 'kafka-node';
import * as OS from 'os';

const app = express();

const port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

app.use('/justgage', express.static(__dirname + '/../node_modules/justgage/'));
app.use('/jquery', express.static(__dirname + '/../node_modules/jquery/dist/'));

app.engine('html', require('ejs').renderFile);

const hostname = OS.hostname();
console.log("Hostname:", hostname);

const consumerGroup = new Kafka.ConsumerGroupStream({
    kafkaHost: "hono-kafka-cluster-kafka.strimzi.svc:9092",
    groupId: hostname
}, 'telemetry');

var lastState = {deviceId:"N/A", data: {}};

consumerGroup.on('data', (chunk) => {
    console.log(chunk);
    lastState = {deviceId:chunk.key, data: JSON.parse(chunk.value)};
});

app.get('/', function (req, res) {
  res.render('index.html');
});

app.get('/power_consumption', function(req, res) {
    res.json(lastState);
});

/* istanbul ignore next */
if (!module.parent) {
  app.listen(port, ip);
  console.log('Express listening on http://' + ip + ':' + port);
}
