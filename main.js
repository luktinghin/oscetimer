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
var isFullscreen = false;
var initiated = false;
var mode = -1;
temporal.distance = 0;
temporal.firstrun = -1;
temporal.paused = false;

// receiver.html code below
       function initialize() {
                    // Create own peer object with connection to shared PeerJS server
                    peer = new Peer("osce-timer-host-" + genID(), {
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
                        document.getElementById("ownID").innerHTML = peer.id.slice(16);
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
                        document.getElementById("status").innerHTML = "Host: Connected to " + count_string + " peers";
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
                        document.getElementById("status").innerHTML = "Listener: connected to host";
                        console.log("Connected to: " + r_conn.peer.id);
                        r_conn.send("CMrequestsync");
                        document.getElementById("page_receiver_msg").innerHTML = "Connected: " + r_conn.peer.slice(16);
                        periodic_check();
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
                            document.getElementById("page_receiver_msg").innerHTML = "Syncing: " + r_conn.peer;
                            //console.log(temporal);
                            addMessage("Timer distance is " + converttime(Math.floor(temporal.distance/1000)),"Debug");
                        } else if (data.slice(0,2) == "CM") {
                            //command
                            receiver_parsecommand(data.slice(2));
                        } else if (data.slice(0,2) == "MS") {
                            //message
                            str = data.slice(2);
                            addMessage(str);    
                        } else if (data.slice(0,2) == "CP") {
                            str = data.slice(2);
                            document.getElementById("timer_display").innerText = str;
                        } else if (data.slice(0,2) == "LB") {
                            str = data.slice(2);
                            document.getElementById("div_label_output").innerText = str;
                        }
                    });
                    r_conn.on('close', function () {
                        addMessage("Connection is lost");
                    });
                };


