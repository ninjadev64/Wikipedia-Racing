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

let showErrorMessage = false;

function globalDataUpdated(data) {
	switch (data.gameState) {
		case "playing": {
			chrome.tabs.update(gameTabId, { url: data.startPage.url });
			currentGame.updatePlayerData({ startTime: new Date().getTime() });
			chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
				if (tabId != gameTabId) return;
				if (!changeInfo.url) return;
				if (changeInfo.url == data.endPage.url) {
					currentGame.updatePlayerData({ endTime: new Date().getTime() });
					chrome.tabs.update(gameTabId, { url: `chrome-extension://${chrome.runtime.id}/global/finished.html` });
				}
				if (wikipediaRegex.test(changeInfo.url)) {
					chrome.scripting.executeScript({
						target: { tabId: gameTabId },
						world: "MAIN",
						func: () => {
							document.getElementById("searchform").style.setProperty("display", "none", "important");
						}
					});
					if (showErrorMessage) {
						chrome.scripting.executeScript({
							target: { tabId: gameTabId },
							world: "MAIN",
							func: () => {
								let n = document.createElement("div");
								n.style = `
									position: fixed;
									top: 20px;
									width: fit-content;
									left: 0;
									right: 0;
									margin: 0 auto;
									padding: 15px;
									border-radius: 10px;
									background-color: #fd3d3d;
									color: #eeeeee;
									transition: opacity 1s;
								`;
								n.innerText = "You can't do that!";
								document.body.appendChild(n);
								setTimeout(() => { n.style.setProperty("opacity", "0"); }, 1500);
								setTimeout(() => { n.remove(); }, 3000);
							}
						});
						showErrorMessage = false;
					}
				} else if (!extensionRegex.test(changeInfo.url)) {
					showErrorMessage = true;
					chrome.tabs.goBack(gameTabId);
				}
			});
			chrome.tabs.onRemoved.addListener((tabId, _) => {
				if (tabId != gameTabId) return;
				currentGame.updatePlayerData({ hasLeftGame: true });
				currentGame.leave();
				currentGame = undefined;
			});
			currentGame.on("playerUpdated", (name, data) => {
				if (data.endTime && !data.hasLeftGame) {
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
				if (data.endTime || data.hasLeftGame) {
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