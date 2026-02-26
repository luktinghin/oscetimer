var AO = {};

//disable sticky hover on iOS
colIB = document.querySelectorAll(".iconbutton");
for (colc = 0; colc<colIB.length; colc++) {
	colIB[colc].addEventListener("touchstart", function(){}, true);
}
console.log(colIB.length);

function displayAbout() {
	// abbrev : dc = dialog content
	aboutHTML = `
	<div style="padding:10px">
		<div class="dc-heading">CloudTimer.app</div>
		<div class="dc-para">
			Created by Terence Luk & Eric Ng, since 2025
			<br>Version 1.0
		</div>
		<div class="dc-heading">Instruction manual</div>
		<div class="dc-subheading">Basics</div>
		<div class="dc-para">In the Cloud timer app, the HOST controls a timer session, and the VIEWERS connect to the timer session via a link or a host ID code. If there are multiple viewers, the host should provide the link or the ID code to all of them. If the connection is successful, the viewers will automatically appear in the User Management section on the host's app.
		</div>
		<div class="dc-para">The host can define the duration of the timer. The host can start, pause, or reset a timer. These changes will be simultaneously synchronized on all the viewers' screens.
		</div>
		<div class="dc-para">The technology stack is based on a Node.js server with a Socket.IO implementation with broad support over a wide range of devices and browsers.
		</div>
		<div class="dc-subheading">Connecting to a timer session</div>
		<div class="dc-para">
			HOST: as the host, you can start by labelling your timer (Step 1). This label will be displayed on the timers of all connected users. Then, you should use your assigned session ID to identify your timer session across the network, so users can be connected to you (Step 2). You can either provide your users with the link (clicking on the shared link will automatically load the viewer page for this timer session), or the session ID (which your users can enter manually in their viewer page while accessing the Cloud timer app).
		</div>
		<div class="dc-para">
			VIEWER: as a viewer, you can connect to the HOST's timer session by two methods. (1) You may be provided with a link, once you open the link you will be taken to the timer session page. (2) You may be provided with a host ID code, which you can enter (or paste) into the host ID entry field. Click "Submit" to connect to the timer session.
		</div>
		<div class="dc-heading">Features</div>
		<div class="dc-para">CloudTimer mainly functions as as basic timer, connected to multiple users via a Socket.IO connection. The additional features are explained below.
		</div>
		<div class="dc-subheading">Quick chat</div>
		<div class="dc-para">Direct messaging instantly between the host and an individual viewer is possible. (Host) Click on the viewer's user name to activate the chat box. (Viewer) Click on the Chat button to activate the chat box.
		</div>
		<div class="dc-para">For the viewer, the last message sent by the host will appear beneath the timer for easy access. For example, a use-case scenario would be: a host providing the candidate's number via quick chat and this information is automatically displayed when the viewer is notified of this new message.
		</div>
		<div class="dc-subheading">Fullscreen</div>
		<div class="dc-para">On supported devices, clicking on the "Fullscreen" button will activate the fullscreen mode, which hides other control buttons, to allow bigger timer display.
		</div>
		<div class="dc-subheading">User statistics</div>
		<div class="dc-para">Total sessions created: ${userStat[0]}. Total user count: ${userStat[1]}. Active connections: ${userStat[2]}.
		</div>
	</div>
	`;
	displayDialog("About",aboutHTML);
}

function TTaddrow() {
	param = timetableinput.length;
	if (timetableinput.length == 0) document.getElementById("TTinputarea").innerHTML = "";
	document.getElementById("TTinputarea").appendChild(TTinput(param));
}

function TTinput(param) {
	param1 = param+1;
	El0 = document.createElement("div");
	El0.setAttribute('class','TTrow reduced');
	El0.setAttribute('id','TTinputrow' + param);
	El0.innerHTML = TTrowtemplate(param);
	timetableinput[param] = new Array();
	return El0;	
}

function TTrowtemplate(param) {
	return `
			<div class="TTcol1"><div id="TTinputcount${param}" class="TTinputcount">${param1}</div></div>
			<div class="TTcol2">
				<select id="TTinputtime${param}" class="TTinputselect reduced">
						<option value="1">1min</option>
						<option value="2">2min</option>
						<option value="3">3min</option>
						<option value="4">4min</option>
						<option value="5">5min</option>
						<option value="6">6min</option>
						<option value="7">7min</option>
						<option value="8">8min</option>
						<option value="9">9min</option>
						<option value="10" selected>10min</option>
						<option value="15">15min</option>
						<option value="20">20min</option>
						<option value="25">25min</option>
						<option value="30">30min</option>
						<option value="35">35min</option>
						<option value="40">40min</option>
						<option value="45">45min</option>
						<option value="50">50min</option>
						<option value="55">55min</option>
						<option value="60">60min</option>
				</select>
			</div>
			<div class="TTcol3">
				<input id="TTinputname${param}" class="TTinputname reduced" placeholder="Describe this step...">
			</div>
			<div class="TTcol4">
					<a class="TTcirclebutton" id="TTbtnup${param}" onclick="TTup(${param})"><i class="fas fa-chevron-circle-up"></i></a>
					<a class="TTcirclebutton" id="TTbtndownb${param}" onclick="TTdown(${param})"><i class="fas fa-chevron-circle-down"></i></a>
					<a class="TTcirclebutton" id="TTbtndel${param}" onclick="TTdelete(${param})"><i class="fas fa-times-circle"></i></a>
			</div>	`
}

