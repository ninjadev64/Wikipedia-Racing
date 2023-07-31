document.getElementById("join").addEventListener("click", () => {
	chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
		chrome.runtime.sendMessage({ type: "client_init", data: {
			id: parseInt(document.getElementById("id").value),
			username: document.getElementById("username").value,
			tabId: tab.id
		}});
	});
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