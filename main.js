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
                        //recvId.innerHTML = "ID: " + peer.id;
                        //status.innerHTML = "Awaiting connection...";
                    });
                    peer.on('connection', function (c) {
                        c_count = connections.length;
                        connections[c_count] = {};
                        connections[c_count].conn = c;
                        console.log("Connected to: " + connections[c_count].conn.peer);
                        document.getElementById("status").innerHTML = "Admin: Connected";
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
                    connections[c_count].conn.on('data', function (data) {
                        console.log("Data recieved");
                        document.getElementById("message").innerHTML = data;
                    });
                    connections[c_count].conn.on('close', function () {
                        //status.innerHTML = "Connection reset<br>Awaiting connection...";
                        connections[c_count].conn = null;
                    });
                }
//from send html
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

                        // Check URL params for comamnds that should be sent immediately
                        //var command = getUrlParam("command");
                        //if (command)
                        //    conn.send(command);
                    });
                    // Handle incoming data (messages only since this is the signal sender)
                    r_conn.on('data', function (data) {
                        //addMessage("<span class=\"peerMsg\">Peer:</span> " + data);
                        document.getElementById("message").innerHTML = data;
                    });
                    r_conn.on('close', function () {
                        //status.innerHTML = "Connection closed";
                    });
                };


function init(value) {
    if (value == 0) {
        document.getElementById("page_admin").style.display = "block";
        document.getElementById("page_start").style.display = "none";
        document.getElementById("status").innerHTML = "Admin: await connection";
    } else {
        document.getElementById("page_receiver").style.display = "block";
        document.getElementById("page_start").style.display = "none";
        document.getElementById("status").innerHTML = "Listener: await connection";
    }
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
    timestring = converttime(2*60 - Math.floor(time_in_s));
    document.getElementById("timer_display").innerHTML = timestring;
    if (c_count>0) {
        for (i=0;i<c_count;i++) {
            if (connections[c_count].conn != null) {
                conn.send(timestring);
            }    
        }        
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

function start_stopwatch() {
    offset = Date.now();
    clearInterval(loop1);
    clearInterval(loop2);
    loop1 = setInterval(update,500);
    loop2 = setInterval(display_timer,500);
}

function reset_stopwatch() {
    time = 0;
    clearInterval(loop1);
    clearInterval(loop2);
    document.getElementById("timer_display").innerHTML = "";
}

function testsend1() {
    count = count + 1;
    r_conn.send("Hello world " + count);
}