function TTviewertoggle() {
	tempstate = document.getElementById("page_receiver_timetable_inner").classList.contains("show");
	if (tempstate) {
		//hides the timetable
		document.getElementById("page_receiver_timetable_inner").classList.remove("show");
		document.getElementById("TTviewerbtn").innerHTML = "Show schedule";
	} else {
		//refreshes the timetable display
		TTviewerdisplay();
		//shows the timetable
		document.getElementById("page_receiver_timetable_inner").classList.add("show");
		document.getElementById("TTviewerbtn").innerHTML = "Hide schedule";
	}
}

function TTviewerrender() {
	//returns HTML 
	rows = "";
	for (cc=0;cc<timetable.durations.length;cc++) {
		count = cc+1;
		dur = timetable.durations[cc] / 60 / 1000;
		desc = timetable.descriptions[cc];
		rows += `
			<div class="TTviewerrow" id="TTviewerrow${count}">
				<div class="TTviewercol1"><div class="TTviewercount">${count}</div></div>
				<div class="TTviewercol2">${dur}min</div>
				<div class="TTviewercol3">${desc}</div>
			</div>
		`;
	};
	return rows;
}

function TTviewerdisplay() {
	tempHTML = TTviewerrender();
	document.getElementById("page_receiver_timetable_inner").innerHTML = tempHTML;
}

function TTaddnewplaceholder() {
	return `
		<div style='padding: 12px'>
			<div class='reduced' style='padding:12px; border-radius: 2rem; border:2px solid #555; font-weight:bold; font-style:italic; background-image: linear-gradient(to bottom, #555 0%, #303030 100%)'>
				Add a new row to begin.
			</div>
			</div>
		</div>
	`;
}

function TTshow() {
	El = document.getElementById("page_TT");
	El1 = document.getElementById("div_start");
	if (El.style.display == "none") {
		El.style.display = "block";
		El1.style.display = "none";
		timetable.active = true;
		if (timetableinput.length == 0) {
			El2 = document.getElementById("TTinputarea");
			El2.innerHTML = TTaddnewplaceholder();
		}
	} else {
		El.style.display = "none";
		El1.style.display = "block";
		timetable.active = false;
	}
}

function TTtableswitch(bool) {
	if (bool) {
		document.getElementById("TTinputareatitle").innerHTML = "Edit timetable details";
		document.getElementById('TTinputarea0').classList.remove("inverse");
	} else {
		document.getElementById("TTinputareatitle").innerHTML = "";
		document.getElementById('TTinputarea0').classList.add("inverse");
	}
	Els1 = document.querySelectorAll(".TTinputname");
	Els2 = document.querySelectorAll(".TTinputselect");
	Els = [...Els1, ...Els2];
	Els.forEach(El => {
		El.disabled = !bool;
	})	
	Els3 = document.querySelectorAll(".TTcirclebutton");
	if (!bool) {
		Els3.forEach(El => {
			El.style.display = "none";
		})		
	} else {
		Els3.forEach(El => {
			El.style.display = "inline-block";
		})		
	}
	Els4 = document.querySelectorAll("#page_TT .tinybutton");
	if (!bool) {
		Els4.forEach(El => {
			El.style.display = "none";
		})
	} else {
		Els4.forEach(El => {
			El.style.display = "inline-block";
		})
	}
}

function TTtranslate() {
	//this converts the input HTML form to the array
	len = timetableinput.length;
	timetableinput.length = 0;
	for (i=0; i<len; i++) {
		timetableinput.push([document.getElementById("TTinputtime" + i).value * 1,document.getElementById("TTinputname" + i).value]);
	}
}

