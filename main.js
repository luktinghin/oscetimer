var offset;
var time = 0;
var time_in_s;
var count = 0;
var loop1 = null;
var loop2 = null;
var temporal = {};
var isFullscreen = false;
var initiated = false;
var mode = -1;
temporal.distance = 0;
temporal.duration = 0;
temporal.destination = 0;
temporal.firstrun = -1;
temporal.paused = false;
var users = new Array();
var usersMsg =  new Array();
var online_count = 0;
//for self, viewer
var messages = "";
var self = {};
var hostid = undefined;
const SERVER_URL = "https://oscetimer.app"
const socket = io(SERVER_URL, {
    transports: ["websocket"],
    secure: true
});
var label;
var modal = undefined;
var timetable = {};
timetable.inputtimes = new Array();
timetable.durations = new Array();
timetable.descriptions = new Array();
timetable.origin = 0; //timestamp of origin in epoch
timetable.offset = 0;; //add how many s offset if paused
timetable.current = 0; //holds the current index
timetable.active = false;
timetable.destinations = new Array();
timetable.prior = -1;
timetable.TTdist = 0;
timetableinput = new Array(); 

if (!navigator.canShare) {
    document.getElementById("sharelinkbutton").style.display="none";
} else {
    document.getElementById("copylinkbutton").style.display="none";
}

function displayDialog(dialogTitle, dialogContent, noClose) {
    const ElTitle = document.querySelector("#modalDialog .title");
    const ElContent = document.querySelector("#modalDialog .modal-body");
    ElTitle.innerHTML = dialogTitle;
    ElContent.innerHTML = dialogContent;
    if (noClose) {
        document.querySelector(".close").style.display = "none";
    } else {
        document.querySelector(".close").style.display = "block";
    }
    setmodal("modalDialog");
}

function displayDialogFull(dialogTitle, dialogContent) {
    const ElTitle = document.querySelector("#modalDialogFull .title");
    const ElContent = document.querySelector("#modalDialogFull .modal-body");
    ElTitle.innerHTML = dialogTitle;
    ElContent.innerHTML = dialogContent;
    setmodal("modalDialogFull");
}

function setmodal(modalname, noClose) {
  modal = document.getElementById(modalname);
  modalcontent = document.getElementById(modalname + "content");
  modal.classList.add("fadein");
  modalcontent.classList.add("open");
}

function hidemodal(param) {
    document.getElementById(param + "content").classList.remove("open");
    document.getElementById(param).classList.remove("fadein");
    document.getElementById(param).classList.remove("noClose");
    modal = undefined;
}

//client code
socket.on("connect", () => {
    console.log("connected to socket server");
    if (!initiated) {
        socket.nickname = "";    
        loadURL();
    } else {
        console.log("connection re-established");
        if (self.role=="viewer") {
            if (hostid != undefined) {
                joinRoom(hostid.slice(0,3));    
            }
        } else {
            joinRoom();
            sender_sync();
            sender_displayusers();
        }
    }
})

//client code
socket.on('disconnect', () => {
    if (self.role == "viewer") {
            document.getElementById("status").innerHTML = "Viewer: lost connection";
            document.getElementById("page_receiver_msg").innerHTML = "Disconnected";
            document.getElementById("timer_status").innerHTML = "Please wait...";  
            receiver_reset();
            displayDialog("Disconnection","<div style='padding:15px'>Viewer is disconnected. If the connection is re-established, the viewer app will automatically reconnect and synchronize.</div>");
            clearInterval(receiver_check);
            receiver_check = null;
    }
})

//client-host code
/*deprecated registration, this become server based
socket.on("register", (msg) => {
    c_count = c_count + 1;
    users[c_count] = {};
    users[c_count].id = msg.slice(0,6);
    users[c_count].nickname = msg.slice(6);
    console.log(users);
    sender_displayusers();
});
*/

socket.on("users", (data) => {
    userObj = data;
    //sort
    userObj.sort((a,b)=>a.nickname.localeCompare(b.nickname));
    users.length = 0;
    users = structuredClone(userObj);
    console.log(users);
    if (self.role == "host") {
        sender_displayusers();
    } else {
        check_status();
    }
})

