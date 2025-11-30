var peer = null;
var r_conn = null;
var offset;
var time = 0;
var time_in_s;
var count = 0;
var loop1 = null;
var loop2 = null;
var connections = new Array();
var c_count = -1;
var temporal = {};
temporal.distance = 0;

// receiver.html code below
       function initialize() {
                    // Create own peer object with connection to shared PeerJS server
                    peer = new Peer(null, {
                        debug: 2
                    });

                    peer.on('open', function (id) {
                        // Workaround for peer.reconnect deleting previous id
                        if (peer.id === null) {
                            console.log('Received null id from peer open');
                            peer.id = lastPeerId;
                        } else {
                            lastPeerId = peer.id;
                        }

                        console.log('ID: ' + peer.id);
                        document.getElementById("ownID").innerHTML = peer.id;
                        loadURL();
                        //recvId.innerHTML = "ID: " + peer.id;
                        //status.innerHTML = "Awaiting connection...";
                    });
                    peer.on('connection', function (c) {
                        c_count = c_count+1;
                        connections[c_count] = {};
                        connections[c_count].conn = c;
                        console.log("Connected to: " + connections[c_count].conn.peer);
                        count_string = c_count + 1;
                        document.getElementById("status").innerHTML = "Admin: Connected to " + count_string + " peers";
                        ready(c_count);
                    });
                    peer.on('disconnected', function () {
                        //status.innerHTML = "Connection lost. Please reconnect";
                        console.log('Connection lost. Please reconnect');

                        // Workaround for peer.reconnect deleting previous id
                        peer.id = lastPeerId;
                        peer._lastServerId = lastPeerId;
                        peer.reconnect();
                    });
                    peer.on('close', function() {
                        conn = null;
                        //status.innerHTML = "Connection destroyed. Please refresh";
                        console.log('Connection destroyed');
                    });
                    peer.on('error', function (err) {
                        console.log(err);
                        //alert('' + err);
                    });
                };


                function ready(c_count) {
                    //admin receives data channel
                    connections[c_count].conn.on('data', function (data) {
                        if (data.slice(0,2)=="MS") {
                            str = data.slice(2);
                            console.log("Data received from peer " + connections[c_count].conn.peer);
                            addMessage(str,"Peer #" + c_count);
                        } else if (data.slice(0,2)=="CM") {
                            str = data.slice(2);
                            receiver_parsecommand(str);
                        }
                    });
                    connections[c_count].conn.on('close', function () {
                        //status.innerHTML = "Connection reset<br>Awaiting connection...";
                        connections[c_count].conn = null;
                    });
                }
//from send html, this is for receiver of OSCEtimer
                function join(inputvalue) {
                    // Close old connection
                    if (r_conn) {
                        r_conn.close();
                    }

                    // Create connection to destination peer specified in the input field
                    r_conn = peer.connect(inputvalue, {
                        reliable: true
                    });

                    r_conn.on('open', function () {
                        document.getElementById("status").innerHTML = "Listener: connected to peer";
                        console.log("Connected to: " + r_conn.peer);
                        r_conn.send("CMrequestsync");
                        // Check URL params for comamnds that should be sent immediately
                        //var command = getUrlParam("command");
                        //if (command)
                        //    conn.send(command);
                    });
                    // Handle incoming data (messages only since this is the signal sender)
                    r_conn.on('data', function (data) {                        
                        if (data.slice(0,2) == "TS") {
                            //time stream signal
                            str = data.slice(2);
                            temporal.distance = str * 1;
                            temporal.destination = temporal.distance + Date.now();
                            receiver_sync(temporal.distance);
                            console.log(temporal);
                            addMessage("Timer distance is " + converttime(Math.floor(temporal.distance/1000)),"Debug");
                        } else if (data.slice(0,2) == "CM") {
                            //command
                            receiver_parsecommand(data.slice(2));
                        } else if (data.slice(0,2) == "MS") {
                            //message
                            str = data.slice(2);
                            addMessage(str);    
                        }
                        
                    });
                    r_conn.on('close', function () {
                        //status.innerHTML = "Connection closed";
                    });
                };


function init(value) {
    if (value == 0) {
        document.getElementById("page_admin").style.display = "block";
        document.getElementById("page_start").style.display = "none";
        document.getElementById("page_msg").style.display = "block";
        document.getElementById("status").innerHTML = "Admin: await connection";
    } else {
        document.getElementById("page_receiver").style.display = "block";
        document.getElementById("page_start").style.display = "none";
        document.getElementById("page_msg").style.display = "block";
        document.getElementById("status").innerHTML = "Listener: await connection";
        if (value == 2) {
            //load from ext URL
            document.getElementById("page_receiver_1").style.display = "none";
            document.getElementById("page_receiver_2").style.display = "block";
            document.getElementById("page_receiver_msg").innerHTML = "Host admin: " + r_conn.peer;
        }
    }
}

function addMessage(param2,param1) {
    el0 = document.getElementById("message");
    if (param1 == undefined) param1 = "System";
    el0.innerHTML = param1 + ": " + param2 + "<br>" + el0.innerHTML;
}

