setInterval(() => {
	chrome.runtime.sendMessage({ "type": "service_worker_keepalive" });
}, 25e3);