async function joinRoom(roomInput) {
    if (roomInput == undefined) {
        //this is host
        //verify if room exists
        roomId = "room-" + self.uid.slice(0,3);
        self.nickname = ""; //need to set to empty because undefined will result in error
    } else {
        roomId = "room-" + roomInput;
    }
    uid = self.uid;
    nickname = self.nickname;
    role = self.role;
    if (self.role == "viewer") {
        //verify if room exists
        result = await queryRoom(roomInput);
        if (result != "---") {
            socket.emit('join', { room: roomId, uid: uid, nickname: nickname, role: role });
            socket.emit('send data to host', { command: 'JN', hostid: hostid });
            if (result.slice(8) == "TS") {
                await request_sync();    
            } else {
                await request_sync_TT();
            }
            
            receiver_poll();
            if (receiver_check == null) periodic_check();
        } else {
            displayDialog("Error","<div style='padding:12px'>There is an error connecting to the host. Please verify the host ID code or try again later.</div>");
            //exit this and restart again
            document.getElementById("page_receiver_1_button").style.display = "block";
        }
    } else {
        socket.emit('join', { room: roomId, uid: uid, nickname: nickname, role: role });    
    }
}

socket.on("send host", (data) => {
    if (self.role == "host") {
                        if (data.slice(0,2)=="MS") {
                            tempfrom = data.slice(2,8);
                            tempuserindex = usersMsg.findIndex(user => user.uid == tempfrom);
                            if (tempuserindex == -1) {
                                usersMsg.push({ uid: tempfrom, messages: "" });
                                tempuserindex = usersMsg.length - 1;
                            }
                            tempuserindex2 = users.findIndex(user => user.uid == tempfrom);
                            tempalias = users[tempuserindex2].nickname;
                            if (tempalias == "") tempalias = "Anonymous";
                            msg = data.slice(8);
                            timestr = formattime(new Date());
                            usersMsg[tempuserindex].messages += `
                                <div class="chatbox_chat_else">
                                    <div class="chatbox_chat_head">
                                        <span class="chatbox_author_else">${tempalias}</span>&nbsp;&bull;&nbsp;<span class="timestamp">${timestr}</span>
                                    </div>
                                    <div class="chatbox_chat_contents">${msg}</div>
                                </div>
                            `;
                            if (modal!=undefined) {
                                //update the chatbox for the current sender client only if current sender client is active
                                tempId = document.querySelector(".chatbox_messages").dataset.uid;
                                if (tempId == tempfrom) {
                                    document.querySelector(".chatbox_messages").innerHTML = usersMsg[tempuserindex].messages;    
                                    document.querySelector(".chatbox_messages").scrollTop = document.querySelector(".chatbox_messages").scrollHeight;
                                }
                            }
                        } else if (data.slice(0,2)=="CM") {
                            tempfrom = data.slice(2,8);
                            str = data.slice(8);
                            receiver_parsecommand(str, tempfrom);
                        } else if (data.slice(0,2)=="ID") {

                            //deprecated as user management is handled by server
                            //signal used to identify viewer user nickname
                            //tempfrom = data.slice(2,8);
                            //tempuserindex = users.findIndex(user => user.uid == tempfrom);
                            //tempalias = data.slice(8);
                            //users[tempuserindex].nickname = tempalias;
                        } else if (data.slice(0,2)=="JN") {
                            //someone joined a room, remote request the host to update
                            sender_poll();
                            console.log("remote users list refresh triggered, users updated");
                        } else if (data.slice(0,2)=="SY") {
                            sender_sync();
                            sender_label();
                        }
    }
})
//client-viewer code
socket.on("send viewer", async (data) => {
    if (self.role == "viewer") {
                        if (data.slice(0,2) == "TS") {
                            //TS signal via server
                            await request_sync();
                            //time stream signal - via socket
                            //str = data.slice(2);
                            //temporal.distance = str * 1;
                            //temporal.destination = temporal.distance + Date.now();
                            //if (temporal.paused) temporal.paused = false;
                            //receiver_sync(temporal.distance);
                            //document.getElementById("page_receiver_msg").innerHTML = "Syncing";
                        } else if (data.slice(0,6) == "TTdist") {
                            await request_sync_TT();
                            //obsolete
                            //str = data.slice(6) * 1;
                            //if (temporal.paused) temporal.paused = false;
                            //receiver_sync_TT(str);
                            //document.getElementById("page_receiver_msg").innerHTML = "Syncing";
                        } else if (data.slice(0,6) == "TTdata") {
                            //obsolete
                            //tempobj = JSON.parse(data.slice(6));
                            //timetable = {};
                            //timetable = tempobj;
                        } else if (data.slice(0,2) == "CM") {
                            //command from host
                            receiver_parsecommand(data.slice(2),"host");
                        } else if (data.slice(0,2) == "MS") {
                            //message
                            str = data.slice(2);
                            timestr = formattime(new Date());
                            messages += `
                                <div class="chatbox_chat_else">
                                    <div class="chatbox_chat_head">
                                        <span class="chatbox_author_else">Host</span>&nbsp;&bull;&nbsp;<span class="timestamp">${timestr}</span>
                                    </div>
                                    <div class="chatbox_chat_contents">${str}</div>
                                </div>
                            `;
                            document.getElementById("incomingmessage").innerHTML = str;
                            if (modal!=undefined) {
                                document.querySelector(".chatbox_messages").innerHTML = messages;
                                document.querySelector(".chatbox_messages").scrollTop = document.querySelector(".chatbox_messages").scrollHeight;
                            }
                        } else if (data.slice(0,2) == "CP") {
                            //pause command, to refresh and mirror display without altering temporal
                            str = data.slice(2);
                            document.getElementById("timer_display").innerText = str;
                        } else if (data.slice(0,2) == "LB") {
                            //display a label given by host
                            str = data.slice(2);
                            document.getElementById("div_label_output").innerText = str;
                        }
    }
})

