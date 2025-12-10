function displayAbout() {
	// abbrev : dc = dialog content
	aboutHTML = `
	<div style="padding:10px">
		<div class="dc-heading">OSCEtimer.app</div>
		<div class="dc-para">
			Created by Terence Luk & Eric Ng, since 2025.
		</div>
		<div class="dc-heading">Instruction manual</div>
		<div class="dc-subheading">Basics</div>
		<div class="dc-para">In the OSCE timer app, the HOST controls a timer session, and the VIEWERS connect to the timer session via a link or a host ID code. If there are multiple viewers, the host should provide the link or the ID code to all of them. If the connection is successful, the viewers will automatically appear in the User Management section on the host's app.
		</div>
		<div class="dc-para">The host can define the duration of the timer. The host can start, pause, or reset a timer. These changes will be simultaneously synchronized on all the viewers' screens.
		</div>
		<div class="dc-para">The app has been tested on Chrome browser on computers and mobile devices. The app is not guaranteed to work if you use other browsers, as it typically fails on Safari browsers on iOS devices. This is a known issue. This is due to the usage of peerJS and underlying WebRTC technology which has limited support on iOS devices. You can use the Chrome browser on Apple devices to try and connect to the app. Also, on some networks behind a firewall, the app may not work.
		</div>
		<div class="dc-subheading">Connecting to a timer session</div>
		<div class="dc-para">
			HOST: as the host, you can start by labelling your timer (Step 1). This label will be displayed on the timers of all connected users. Then, you should use your assigned session ID to identify your timer session across the network, so users can be connected to you (Step 2). You can either provide your users with the link (clicking on the shared link will automatically load the viewer page for this timer session), or the session ID (which your users can enter manually in their viewer page while accessing the OSCE timer app).
		</div>
		<div class="dc-para">
			VIEWER: as a viewer, you can connect to the HOST's timer session by two methods. (1) You may be provided with a link, once you open the link you will be taken to the timer session page. (2) You may be provided with a host ID code, which you can enter (or paste) into the host ID entry field. Click "Submit" to connect to the timer session.
		</div>
		<div class="dc-heading">Features</div>
		<div class="dc-para">OSCEtimer mainly functions as as basic timer, connected to multiple users across a peer-to-peer connection network. The additional features are explained below.
		</div>
		<div class="dc-subheading">Quick chat</div>
		<div class="dc-para">Direct messaging instantly between the host and an individual viewer is possible. (Host) Click on the viewer's user name to activate the chat box. (Viewer) Click on the Chat button to activate the chat box.
		</div>
		<div class="dc-para">For the viewer, the last message sent by the host will appear beneath the timer for easy access. For example, a use-case scenario would be: a host providing the candidate's number via quick chat and this information is automatically displayed when the viewer is notified of this new message.
		</div>
		<div class="dc-subheading">Fullscreen</div>
		<div class="dc-para">On supported devices, clicking on the "Fullscreen" button will activate the fullscreen mode, which hides other control buttons, to allow bigger timer display.
		</div>
	</div>
	`;
	displayDialog("About",aboutHTML);
}