function TTtranslatedisplay(isViewer) {
	//this converts the array back to input HTML form
	if (isViewer == undefined) {
		El1 = document.getElementById("TTinputarea");
		El1.innerHTML = "";
		for (param=0; param<timetableinput.length; param++) {
			param1 = param+1;
			El0 = document.createElement("div");
			El0.setAttribute('class','TTrow');
			El0.setAttribute('id','TTinputrow' + param);
			El0.innerHTML = TTrowtemplate(param);
			El1.appendChild(El0)
		}
		for (i=0; i<timetableinput.length; i++) {
			document.getElementById("TTinputtime" + i).value = timetableinput[i][0];
			document.getElementById("TTinputname" + i).value = timetableinput[i][1];
		}
	}
}

function TTup(index) {
	TTtranslate();
	if (index == 0) {
		displayDialog("Message","<div style='padding:10px'>This action is not allowed.</div>");
	} else {
		[timetableinput[index],timetableinput[index-1]] = [timetableinput[index-1],timetableinput[index]];
	}
	TTtranslatedisplay();
}

function TTdown(index) {
	TTtranslate();
	if (index>=0 && index<timetableinput.length-1) {
		[timetableinput[index],timetableinput[index+1]] = [timetableinput[index+1],timetableinput[index]];
	} else {
		displayDialog("Message","<div style='padding:12px'>This action is not allowed.</div>");
	}
	TTtranslatedisplay();
}

function TTdelete(index) {
	TTtranslate();
	if ((index==0) && (timetableinput.length == 1)) {
		displayDialog("Message","<div style='padding:12px'>Sorry, cannot delete only item</div>");
	} else {
		timetableinput.splice(index,1);	
	}
	TTtranslatedisplay();
}

function TTduplicate() {
	TTtranslate();
	length = timetableinput.length;
	genoptionHTML = "";
	for (i=0; i<length; i++) {
		j = i+1;
		genoptionHTML += `<option value="${j}">${j}</option>`;
	}
	tempHTML = `
	<div style='padding:12px'>
	<div>
		Duplicate one or more row entries easily.
		<table style="width:100%; padding:30px 0">
		<tr><td style='width:65%'>Duplicate from row number: </td><td><select id='TTdupfrom' style='width:45px;color:black;background:#ddd'>${genoptionHTML}</select></td></tr>
		<tr><td style='width:65%'>To row number: </td><td><select id='TTdupto' style='width:45px;color:black;background:#ddd'>${genoptionHTML}</select></td></tr>
		<tr><td style='width:65%'>For how many times? </td><td style="line-height:32px"><select id='TTduptimes' style='width:45px;color:black;background:#ddd'><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option></select> &nbsp;times</td></tr>
		</table>
	<div>
	<div style="padding:0px 0px 20px; color:red; font-style:italic" id="dupmsg"></div>
	<div>
		<a class="button invert" onclick="TTdupsubmit()">Submit</a>
		<a class="button" onclick="hidemodal('modalDialog')">Cancel</a>
	</div>
	</div>
	`;
	displayDialog("Duplicate entries",tempHTML);
}

function TTdupsubmit() {
	a = document.getElementById("TTdupfrom").value - 1;
	b = document.getElementById("TTdupto").value - 1;
	z = document.getElementById("TTduptimes").value * 1;
	if (TTdupvalidate(a,b,z) == "") {
		x = new Array();
		console.log(a,b,z);
		for (j=a; j<=b; j++) {
			x.push(timetableinput[j]);
		}
		console.log(x);
		for (i=0; i<z; i++) {
			timetableinput = timetableinput.concat(x);
		}
		TTtranslatedisplay();
		hidemodal('modalDialog');
	} else {
		document.getElementById("dupmsg").innerHTML = str;
	}
}

function TTdupvalidate(a,b,z) {
	str = "";
	if (b<a) {
		str += "Invalid entry. The 'to' field needs to be equal to or greater than the 'from' field. <br>";
	} 
	return str;
}

function TTgo() {
	//pop array and write to array
	TTtranslate();
	array1 = new Array();
	array2 = new Array();
	for (i=0; i<timetableinput.length; i++) {
		array1[i] = timetableinput[i][0];
		array2[i] = timetableinput[i][1];
	}
	init_timetable(array1,array2);
}

// -- custom analytics object --

AOinit();

async function AOinit() {
	uuid = localStorage.getItem('uuid');
	if (uuid) {
		console.log("uuid found " + uuid);
		AO.uuid = uuid;
	} else {
		uuid = genUUID();
		localStorage.setItem('uuid',uuid);
		AO.uuid = uuid;
		console.log("uuid not found, create: ");
	}
	dbresult = await db_AO(AO.uuid,"visit",0);
	console.log("AO db result: " + dbresult);
}

async function AOevent(param2, param3) {
	dbresult = await db_AO(AO.uuid,param2,param3);
	console.log("AO db result: " + dbresult);
}

function genUUID() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
  let result = '';
  const charactersLength = characters.length;
      for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
  return result;
}