async function initialize(len) {
    self.uid = await genID(len);
    console.log("initiation, self ID " + self.uid);
    document.getElementById("ownID").innerHTML = self.uid;
    QRgen();
}

async function init(value) {
    requestWakeLock();
    document.getElementById("status").style.display = "block";
    document.getElementById("helpicon").classList.add("transform");
    if (value == 0) {
        document.getElementById("page_admin").style.display = "block";
        document.getElementById("page_start").style.display = "none";
        //document.getElementById("page_msg").style.display = "block";
        document.getElementById("page_admincontrols").style.display = "block";
        document.getElementById("div_timer_controls").style.display = "flex";
        document.getElementById("status").innerHTML = "Host: await connection";
        mode = 0;
        self.role = "host";
        await initialize(6);
        joinRoom();
    } else {
        document.getElementById("page_receiver").style.display = "block";
        document.getElementById("page_start").style.display = "none";
        //document.getElementById("page_msg").style.display = "block";
        document.getElementById("page_admincontrols").style.display = "none";
        document.getElementById("div_timer_controls").style.display = "none";
        document.getElementById("status").innerHTML = "Viewer: await connection";
        mode = 1;
        self.role = "viewer";
        self.conn_failure = 0;
        if (value == 2) {
            //load from ext URL
            document.getElementById("page_receiver_1").style.display = "none";
            document.getElementById("page_receiver_1_button").style.display = "none";
            document.getElementById("page_receiver_2").style.display = "block";
            document.getElementById("page_receiver_msg").innerHTML = "Attempt to connect: " + hostid;
        }
    }
}

function addMessage(param2,param1) {
    el0 = document.getElementById("message");
    if (param1 == undefined) param1 = "System";
    el0.innerHTML = param1 + ": " + param2 + "<br>" + el0.innerHTML;
}

async function init_receiver(arg) {
    //get id
    if (arg == undefined) {
        hostid = document.getElementById("senderID").value;    
    } else {
        hostid = arg;
    }
    await initialize(3);
    roomid = hostid.slice(0,3);
    self.nickname = document.getElementById("viewerID").value;
    document.getElementById("page_receiver_1_button").style.display = "none";
    joinRoom(hostid.slice(0,3));
}

function periodic_sync() {
    sender_sync();
    if (label != document.getElementById("label_input").value) {
        sender_label();    
    }
    sender_poll();
}

