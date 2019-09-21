var http = require("http");
var url = require("url");
var fs = require("fs");
var globalConfig = require("./config");
var loader = require("./loader");
var log = require("./log");
const WebSocket = require("ws"); // 引入 ws 库
const wss = new WebSocket.Server({ port: 1230 }); // 声明wss对象
wss.broadcastToElse = function broadcast(data, ws) {
  wss.clients.forEach(function each(client) {
    if (JSON.stringify(client) !== JSON.stringify(ws) && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};
/* 客户端接入，触发 connection */
wss.on("connection", function connection(ws, req) {
    console.log(1)
  let ip = req.connection.remoteAddress; // 通过req对象可以获得客户端信息，比如：ip，headers等
  /* 客户端发送消息，触发 message */
  ws.on("message", function incoming(message) {
    console.log(message)
    ws.send(message); // 向客户端发送消息
    wss.broadcastToElse(message, ws); // 向 其他的 客户端发送消息，实现群聊效果
  });
});

http.createServer(function (request, response) {

    var pathName = url.parse(request.url).pathname;
    var params = url.parse(request.url, true).query;
    log(pathName);

    var isStatic = isStaticsRequest(pathName);
    if (isStatic) {//请求的静态文件
        try {
            var data = fs.readFileSync(globalConfig["page_path"] + pathName);
            response.writeHead(200);
            response.write(data);
            response.end();
        } catch (e) {
            response.writeHead(404);
            response.write("<html><body><h1>404 NotFound</h1></body></html>");
            response.end();
        }
    } else {//请求的动态的数据
        if (loader.get(pathName) != null) {
            try {
                loader.get(pathName)(request, response);
            } catch (e) {
                console.log(e);
                response.writeHead(500);
                response.write("<html><body><h1>500 BadServer</h1></body></html>");
                response.end();
            }
        } else {
            for(var temp of loader){
                if (new RegExp("^" + temp[0] + "$").test(pathName)) {
                    temp[1](request, response);
                    return;
                }
            }
            response.writeHead(404);
            response.write("<html><body><h1>404 NotFound</h1></body></html>");
            response.end();
        }
    }

}).listen(globalConfig["port"]);
log("服务已启动");

function isStaticsRequest(pathName) {
    for (var i = 0 ; i < globalConfig.static_file_type.length ; i ++) {
        var temp = globalConfig.static_file_type[i];
        if(pathName.indexOf(temp) == pathName.length - temp.length){
            return true;
        }
    }
    return false;
}