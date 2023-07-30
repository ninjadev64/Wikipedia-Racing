document.getElementById("join").addEventListener("click", () => {
	chrome.runtime.sendMessage({ type: "client_init", data: { id: parseInt(document.getElementById("id").value), username: document.getElementById("username").value }});
});

chrome.runtime.onMessage.addListener(({ type, data }) => {
	switch (type) {
		case "error": {
			alert(`Error: ${data}`);
			break;
		}
		case "gameJoined": {
			window.location.href = "waiting.html";
			break;
		}
	}
});