function display_timer() {
    offset = Date.now();
    temporal.distance = temporal.destination - offset;
    timer_time_in_s = Math.floor(temporal.distance/1000);
    if (timer_time_in_s >= 0) {
        timestring = converttime(timer_time_in_s);
        document.getElementById("timer_display").innerHTML = timestring;
        y = temporal.distance/temporal.duration*100 + "%";
        document.getElementById("div_timer_inner").style.backgroundImage = `linear-gradient(to right, #eee ${y}, #fff ${y})`;
        if (timetable.active) {
            param0 = timetable.current + 1;
            param1 = timetable.durations.length;
            param2 = timetable.descriptions[timetable.current];
            if (param2.length>0) param2 = " " + param2;
            document.getElementById("timer_status").innerHTML = `
                <b>Step ${param0}/${param1}</b><i>${param2}</i>
                &nbsp;&mdash;&nbsp;
                <span style='white-space:nowrap'>Countdown is running:</span>
            `;
            if (self.role == "host") {
                document.getElementById("TTinputrow" + timetable.current).style.backgroundImage = `linear-gradient(to right, #13694e ${y}, #444 ${y})`;
                if (timetable.prior != timetable.current) {
                    console.log("TT refresh triggered");
                    if (self.role == "host") {
                        for (i=0; i<timetableinput.length; i++) {
                            if (i==timetable.current) {
                                document.getElementById("TTinputrow" + i).classList.remove('past');
                                document.getElementById("TTinputrow" + i).classList.remove('future');
                                document.getElementById("TTinputrow" + i).classList.add('active');
                            } else if (i<timetable.current) {
                                document.getElementById("TTinputrow" + i).classList.add('past');
                                document.getElementById("TTinputrow" + i).classList.remove('future');
                                document.getElementById("TTinputrow" + i).classList.remove('active');
                                document.getElementById("TTinputrow" + i).style.backgroundImage = "";                            
                            } else if (i>timetable.current) {
                                document.getElementById("TTinputrow" + i).classList.remove('past');
                                document.getElementById("TTinputrow" + i).classList.add('future');
                                document.getElementById("TTinputrow" + i).classList.remove('active');
                                document.getElementById("TTinputrow" + i).style.backgroundImage = "";
                            }
                        }
                    }
                    timetable.prior = timetable.current;
                }
            }
        }
    } else {
        //this is when countdown reaches zero
        //if this is "single" mode, end the timer
        if (timetable.active == false) {
            timesup();
        } else {
            //move to next and display new timestring
            timetable.current = timetable.destinations.findIndex((el)=>el>offset);
            if (timetable.current == -1) {
                //not found
                timesup();
            } else {
                    console.log("TT advance, to index " + timetable.current);
                    //find the next destination
                    temporal.destination = timetable.destinations[timetable.current];
                    temporal.distance = temporal.destination - offset;
                    temporal.duration = timetable.durations[timetable.current];
                    timer_time_in_s = Math.floor(temporal.distance/1000);
                    timestring = converttime(timer_time_in_s);
                    document.getElementById("timer_display").innerHTML = timestring;
            }
        }
    }
}

function timesup() {
            document.getElementById("timer_status").innerHTML = "";
            document.getElementById("timer_display").innerHTML = "Time's up!";
            if (isFullscreen) fullscreen(); //reset fullscreen;
            clearInterval(loop1);
            clearInterval(loop2);
            loop1 = null;
            loop2 = null;
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

async function sender_sync() { 
    if (temporal.distance > 0) {
        if (temporal.paused) {
            //do not emit TS signal on pause, from sender
            socket.emit("send viewer", "CMpause");
            socket.emit("send viewer", "CP" + document.getElementById("timer_display").innerText);
        } else {
            if (timetable.active) {
                //modified code, via server
                //sender_sync_timetable_data();
                timetable.TTdist = timetable.destinations[timetable.destinations.length-1] - Date.now();
                await db_sync_write_TT(self.uid);
                socket.emit("send viewer","TTdist");
            } else {
                //modified code, via server
                await db_sync_write(self.uid,temporal.distance);
                socket.emit("send viewer","TS");
            }
            socket.emit("send viewer", "CMduration" + temporal.duration);
        }
    } 
}

function sender_sync_timetable_data() {
    obj = JSON.stringify(timetable);
    if (initiated) socket.emit("send viewer","TTdata" + obj);
}

function receiver_sync(distance) {
    self.conn_failure = 0;
    document.getElementById("status").innerHTML = "Viewer: connected to host";
    console.log("receiver sync using TS");
    if (loop2 == null) start_stopwatch(distance);
}

function receiver_sync_TT(distance) {
    self.conn_failure = 0;
    document.getElementById("status").innerHTML = "Viewer: connected to host";
    console.log("receiver sync using TT distance");
    update_timetable(distance);
    if (timetable.current > -1) {
        dist2 = timetable.destinations[timetable.current] - Date.now();
        console.log("current is " + timetable.current + ", distance is " + dist2);
        if (loop2 == null) start_stopwatch(dist2);
    }
}

function receiver_pause() {
    pause_action();
}

function receiver_reset() {
    reset_action();
}

function receiver_parsecommand(param, tempfrom) {
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
        sender_displayusers();
    } else if (param.slice(0,8) == "duration") {
        temporal.duration = param.slice(8) * 1;
    }
}

async function request_sync() {
    console.log('request to sync via server');
    //old code
    //socket.emit("send data to host", {hostid: hostid, command: "SY"});
    //new code
    TSdist = await db_sync_read(hostid,"TS");
    console.log(TSdist);
    if (TSdist > -1) {
        temporal.distance = TSdist;
        temporal.destination = temporal.distance + Date.now();
        if (temporal.paused) temporal.paused = false;
        receiver_sync(temporal.distance);
        document.getElementById("page_receiver_msg").innerHTML = "Syncing";
    }
}
  

