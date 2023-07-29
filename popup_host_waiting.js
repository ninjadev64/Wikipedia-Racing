chrome.runtime.sendMessage({ type: "gameInfoRequest" });

chrome.runtime.onMessage.addListener(({ type, data }) => {
	switch (type) {
		case "gameInfoResponse": {
			document.getElementById("id").innerHTML = `<b> ID: </b>${data.id} `;
			document.getElementById("startPage").innerHTML = `<b> Start page: </b>${data.globalData.startPage.title} `;
			document.getElementById("endPage").innerHTML = `<b> End page: </b>${data.globalData.endPage.title} `;
			break;
		}
	}
});

document.getElementById("start").addEventListener("click", () => {
	chrome.runtime.sendMessage({ type: "host_start" });
});