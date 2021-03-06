//Load Config
var config = require("./config.js");

//LOGging
var LOG = require("./lib/utils/log.js");


//Load dependencies
var http = require("http"),
    url = require("url"),
    idworker = require("./lib/idworker.js");

//Startup Info
LOG.info('NodeFlake Server running on port ' + config.port);
LOG.info('Data Center Id:' + config.dataCenterId);
LOG.info('     Worker Id:' + config.workerId);

//Local variables
var worker = idworker.getIdWorker(config.workerId, config.dataCenterId);

if(config.useSockets) {
    //Listen for socket connections and respond
    try {
        var io = require("socket.io").listen(config.port);
        LOG.info("Socket set up, version " + io.version);

        io.sockets.on('connection', function (socket) {
            try {
                //TODO can you get the UA from sockets?
                var nextId = worker.getId("socket.io web socket");
                socket.emit('response', {id:nextId})
            } catch(err) {
                LOG.error("Failed to return id");
                socket.emit('response', {error:err});
            } finally {
                socket.disconnect();
            }
        });
    } catch (err) {
        LOG.error("Could not start socket listener.", err);
        process.exit(1);
    }
} else {
    http.createServer(function (req, res) {
        var urlObj = url.parse(req.url, true);
        if (req.url.indexOf("favicon") > -1) {
            res.writeHead(404, {'Content-Type':'text/plain'});
            res.end("Not Found");
        } else {
            res.writeHead(200, {
                                'Content-Type' : 'text/javascript',
                                'Cache-Control': 'no-cache',
                                'Connection'   : 'close'
                          });
            function wrappedResponse(responseString) {
                if (urlObj.query["callback"]) {
                    return urlObj.query["callback"] + "(" + responseString + ");";
                } else {
                    return responseString;
                }
            }
            try {
                var nextId = worker.getId(req.headers['user-agent']);
                res.end(wrappedResponse("{\"id\":\"" + nextId + "\"}"));
            } catch(err) {
                LOG.error("Failed to return id");
                res.end(wrappedResponse("{\"err\":" + err + "}"));
            }
        }
    }).listen(config.port);
}