async function request_sync_TT() {
    console.log("request to sync timetable via server");
    tempStr = await db_sync_read(hostid, "TT");
    try {
        tempObj = JSON.parse(tempStr);
        timetable = {};
        timetable = tempObj;
        console.log(tempObj);
        if (temporal.paused) temporal.paused = false;
        receiver_sync_TT(timetable.TTdist);
        document.getElementById("page_receiver_msg").innerHTML = "Syncing";
    } catch (e) {
        console.log('possible TT string not JSON parsable');
    }
}

async function loadURL() {
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
            if (!initiated) {
                initiated = true;
                console.log("autoconnect URL " + inputString);
                hostid = inputString;
                result = await queryRoom(inputString.slice(0,3));
                if (result != "---") {
                    display_receiverlogin(inputString);    
                } else {
                    displayDialog("Error","<div style='padding:12px'>There is an error parsing the session code. Please contact the host for the correct link URL.</div>");
                }
            }
        }
    }
}

function display_receiverlogin(arg) {
    tempHTML = `
    <div style="padding:20px">
        <div style="text-align:center; padding:10px 0; font-size:0.75rem; font-weight:bold; background:#eee">Session: <span style="color:#198964">${arg}</span></div>
        <div>Enter a nickname to identify yourself:</div>
        <div>
            <input id="viewerID_logon">
        </div>
        <div id="error_logon" style="color:red;font-style:italic">
        </div>
        <div style="text-align:right">
            <a class="button invert" onclick="validate();" style="margin-right:0; margin:10px 0">LOGON</a>
        </div>
    </div>
    `;
    displayDialog("Welcome to CloudTimer.app", tempHTML, true);


}
    function validate() {
        tempNick = document.getElementById("viewerID_logon").value;
        self.nickname = tempNick;
        if (tempNick != "") {
            document.getElementById("error_logon").innerHTML = "";
            document.getElementById("viewerID").value = tempNick;
            init(2);
            init_receiver(hostid);
            hidemodal('modalDialog');
        } else {
            document.getElementById("error_logon").innerHTML = "Nickname cannot be empty";
        }
    }

function sharefunction2() {
    sharefunction(self.uid);
}

function copyfunction2(is_link) {
    copyfunction(self.uid,is_link);
}

async function sharefunction(param) {
    //receives user id
    url = "http://cloudtimer.app/?V=" + param;
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
        str = "http://cloudtimer.app/?V=" + param;    
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

function QRfunction(param) {
    str = "http://cloudtimer.app/?V=" + param;
    el0 = document.createElement("div");
    el0.appendChild(QRCode(str));
    displayDialog("QR Code", "<div style='text-align:center'>" + el0.innerHTML +"</div>");
}

function QRgen() {
    newsvg = QRCode({
        msg:"https://cloudtimer.app/?V=" + self.uid,
        dim:46,
        pal:["#ffffff"],
        pad:0
    });
    document.getElementById("idqr").innerHTML = "";
    document.getElementById("idqr").appendChild(newsvg);
}

function init_timetable(inputarray, inputdescription) {
    timetable.active = true;
    timetable.origin = Date.now();
    timetable.inputtimes = inputarray;
    timetable.descriptions = inputdescription;
    sum = 0;
    for (i=0; i<timetable.inputtimes.length; i++) {
        //translate input time into series of distances (not destinations. start_stopwatch will convert distance into destinations)
        timetable.durations[i] = timetable.inputtimes[i] * 60 * 1000; //(mins to ms)
        sum += timetable.durations[i];
        timetable.destinations[i] = timetable.origin + sum;
    }
    TTtableswitch(false);
    start_stopwatch(timetable.durations[0]);
    temporal.duration = timetable.durations[0];
}

function update_timetable(dist) {
    //receives parameter "dist" from the final destination
    offset = Date.now();
    //retrospectively fill the destinations from the last, backwards, till current
    timetable.destinations[timetable.destinations.length-1] = offset + dist;
    dur_sum = 0;
    for (i=timetable.destinations.length-1; i>=1; i--) {
        dur_sum += timetable.durations[i];
        timetable.destinations[i-1] = offset + dist - dur_sum;
    }
    timetable.current = timetable.destinations.findIndex((el)=>el>offset);
}

async function start_stopwatch(distance) {
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
            temporal.duration = dur;
            temporal.destination = dur + offset;
        } else {
            temporal.destination = distance + offset;
        }
        console.log(temporal.destination);
        
        display_timer();
        clearInterval(loop1);
        clearInterval(loop2);
        if (self.role == "host") loop1 = setInterval(periodic_sync,30000);
        loop2 = setInterval(display_timer,250);
    } else {
        pausedur = Date.now() - temporal.pausefrom;
        //split into two pathways
        if (timetable.active) {
            for (i=timetable.current; i<timetable.destinations.length; i++) {
                timetable.destinations[i] += pausedur;
            }
            temporal.duration = timetable.durations[timetable.current];
            temporal.destination = timetable.destinations[timetable.current];
            console.log("resume, current: " + timetable.current + "; destinations: " + timetable.destinations);
        } else {
            temporal.destination = temporal.destination + pausedur;
            console.log("resume; destination: " + temporal.destination);
        }
        display_timer();
        clearInterval(loop1);
        clearInterval(loop2);
        if (self.role == "host") loop1 = setInterval(periodic_sync,30000);
        loop2 = setInterval(display_timer,250);
        temporal.paused = false;
        temporal.pausefrom = 0;
    }
    if (mode == 0) {
        document.getElementById("select_timer").disabled = true;
        document.getElementById("startbutton1").style.display = "none";
        document.getElementById("TTshowbutton").style.display = "none";
        document.getElementById("startbutton2").style.display = "none";
        document.getElementById("pausebutton").style.display = "flex";
        document.getElementById("resetbutton").style.display = "flex";
        document.getElementById("fullscreenbutton").style.display = "flex";
        document.getElementById("div_label_input").style.display = "block";
        document.getElementById("div_label_output").style.display = "none";
        sender_label();
    }
    if (mode == 1) {
        document.getElementById("div_timer_controls_receiver").style.display = "flex";
        document.getElementById("div_label_input").style.display = "none";
        document.getElementById("div_label_output").style.display = "block";
    }
    //remote sync code
        if (self.role == "host") {
            if (timetable.active == false) {
                x = await db_sync_write(self.uid,temporal.distance);
                temporal.destination = Date.now() + x;
            } else {
                timetable.TTdist = timetable.destinations[timetable.destinations.length-1] - Date.now();
                await db_sync_write_TT(self.uid);
            }
            sender_sync();
        };
}

