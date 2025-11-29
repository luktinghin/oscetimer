var peer = null;
var conn = null;
var offset;
var time = 0;
var time_in_s;
var count = 0;
var loop1 = null;
var loop2 = null;

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
                        // Allow only a single connection
                        //if (conn && conn.open) {
                        //    c.on('open', function() {
                        //        c.send("Already connected to another client");
                        //        setTimeout(function() { c.close(); }, 500);
                        //    });
                        //    return;
                        //}

                        conn = c;
                        console.log("Connected to: " + conn.peer);
                        //status.innerHTML = "Connected";
                        ready();
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


                function ready() {
                    conn.on('data', function (data) {
                        console.log("Data recieved");
                        document.getElementById("message").innerHTML = data;
                    });
                    conn.on('close', function () {
                        //status.innerHTML = "Connection reset<br>Awaiting connection...";
                        conn = null;
                    });
                }
//from send html
                function join(inputvalue) {
                    // Close old connection
                    if (conn) {
                        conn.close();
                    }

                    // Create connection to destination peer specified in the input field
                    conn = peer.connect(inputvalue, {
                        reliable: true
                    });

                    conn.on('open', function () {
                        //status.innerHTML = "Connected to: " + conn.peer;
                        console.log("Connected to: " + conn.peer);

                        // Check URL params for comamnds that should be sent immediately
                        //var command = getUrlParam("command");
                        //if (command)
                        //    conn.send(command);
                    });
                    // Handle incoming data (messages only since this is the signal sender)
                    conn.on('data', function (data) {
                        //addMessage("<span class=\"peerMsg\">Peer:</span> " + data);
                        document.getElementById("message").innerHTML = data;
                    });
                    conn.on('close', function () {
                        //status.innerHTML = "Connection closed";
                    });
                };


function init(value) {
    if (value == 0) {
        document.getElementById("page_admin").style.display = "block";
        document.getElementById("page_start").style.display = "none";
    } else {
        document.getElementById("page_receiver").style.display = "block";
        document.getElementById("page_start").style.display = "none";
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
    console.log(now);
    console.log(time);
}

function display_timer() {
    timestring = converttime(2*60 - Math.floor(time_in_s));
    document.getElementById("timer_display").innerHTML = timestring;
    if (conn != null) {
        conn.send(timestring);
        console.log("sent");
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
    clearInterval(loop1);
    clearInterval(loop2);
    document.getElementById("timer_display").innerHTML = "";
}

function testsend1() {
    count = count + 1;
    conn.send("Hello world " + count);
}