chrome.runtime.sendMessage({ type: "game_info_request" });

chrome.runtime.onMessage.addListener(({ type, data }) => {
	switch (type) {
		case "game_info_response": {
			document.getElementById("id").innerHTML = `<b> ID: </b>${data.id} `;
			document.getElementById("startPage").innerHTML = `<b> Start page: </b>${data.globalData.startPage.title} `;
			document.getElementById("endPage").innerHTML = `<b> End page: </b>${data.globalData.endPage.title} `;
			break;
		}
	}
});