function pause_stopwatch() {
    pause_action();
}

function pause_action() {
    temporal.paused = true;
    temporal.pausefrom = Date.now();
    clearInterval(loop1);
    clearInterval(loop2);
    loop1 = null;
    loop2 = null;
    document.getElementById("timer_status").innerHTML = "Countdown is PAUSED.";
    document.getElementById("timer_status").classList.add("pause");
    document.getElementById("timer_display").classList.add("pause");
    if (mode == 0) {
        //document.getElementById("startbutton1").style.display = "inline-block";
        document.getElementById("startbutton2").style.display = "flex";
        document.getElementById("pausebutton").style.display = "none";
    }
    if (self.role == "host") {socket.emit("send viewer", "CMpause")};
}

function reset_stopwatch() {
    reset_action();
}

function reset_action() {
    temporal.paused = false;
    temporal.pausefrom = 0;
    temporal.distance = 0;
    time = 0;
    clearInterval(loop1);
    clearInterval(loop2);
    loop1 = null;
    loop2 = null;
    document.getElementById("timer_status").classList.remove("pause");
    document.getElementById("timer_display").classList.remove("pause");
    document.getElementById("timer_display").innerHTML = "";
    document.getElementById("timer_status").innerHTML = "Countdown is stopped.";   
    if (mode == 0) {
        document.getElementById("select_timer").disabled = false;
        document.getElementById("startbutton1").style.display = "flex";
        document.getElementById("startbutton2").style.display = "none";
        document.getElementById("TTshowbutton").style.display = "flex";
        document.getElementById("pausebutton").style.display = "none";
        document.getElementById("resetbutton").style.display = "none";
        document.getElementById("fullscreenbutton").style.display = "none";
    }
    if ((self.role == "host") && (timetable.active == true)) {
        TTtableswitch(true);
        TTtranslatedisplay();
        timetable.current = 0;
        timetable.prior = -1;
    }
    if (isFullscreen) fullscreen(); //reset fullscreen;
    timetable.active = false;
    if (self.role == "host") {
        socket.emit("send viewer", "CMreset");
    };
}

function testsend1() {
    count = count + 1;
    r_conn.send("MS"+"Hello world " + count);
}

