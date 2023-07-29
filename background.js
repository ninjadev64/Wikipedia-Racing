import * as playon from "https://ninjadev64.github.io/PlayOn/playon.js";
playon.init({
	apiKey: "AIzaSyDaajVVLcvdHzymdORjYJs_g-aIuq40RDs",
	authDomain: "wikipedia-racing.firebaseapp.com",
	databaseURL: "https://wikipedia-racing-default-rtdb.europe-west1.firebasedatabase.app",
	projectId: "wikipedia-racing",
	storageBucket: "wikipedia-racing.appspot.com",
	messagingSenderId: "1092381601552",
	appId: "1:1092381601552:web:ed125e0a6c8c95804e7f95"
});

let currentGame;

function globalDataUpdated(data) {
	if (data.gameState != "playing") return;
	chrome.tabs.update({ url: data.startPage.url });
	chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		if (changeInfo.url == data.endPage.url) {
			chrome.tabs.update({ url: `chrome-extension://${chrome.runtime.id}/win.html` });
		}
	});
}

chrome.runtime.onMessage.addListener(({ type, data }) => {
	switch (type) {
		case "host_init": {
			playon.createGame().then((id) => {
				playon.joinGame(id, data.username, {}).then((game) => {
					currentGame = game;
					currentGame.updateGlobalData({
						gameState: "waiting",
						startPage: { url: data.startPage.fullurl, title: data.startPage.title },
						endPage: { url: data.endPage.fullurl, title: data.endPage.title }
					});
					currentGame.on("globalDataUpdated", globalDataUpdated);
					chrome.runtime.sendMessage({ type: "gameCreated", data: { id } });
				});
			});
			break;
		}
		case "host_start": {
			currentGame.updateGlobalData({ gameState: "playing" });
			break;
		}
		case "client_init": {
			try {
				playon.joinGame(data.id, data.username, {}).then((game) => {
					currentGame = game;
					currentGame.on("globalDataUpdated", globalDataUpdated);
					chrome.runtime.sendMessage({ type: "gameJoined", data: { id: currentGame.id } });
				});
			} catch (e) {
				chrome.runtime.sendMessage({ type: "error", data: { error: e.message }});
			}
			break;
		}
		case "gameInfoRequest": {
			chrome.runtime.sendMessage({ type: "gameInfoResponse", data: { id: currentGame.id, globalData: currentGame.globalData }});
			break;
		}
	}
});