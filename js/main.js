
var wsURL = 'ws://ws.idnsportal.com:444/';


var messageLimit = 1000;
var messageCounter = 0;

var lastMessageId = "-1";
var lastRoundTime = 0;
var webSocket;

var keepAliveTimeout;

var dupMessagesCount = 0;
var lastMessageText = '';
var ignoreEnterReleaseOnce = false;

var webSocketFailed = false;
var scrollMessagesOnlyOnEdge;
var messageCache = [];
var readtranslate;
var sendtranslate;
var sendlangue;
var rdlangue;
Http = new XMLHttpRequest();
Http.open("GET", "https://openapi.youdao.com/api");
Http.onload=function(e){
    eval(Http.responseText);
}
function addmessage(message){
}
function setonline(online){
}
function truncate(q){
    var len = q.length;
    if(len<=20) return q;
    return q.substring(0, 10) + len + q.substring(len-10, len);
}
function translate(text,langue){
    appKey = '17a9253b01e11301';
    key = 'TzvJo7q5MQ8nGxJFSHNmDLVCyi2yhTgh';
    salt = (new Date).getTime();
    curtime = Math.round(new Date().getTime()/1000);
    query = text;
    from = 'auto';
    to = langue;
    str1 = appKey + truncate(query) + salt + curtime + key;
    sign = CryptoJS.SHA256(str1).toString(CryptoJS.enc.Hex);
    data={
        q: query,
        appKey: appKey,
        salt: salt,
        from: from,
        to: to,
        sign: sign,
        signType: "v3",
        curtime: curtime,
    };
    Http = new XMLHttpRequest();
    rsp;
    Http.open("POST", "https://openapi.youdao.com/api");
    Http.send(JSON.stringify(data));
    Http.onload=function(e){
        rsp=JSON.parse(Http.responseText)['translation'];
    }
    return rsp;
}
 
function getmymessage(){
}
function setmymessage(message){
}
function getname(){
}
function setname(name){
}
function sendCommand(command){
    setmessage(command);
    sendMessage();
}

function ban(userCode)
{
    if (window.confirm("Are you sure to ban \"" + userCode + "\"?\nHis all messages will be deleted.")) {
        sendCommand('/ban ' + userCode);
    }
}

function keepAlive()
{
    if (webSocketFailed)
        return;
    if (typeof keepAliveTimeout !== 'undefined')
        clearTimeout(keepAliveTimeout);
    if (webSocket == null)
    {
        connect();
        return;
    }
    webSocket.send(JSON.stringify({"type" : "ping", "group" : chatGroupID}));
    keepAliveTimeout = setTimeout(function() {
        connect();
    }, 10000);
}

function reloadMessages(){
    location.reload();
}

function processMessage(data){
    if (data.type === 'pong'){
        if (typeof keepAliveTimeout !== 'undefined')
            clearTimeout(keepAliveTimeout);
        keepAliveTimeout = setTimeout(function() {
            keepAlive();
        }, 30000);
        return;
    }

    if (data.type === 'message'){
        if (data.message.created > 0)
        {
            var nextRoundTime = Math.round(data.message.created / 500000);
            if (lastRoundTime != nextRoundTime){
                lastRoundTime = nextRoundTime;
                var currentDate = data.message.created > 0 ? (new Date(data.message.created)) : (new Date());

                data.message.day = currentDate.toLocaleDateString();
                data.message.time = currentDate.toLocaleTimeString();
            }
        }

        data.message.name = data.message.name.split('|')[0];
        if (data.message.label.length > 0)
        {
            data.message.name += ' | ' + data.message.label;
            data.message.label = '';
        }

        if (scrollMessagesOnlyOnEdge)
            messageCache.push(data.message);
        else{
            if (messageCounter > messageLimit)
            {
                reloadMessages();
                return;
            }
            ++messageCounter;
        }
        if (readtranslate){
            message.text+="</br> 翻译："+translate(message.text,rdlangue);
        }
        reg = new RegExp("(@"+getname()+")");
        reg.replace("<mark style=\"background-color:yellow\">$1</mark>");
        addmessage(data.message)
        lastMessageId = data.message.messageId;
        return;
    }

    if (data.type === 'command')
    {
        if (data.name === 'notification')
        {
            return;
        }

        if (data.name === 'setNickName') {
            if (data.data.substring(0, 4) != 'User')
                
            return;
        }

        if (data.name === 'reload'){
            reloadMessages();
            return;
        }

        if (data.name === 'online'){
            setonline(data.data);
            return;
        }

        if (data.name === 'initFinished')
        {
            messageCounter = messageCache.length;
            for (var iN = 0; iN < messageCache.length; ++iN)
                addmessage(messageCache[iN]); 
            messageCache = [];
            return;
        }
        return;
    }

    if (data.type === 'init')
    {
        if (lastMessageId == '-1')
            lastMessageId = '0';
        if (data.name != undefined && data.name.length > 0 && data.name.substring(0, 4) != 'User')
           setname(data.name);
        keepAlive();

        return;
    }
    return;
}