function fullscreen() {
    if (!isFullscreen) {
        document.getElementById("status").style.display = "none";
        if (mode == 1) document.getElementById("page_receiver").style.display = "none";
        if (mode == 0) {
            document.getElementById("page_admin").style.display = "none";
            document.getElementById("page_admincontrols").style.display = "none";
        }
        //document.getElementById("page_msg").style.display = "none";
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
                if (mode == 0) document.getElementById("page_admincontrols").style.display = "block";
                document.getElementById("status").style.display = "block";
                //document.getElementById("page_msg").style.display = "block";
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
    if (receiver_check == null) receiver_check = setInterval(receiver_poll,30000);
}

function check_status() {
    tempIndex = users.findIndex(user => user.uid == hostid);
    if (tempIndex>-1) {
        self.conn_failure = 0;
        console.log("found");
        document.getElementById("status").innerHTML = "Viewer: connected to host";
    } else {
        self.conn_failure += 1;
        document.getElementById("status").innerHTML = "Viewer: trying to connect";
        if (self.conn_failure == 3) {
            document.getElementById("status").innerHTML = "Viewer: lost connection";
            document.getElementById("page_receiver_msg").innerHTML = "Disconnected";
            receiver_reset();
            document.getElementById("timer_status").innerHTML = "Please wait...";  
        }
        console.log("not found");
    }
}

function genID_obsolete(len) {
  //len can be 3 or 6. if 3, just gen numbers
  const characters1 = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const characters2 = '123456789';
  let result = '';
  const characters1Length = characters1.length;
  const characters2Length = characters2.length;
    if (len == 6) {
      for (let i = 0; i < 3; i++) {
        result += characters1.charAt(Math.floor(Math.random() * characters1Length));
      }
  }
  for (let i = 0; i < 3; i++) {
    result += characters2.charAt(Math.floor(Math.random() * characters2Length));
  }
  return result;
}

label_timeout = null;

function sender_label_debounce() {
    clearTimeout(label_timeout);
    label_timeout = setTimeout(sender_label,500);
}

function sender_label() {
    label = document.getElementById("label_input").value;
    socket.emit("send viewer", "LB" + label);
}

function sender_poll() {
    socket.emit("users list",self.uid.slice(0,3));
}

function receiver_poll() {
    //grab users list, when receive "users" will fire check_status
    socket.emit("users list",hostid.slice(0,3));
}

function sender_displayusers() {
    el1 = document.getElementById("div_userslist");
    el1.innerHTML = "";
    for (i=0;i<users.length;i++) {
        if (users[i].nickname == "") {
            tempname = "Anonymous";
        } else {
            tempname = users[i].nickname;
        }
        if (users[i].uid == self.uid) {
            //self, host
        } else {
            el2 = document.createElement("a");
            el2.setAttribute('class','button tinybutton');
            el2.setAttribute('id','userbox'+users[i].uid);
            el2.setAttribute('onclick','chatbox("' + users[i].uid +'")');
            el2.innerHTML = tempname;    
            el1.appendChild(el2);
        }
    }
    viewerCount = users.length-1;
    if (viewerCount > 0) {
        document.getElementById("status_count").innerHTML = viewerCount + " users online";
        document.getElementById("status").innerHTML = "HOST: connected to " + viewerCount + " users";    
    } else {
        document.getElementById("status_count").innerHTML = "";
        document.getElementById("status").innerHTML = "HOST: await connection";
    }
}

aliasTimeout = null;
function updatereceiverdata() {
    clearTimeout(aliasTimeout);
    aliasTimeout = setTimeout(function() {
        self.nickname = document.getElementById("viewerID").value;
        tempObj = {
            uid: self.uid,
            nickname: self.nickname,
            command: "ID",
            hostid: hostid,
            role: "viewer"
        };
        //socket.emit("send data to host", tempObj); - deprecated
        socket.emit("user update", tempObj);
        socket.emit("send data to host", {command:"JN",hostid: hostid});
    },1000);
}

function chatbox(paramId) {
    if (self.role == "host") {
        //check if there's a message list initiated, if not, create a message object for that user
        tempIndex2 = users.findIndex(user => user.uid == paramId);
        tempalias = users[tempIndex2].nickname;    
        tempIndex = usersMsg.findIndex(user => user.uid == paramId);
        if (tempIndex == -1) {
            //if not found, create a message list and push to usersMsg array
            usersMsg.push({ uid: paramId, messages: "" });
            tempIndex = usersMsg.length - 1;
        }
        messagelist = usersMsg[tempIndex].messages;    
        tempHTML = `
            <div class='chatbox_messages' data-uid='${paramId}'>${messagelist}</div>
            <div class='chatbox_input_outer'>
                <textarea class='chatbox_input' id='chatbox_input_msg${paramId}'></textarea>
                <a class='button invert right' id="chatbox_send" onclick='chatbox_sendmsg("${paramId}")'>Send</a>
            </div>
        `;
        displayDialog('Chat with ' + tempalias,tempHTML);
    } else {
        tempHTML = `
            <div class="chatbox_messages">${messages}</div>
            <div class='chatbox_input_outer'>
                <textarea class='chatbox_input' id='chatbox_input_msg'></textarea>
                <a class='button invert right' onclick='chatbox_sendmsg()'>Send</a>
            </div>
        `;
        displayDialog('Chat with host',tempHTML);
    }
    document.querySelector(".chatbox_messages").scrollTop = document.querySelector(".chatbox_messages").scrollHeight;
}

function chatbox_sendmsg(paramId) {
    dateobj = new Date();
    timestr = formattime(dateobj);
    if (self.role == "host") {
        //sender is host
        str = document.getElementById("chatbox_input_msg" + paramId).value;
        tempObj = {
            command: "MS",
            uid: paramId,
            msg: str
        };
        socket.emit("send data to viewer", tempObj);
            socket.emit("send data to viewer", "MS" + str);
            tempIndex = usersMsg.findIndex(user => user.uid == paramId);
            usersMsg[tempIndex].messages += `
                <div class="chatbox_chat_self">
                    <div class="chatbox_chat_head">
                        <span class="chatbox_author_self">Host</span>&nbsp;&bull;&nbsp;<span class="timestamp">${timestr}</span>
                    </div>
                    <div class="chatbox_chat_contents">${str}</div>
                </div>
            `;
        
        document.querySelector(".chatbox_messages").innerHTML = usersMsg[tempIndex].messages;    
        document.querySelector(".chatbox_messages").scrollTop = document.querySelector(".chatbox_messages").scrollHeight;
        document.getElementById("chatbox_input_msg" + paramId).value = "";    
    } else {
        //sender is viewer
        str = document.getElementById("chatbox_input_msg").value;
        //prepare object
        tempObj = {
            hostid: hostid,
            command: "MS",
            uid: self.uid,
            msg: str
        };
            tempalias = self.nickname;
            socket.emit("send data to host", tempObj);
            messages += `
                <div class="chatbox_chat_self">
                    <div class="chatbox_chat_head">
                        <span class="chatbox_author_self">${tempalias}</span>&nbsp;&bull;&nbsp;<span class="timestamp">${timestr}</span>
                    </div>
                    <div class="chatbox_chat_contents">${str}</div>
                </div>
            `;
        
        document.querySelector(".chatbox_messages").innerHTML = messages;
        document.querySelector(".chatbox_messages").scrollTop = document.querySelector(".chatbox_messages").scrollHeight;
        document.getElementById("chatbox_input_msg").value = "";    
    }
}

function formattime(param) {
        HH = (param.getHours() < 10) ? "0" + param.getHours() : param.getHours();
        MinMin = (param.getMinutes() < 10) ? "0" + param.getMinutes() : param.getMinutes();
        temp = HH + ":" + MinMin;
        return temp;
}

//HTML methods
const apiURL = 'https://oscetimer.app/queryroom';
const apiURL2 = 'https://oscetimer.app/genid';
const apiURL3 = 'https://oscetimer.app/db_sync_write';
const apiURL4 = 'https://oscetimer.app/db_sync_read';
const apiURL5 = 'https://oscetimer.app/db_sync_write_TT';
const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'text/plain'
    }
}

