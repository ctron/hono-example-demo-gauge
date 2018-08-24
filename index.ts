import * as express from 'express';
import * as path from 'path';
import * as Kafka from 'kafka-node';
import * as OS from 'os';

const app = express();

const port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

const payload_format = process.env.PAYLOAD_FORMAT || 'flow';

const kafka_project = process.env.KAFKA_PROJECT || "strimzi"
const kafka_cluster_name = process.env.KAFKA_CLUSTER_NAME || "hono-kafka-cluster"

const kafka_port = "9092"
const kafka_service = kafka_cluster_name + "-kafka-bootstrap"
const kafka_host = kafka_service + "." + kafka_project + ".svc:" + kafka_port

app.use('/justgage', express.static(__dirname + '/../node_modules/justgage/'));
app.use('/jquery', express.static(__dirname + '/../node_modules/jquery/dist/'));

app.engine('html', require('ejs').renderFile);

const hostname = OS.hostname();
console.log("Hostname:", hostname);

const consumerGroup = new Kafka.ConsumerGroupStream({
    kafkaHost: kafka_host,
    groupId: hostname
}, 'telemetry');

var lastState = {deviceId:"N/A", value: ""};

var payloadConverter;
switch(payload_format) {
    case 'kura': {
        payloadConverter = (json) => json.metrics.value;
        break;
    }
    default: {
        payloadConverter = (json) => json.WHE;
        break;
    }
}

consumerGroup.on('data', (chunk) => {
    // console.log(chunk);
    if ( ! chunk.value ) {
        return;
    }
    try {
        lastState = {deviceId:chunk.key, value: payloadConverter(JSON.parse(chunk.value))};
    }
    catch(e) {
        console.log(e);
    }
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