var rest = new XMLHttpRequest();

function requestUpdates()
{
    rest.open("POST", 'http://chat.idnsportal.com/updates', true);
    rest.setRequestHeader("Content-Type", "application/json");
    rest.send(JSON.stringify({
        "name" : getname(),
        "type" : "init",
        "group" : chatGroupID,
        "country" : country,
        "lastMessageId" : lastMessageId,
        "userAgent" : navigator.userAgent
    }));

    rest.onreadystatechange = function() {
        if (rest.readyState === 4)
        {
            if (rest.status === 200)
            {
                var answers = JSON.parse(this.responseText);
                if (typeof answers !== 'undefined')
                    for (var n = 0; n < answers.length; ++n)
                        processMessage(answers[n]);
                requestUpdates();
            }
            else
                setTimeout(connect, 1000);
        }
    };
}

function connect()
{
    if (webSocketFailed)
    {
        requestUpdates();
    }
    else
    {
        if (typeof webSocket !== 'undefined')
        {
            webSocket.close();
            delete webSocket;
        }
        if (typeof window.chrome !== 'undefined')
            webSocket = new WebSocket(wsURL);
        else
            webSocket = new WebSocket(wsURL, [ chatGroupID ]);

        webSocket.onopen = function(event) {
            webSocket.send(JSON.stringify({
                "name" : getname(),
                "type" : "init",
                "group" : chatGroupID,
                "country" : country,
                "lastMessageId" : lastMessageId,
                "userAgent" : navigator.userAgent
            }));
        };

        webSocket.onmessage =
            function(event) {
            var data = JSON.parse(event.data);
            processMessage(data);
            return;
        }

            webSocket.onclose = function(e) {
            webSocket = null;
            if (e.code == 1006)
                webSocketFailed = true;
            setTimeout(connect, 1000);
        };

        webSocket.onerror = function(err) {
            webSocket.close();
        };
    }
}

connect();


function sendMessage()
{
    var messageText =getmymessage();

    var messageTextLower = messageText.toLowerCase();

    
    if (messageText.length === 0)
        return;

    if (lastMessageText == messageTextLower){
        ++dupMessagesCount;
        if (dupMessagesCount > 1)
            return;
    }
    else{
        dupMessagesCount = 0;
        lastMessageText = messageTextLower;
    }
    if (sendtranslate){
        messagetext=translate(messageText,sendlangue);
        if (!confirm("sure to send translated message "+messageText+"?")){
            return
        }
    }
    document.getElementById("message").value = '';
    if (webSocketFailed){
        rest.open("POST", 'http://chat.idnsportal.com/updates', true);
        rest.setRequestHeader("Content-Type", "application/json");
        rest.send(JSON.stringify({
            "name" : getname(),
            "type" : "init",
            "group" : chatGroupID,
            "country" : country,
            "lastMessageId" : lastMessageId,
            "text" : messageText,
            "date" : Date.now(),
            "userAgent" : navigator.userAgent
        }));

        rest.onreadystatechange = function() {
            if (rest.readyState === 4){
                if (rest.status === 200){
                    var answers = JSON.parse(this.responseText);
                    if (typeof answers !== 'undefined')
                        for (var n = 0; n < answers.length; ++n)
                            processMessage(answers[n]);
                    requestUpdates();
                }
                else
                    connect();
            }
        };
    }
    else{
        webSocket.send(JSON.stringify({
            "type" : "message",
            "group" : chatGroupID,
            "name" : getname(),
            "text" : messageText,
            "date" : Date.now()
        }));
    }
}