async function queryRoom(roomid) {
    try {
        text = "room-" + roomid;
        const response = await fetch(apiURL, {
            ...options,
            body: text
        })
        const responseData = await response.text(); //alternative, get response.json() for json object
        console.log(responseData);
        return responseData;
    } catch (error) {
        return -999;
    }
}

async function db_sync_write(uidentry,TSdist) {
    tempStr = uidentry + TSdist;
    try {
        const response = await fetch(apiURL3, {
            ...options,
            body: tempStr
        })
        const responseData = await response.text();
        return responseData * 1;
    } catch (error) {
        return -999;
    }
}

async function db_sync_read(uidentry,action) {
    tempStr = uidentry + action;
    try {
        const response = await fetch(apiURL4, {
            ...options,
            body: tempStr
        })
        const responseData = await response.text();
        if (action == "TS") {
            return responseData * 1;    
        } else if (action == "TT") {
            return responseData;
        }
    } catch (error) {
        return -999;
    }
}

async function db_sync_write_TT(uidentry) {
    tempStr = uidentry + JSON.stringify(timetable);
    try {
        const response = await fetch(apiURL5, {
            ...options,
            body: tempStr
        })
        const responseData = await response.text();
        return responseData * 1;
    } catch (error) {
        return -999;
    }
}

async function genID(len) {
    tempStr = "0";
    if (len==3) {
        tempStr = hostid.slice(0,3);
    }
    try {
        const response = await fetch(apiURL2, {
            ...options,
            body: tempStr
        })
        const responseData = await response.text();
        return responseData;
    } catch (error) {
        return -999;
    }
}