function init(value) {
    document.getElementById("status").style.display = "block";
    if (value == 0) {
        document.getElementById("page_admin").style.display = "block";
        document.getElementById("page_start").style.display = "none";
        document.getElementById("page_msg").style.display = "block";
        document.getElementById("div_timer_controls").style.display = "flex";
        document.getElementById("status").innerHTML = "Host: await connection";
        mode = 0;
    } else {
        document.getElementById("page_receiver").style.display = "block";
        document.getElementById("page_start").style.display = "none";
        document.getElementById("page_msg").style.display = "block";
        document.getElementById("div_timer_controls").style.display = "none";
        document.getElementById("status").innerHTML = "Viewer: await connection";
        mode = 1;
        if (value == 2) {
            //load from ext URL
            document.getElementById("page_receiver_1").style.display = "none";
            document.getElementById("page_receiver_2").style.display = "block";
            document.getElementById("page_receiver_msg").innerHTML = "Attempt to connect: " + r_conn.peer;
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
    join("osce-timer-host-" + inputvalue);
}

function update() { //OBSOLETE
    now = Date.now();
    time += (now - offset) *1;
    offset = now;
    time_in_s = time/1000;
}

function periodic_sync() {
    sender_sync();
    sender_label();
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
                        if (temporal.paused) {
                            console.log("senderpause");
                            sender_command("pause");
                            //to hide the bug for pause mechanism on receiver side. receiver's clock will be wrong because pause-from is not synced.
                            el.conn.send("CP" + document.getElementById("timer_display").innerText);
                        }
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

function sender_msg(param) {
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

function receiver_pause() {
    pause_action();
}

function receiver_reset() {
    reset_action();
}

function receiver_parsecommand(param) {
    if (param == "pause") {
        console.log("receiverpause");
        receiver_pause();
    } else if (param == "reset") {
        console.log("receiverreset");
        receiver_reset();
    } else if (param == "requestsync") {
        //this is received from receiver requesting sync
        sender_sync();
        sender_label();
    }
}

function loadURL() {
    //read URL
    const queryString = window.location.search;
    if (queryString == "") {
        if (!initiated) {
            console.log('no URL params detected');
            document.getElementById("status").innerHTML = "Welcome!";
            document.getElementById("page_start").style.opacity = "1";
            document.getElementById("status").style.display = "none";
            initiated = true;
        }
    } else {
        const urlParams = new URLSearchParams(queryString);
        const inputString = urlParams.get("V");
        if (inputString == "") {
            console.log("url: V param empty");
        } else {
            console.log(inputString);
            addMessage("Auto-connected via URL command.")
            join("osce-timer-host-" + inputString);
            init(2);
        }
    }
}

function sharefunction2() {
    sharefunction(peer.id.slice(16));
}

function copyfunction2(is_link) {
    copyfunction(peer.id.slice(16),is_link);
}

async function sharefunction(param) {
    //receives user id
    url = "http://oscetimer.app/?V=" + param;
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
        str = "http://oscetimer.app/?V=" + param;    
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
    temporal.firstrun = 0;
    document.getElementById("div_timer").style.display = "flex";
    offset = Date.now();
    console.log(offset);
    document.getElementById("timer_status").innerHTML = "Countdown is running:";
    document.getElementById("timer_status").classList.remove("pause");
    document.getElementById("timer_display").classList.remove("pause");
    if (temporal.paused == false) {
        if (distance == undefined) {
            dur = document.getElementById("select_timer").value * 60 * 1000;
            temporal.destination = dur + offset;
        } else {
            temporal.destination = distance + offset;
        }
        console.log(temporal.destination);
        update();
        display_timer();
        clearInterval(loop1);
        clearInterval(loop2);
        loop1 = setInterval(periodic_sync,15000);
        loop2 = setInterval(display_timer,250);
        if (connections.length>0) {
            sender_sync();
        }
    } else {
        pausedur = Date.now() - temporal.pausefrom;
        temporal.destination = temporal.destination + pausedur;
        console.log(temporal.destination);
        update();
        display_timer();
        clearInterval(loop1);
        clearInterval(loop2);
        loop1 = setInterval(periodic_sync,15000);
        loop2 = setInterval(display_timer,250);
        if (connections.length>0) {
            sender_sync();
        }
        temporal.paused = false;
        temporal.pausefrom = 0;
        if (connections.length>0) {
            sender_sync();
        }
    }
    if (mode == 0) {
        document.getElementById("select_timer").disabled = true;
        document.getElementById("startbutton1").style.display = "none";
        document.getElementById("startbutton2").style.display = "none";
        document.getElementById("pausebutton").style.display = "flex";
        document.getElementById("resetbutton").style.display = "flex";
        document.getElementById("fullscreenbutton").style.display = "flex";
        document.getElementById("div_label_input").style.display = "block";
        document.getElementById("div_label_output").style.display = "none";
    }
    if (mode == 1) {
        document.getElementById("div_timer_controls_receiver").style.display = "flex";
        document.getElementById("div_label_input").style.display = "none";
        document.getElementById("div_label_output").style.display = "block";
    }
}

function pause_stopwatch() {
    pause_action();
        if (connections.length>0) {
            sender_command("pause");
        }
}

function pause_action() {
    temporal.paused = true;
    temporal.pausefrom = Date.now();
    clearInterval(loop1);
    clearInterval(loop2);
    document.getElementById("timer_status").innerHTML = "Countdown is PAUSED.";
    document.getElementById("timer_status").classList.add("pause");
    document.getElementById("timer_display").classList.add("pause");
    if (mode == 0) {
        //document.getElementById("startbutton1").style.display = "inline-block";
        document.getElementById("startbutton2").style.display = "flex";
        document.getElementById("pausebutton").style.display = "none";
    }
}

function reset_stopwatch() {
    reset_action();
        if (connections.length>0) {
            sender_command("reset");
        }
}

function reset_action() {
    temporal.paused = false;
    temporal.pausefrom = 0;
    time = 0;
    clearInterval(loop1);
    clearInterval(loop2);
    document.getElementById("timer_status").classList.remove("pause");
    document.getElementById("timer_display").classList.remove("pause");
    document.getElementById("timer_display").innerHTML = "";
    document.getElementById("timer_status").innerHTML = "Countdown is stopped.";   
    if (mode == 0) {
        document.getElementById("select_timer").disabled = false;
        document.getElementById("startbutton1").style.display = "flex";
        document.getElementById("startbutton2").style.display = "none";
        document.getElementById("pausebutton").style.display = "none";
        document.getElementById("resetbutton").style.display = "none";
        document.getElementById("fullscreenbutton").style.display = "none";
    }
}

function testsend1() {
    count = count + 1;
    r_conn.send("MS"+"Hello world " + count);
}

function fullscreen() {
    if (!isFullscreen) {
        document.getElementById("status").style.display = "none";
        if (mode == 1) document.getElementById("page_receiver").style.display = "none";
        if (mode == 0) document.getElementById("page_admin").style.display = "none";
        document.getElementById("page_msg").style.display = "none";
        document.getElementById("div_timer").classList.add("FS");
        isFullscreen = true;
        if (document.documentElement.requestFullscreen != undefined) {
            document.documentElement.requestFullscreen()
                .then(() => {
                    isFullscreen = true;
                    console.log("fullscreen activated")
                    if (isFullscreen) {
                        console.log("try and lock landscape");
                        screen.orientation.lock("landscape")
                        .then(() => {})
                        .catch((err) => console.error(err));
                    }
                })
                .catch((err) => console.error(err));
        }
    } else {
                isFullscreen = false;
                if (mode == 1) document.getElementById("page_receiver").style.display = "block";
                if (mode == 0) document.getElementById("page_admin").style.display = "block";
                document.getElementById("status").style.display = "block";
                document.getElementById("page_msg").style.display = "block";
                document.getElementById("div_timer").classList.remove("FS");
        if (document.exitFullscreen != undefined) {
        document.exitFullscreen()
            .then(() => {
                if (isFullscreen) {
                    screen.orientation.unlock();
                    console.log("orientation unlocked");
                }

                console.log("fullscreen deactivated");
            })
            .catch((err) => console.error(err));
        }
    }
}
receiver_check = null;
function periodic_check() {
    receiver_check = setInterval(check_status2,10000);
}
function check_status2() {
    if (check_status()) {
        document.getElementById("status").innerHTML = "Viewer: connected to host";
        document.getElementById("page_receiver_msg").innerHTML = "Connected to host: " + r_conn.peer.slice(16);
    } else {
        document.getElementById("status").innerHTML = "Viewer: lost connection";
        document.getElementById("page_receiver_msg").innerHTML = "Disconnected";
        receiver_reset();
        document.getElementById("timer_status").innerHTML = "Please wait...";   
    }
}
function check_status() {
    status = r_conn.peerConnection.iceConnectionState;
    if (status === 'connected' || status === 'completed') {
        return true;
    } else {
        return false;
    }
}
function genID() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

label_timeout = null;

function sender_label_debounce() {
    clearTimeout(label_timeout);
    label_timeout = setTimeout(sender_label,500);
}

function sender_label() {
    str = document.getElementById("label_input").value;
    console.log(str);
        if (connections.length>0) {
            connections.forEach((el) => {
                if (el.conn != null) 
                    if (el.conn.open) {
                        el.conn.send("LB" + str);
                    }
                })
            }
}