function init_receiver() {
    //get id
    inputvalue = document.getElementById("senderID").value;
    join(inputvalue);
}

function update() {
    now = Date.now();
    time += (now - offset) *1;
    offset = now;
    time_in_s = time/1000;
}

function display_timer() {
    temporal.distance = temporal.destination - Date.now();
    timer_time_in_s = Math.floor(temporal.distance/1000);
    if (timer_time_in_s >= 0) {
        timestring = converttime(timer_time_in_s);
        document.getElementById("timer_display").innerHTML = timestring;
    } else {
        timestring = "Admin timer has reached zero.";
        document.getElementById("timer_display").innerHTML = "Time's up!";
    }
}

function converttime(relativeclock) {
    var outputstring = "";
    var h = Math.floor(relativeclock/(60*60));
    var m = Math.floor(relativeclock%(60*60)/60);
    var s = Math.floor(relativeclock%60);
    if (relativeclock<60) {
        return s + "s";
    } else if (relativeclock>=60 && relativeclock<3600) {
        return m + "m " + s + "s";
    } else if (relativeclock>=3600) {
        return h + "h " + m + "m " + s + "s";
    }
}

function sender_sync() {
    if (temporal.distance>0) {
        if (connections.length>0) {
            connections.forEach((el) => {
                if (el.conn != null) 
                    if (el.conn.open) {
                        el.conn.send("TS" + temporal.distance);
                    }
            });
        }
    }
}

function sender_command(param) {
    if (connections.length>0) {
        connections.forEach((el) => {
            if (el.conn != null) {
                if (el.conn.open) el.conn.send("CM" + param);
            }
        });
    }
}

function sender_sendmsg(param) {
    if (connections.length>0) {
        connections.forEach((el) => {
            if (el.conn != null) {
                if (el.conn.open) el.conn.send("MS" + param);
            }
        });
    }
}

function receiver_sync(distance) {
    start_stopwatch(distance);
}

function receiver_parsecommand(param) {
    if (param == "pause") {

    } else if (param == "reset") {

    } else if (param == "requestsync") {
        //this is received from receiver requesting sync
        sender_sync();
    }
}

function loadURL() {
    //read URL
    const queryString = window.location.search;
    if (queryString == "") {
        console.log('no URL params detected');
        document.getElementById("status").innerHTML = "Welcome!";
        document.getElementById("page_start").style.opacity = "1";
    } else {
        const urlParams = new URLSearchParams(queryString);
        const inputString = urlParams.get("U");
        if (inputString == "") {
            console.log("url: U param empty");
        } else {
            console.log(inputString);
            addMessage("Auto-connected via URL command.")
            join(inputString);
            init(2);
        }
    }
}

function sharefunction2() {
    sharefunction(peer.id);
}

function copyfunction2(is_link) {
    copyfunction(peer.id,is_link);
}

async function sharefunction(param) {
    //receives user id
    url = "http://timersync.netlify.app/?U=" + param;
    try {
        await navigator.share({url:url});
    } catch(err) {
        console.log(err);
        copyfunction(url);
    }
}

function copyfunction(param,is_link) {
    var textarea = document.createElement("textarea");
    if (is_link) {
        str = "http://timersync.netlify.app/?U=" + param;    
    } else {
        str = param;
    }
    
        textarea.textContent = str;
        //alert(textarea.textContent);
        textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in Microsoft Edge.
        document.body.appendChild(textarea);
        textarea.select();
        try {
            addMessage(str + " - copied to clipboard");
                //document.getElementById("sharedatatext").focus();
                //document.getElementById("sharedatatext").select();
                //document.getElementById("copycheckmark").classList.toggle("translate");
                //setTimeout(function() {document.getElementById("copycheckmark").classList.toggle("translate")}, 3000);
            return document.execCommand("copy");  // Security exception may be thrown by some browsers.
        }
        catch (ex) {
            console.warn("Copy to clipboard failed.", ex);
            return prompt("Copy to clipboard: Ctrl+C, Enter", text);
        }
        finally {
            document.body.removeChild(textarea);
        }
}

function start_stopwatch(distance) {
    document.getElementById("div_timer").style.display = "flex";
    offset = Date.now();
    console.log(offset);
    if (distance == undefined) {
        dur = document.getElementById("select_timer").value * 60 * 1000;
        temporal.destination = dur + offset;
    } else {
        temporal.destination = distance + offset;
    }
    console.log(temporal.destination);
    update();
    display_timer();
    //clearInterval(loop1);
    clearInterval(loop2);
    //loop1 = setInterval(update,500);
    loop2 = setInterval(display_timer,100);
    if (connections.length>0) {
        sender_sync();
    }
}

function reset_stopwatch() {
    time = 0;
    clearInterval(loop1);
    clearInterval(loop2);
    document.getElementById("timer_display").innerHTML = "";
}

function testsend1() {
    count = count + 1;
    r_conn.send("MS"+"Hello world " + count);
}