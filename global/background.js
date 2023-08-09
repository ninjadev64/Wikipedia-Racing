import * as playon from "https://ninjadev64.github.io/PlayOn/playon.js";
import firebaseConfig from "./assets/firebaseConfig.js";
playon.init(firebaseConfig);

clients.matchAll().then((clients) => {
	let d = true;
	for (const client of clients) {
		if (client.url == "global/offscreen.html") d = false;
	}
	if (d) {
		chrome.offscreen.createDocument({
			url: "global/offscreen.html",
			reasons: [ "WORKERS" ],
			justification: "Service worker keepalive workaround"
		});
	}
});

let currentGame;
let gameTabId;
let visitedPages = {};

function leaveGame() {
	if (currentGame) try {
		currentGame.updatePlayerData({ hasLeftGame: true });
		currentGame.leave();
	} catch {}
	visitedPages = {};
}

const wikipediaRegex = /^(?:https?:\/\/)?(?:[^.]+\.)?wikipedia\.org(\/.*)?$/;
const wikiPageRegex = /^https?:\/\/?.*\.wikipedia\.org\/wiki\/([^\/|#|\?]+).*$/;
const extensionRegex = /^chrome-extension:\/+.{32}\/.*$/;

let showErrorMessage = false;

function globalDataUpdated(data) {
	switch (data.gameState) {
		case "playing": {
			chrome.tabs.update(gameTabId, { url: data.startPage.url });
			currentGame.updatePlayerData({ startTime: new Date().getTime() });
			chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
				if (tabId != gameTabId) return;
				if (!changeInfo.url) return;
				let matches = wikiPageRegex.exec(changeInfo.url);
				if (matches) {
					if (decodeURIComponent(matches[1]) == data.endPage.equatable) {
						currentGame.updatePlayerData({ endTime: new Date().getTime() });
						chrome.tabs.update(gameTabId, { url: `chrome-extension://${chrome.runtime.id}/global/finished.html` });
					}
					visitedPages[decodeURIComponent(matches[1])] = true;
					currentGame.updatePlayerData({ visitedPages });
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
				leaveGame();
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
			leaveGame();
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
					leaveGame();
					currentGame = game;
					currentGame.updateGlobalData({
						gameState: "waiting",
						startPage: { url: data.startPage.fullurl, title: data.startPage.title },
						endPage: { url: data.endPage.fullurl, title: data.endPage.title, equatable: decodeURIComponent(wikiPageRegex.exec(data.endPage.fullurl)[1]) }
					});
					currentGame.on("globalDataUpdated", globalDataUpdated);
					chrome.runtime.sendMessage({ type: "gameCreated", data: { id } });
				});
			});
			break;
		}
		case "host_start": {
			currentGame.on("playerUpdated", (name, data) => {
				if (Object.values(currentGame.players).every(p => p.hasOwnProperty("endTime") || p.hasOwnProperty("hasLeftGame"))) {
					currentGame.updateGlobalData({ gameState: "finished" });
				}
			});
			currentGame.updateGlobalData({ gameState: "playing" });
			break;
		}
		case "client_init": {
			gameTabId = data.tabId;
			try {
				playon.joinGame(data.id, data.username, {}).then((game) => {
					leaveGame();
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
		case "service_worker_keepalive": {
			console.debug("Keepalive ping received");
			break;
		}
	}
});