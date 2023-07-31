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
let gameTabId;

const wikipediaRegex = /^(?:https?:\/\/)?(?:[^.]+\.)?wikipedia\.org(\/.*)?$/;
const extensionRegex = /chrome-extension:\/+.{32}\/.*/;

let goingBack = false;

function globalDataUpdated(data) {
	switch (data.gameState) {
		case "playing": {
			chrome.tabs.update(gameTabId, { url: data.startPage.url });
			currentGame.updatePlayerData({ startTime: new Date().getTime() });
			chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
				if (tabId != gameTabId) return;
				if (changeInfo.url == data.endPage.url) {
					currentGame.updatePlayerData({ endTime: new Date().getTime() });
					chrome.tabs.update(gameTabId, { url: `chrome-extension://${chrome.runtime.id}/global/finished.html` });
				}
				if (changeInfo.url && !wikipediaRegex.test(changeInfo.url) && !extensionRegex.test(changeInfo.url)) {
					goingBack = true;
					chrome.tabs.goBack(gameTabId);
				} else if (goingBack) {
					chrome.scripting.executeScript({
						target: { tabId: gameTabId },
						files: [ "global/injection.js" ]
					});
					goingBack = false;
				}
			});
			currentGame.on("playerUpdated", (name, data) => {
				if (data.endTime) {
					chrome.runtime.sendMessage({ type: "playerFinished", data: { name, allPlayers: currentGame.players }}).catch(() => {});
				}
			});
			break;
		}
		case "finished": {
			chrome.runtime.sendMessage({ type: "gameFinished" });
			currentGame.leave();
			currentGame = undefined;
			break;
		}
	}
}

chrome.runtime.onMessage.addListener(({ type, data }) => {
	switch (type) {
		case "host_init": {
			gameTabId = data.tabId;
			playon.createGame().then((id) => {
				playon.joinGame(id, data.username, {}).then((game) => {
					try { if (currentGame) currentGame.leave(); } catch {}
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
			let inProgress = Object.keys(currentGame.players);
			currentGame.on("playerUpdated", (name, data) => {
				if (data.endTime) {
					inProgress = inProgress.filter((n) => { return n != name; });
					if (inProgress.length == 0) {
						currentGame.updateGlobalData({ gameState: "finished" });
					}
				}
			});
			currentGame.updateGlobalData({ gameState: "playing" });
			break;
		}
		case "client_init": {
			gameTabId = data.tabId;
			try {
				playon.joinGame(data.id, data.username, {}).then((game) => {
					try { if (currentGame) currentGame.leave(); } catch {}
					currentGame = game;
					currentGame.on("globalDataUpdated", globalDataUpdated);
					chrome.runtime.sendMessage({ type: "gameJoined", data: { id: currentGame.id } });
				});
			} catch (e) {
				chrome.runtime.sendMessage({ type: "error", data: { error: e.message }});
			}
			break;
		}
		case "game_info_request": {
			chrome.runtime.sendMessage({ type: "game_info_response", data: { id: currentGame.id, globalData: currentGame.globalData, players: currentGame.players }});
			break;
		}
	}
});