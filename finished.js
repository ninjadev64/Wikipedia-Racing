const leaderboard = document.getElementById("leaderboard");

function repopulateLeaderboard(players) {
	let p = [];
	for (const [name, data] of Object.entries(players)) {
		if (!data.endTime) continue;
		p.push({ name, ...data });
	}
	p.sort((a, b) => {
		return (a.endTime - a.startTime) - (b.endTime - b.startTime);
	});
	leaderboard.innerHTML = "";
	p.forEach((player) => {
		let l = document.createElement("li");
		l.innerHTML = `${((player.endTime - player.startTime) / 1000).toFixed(1)}s:<b> ${player.name} </b>`;
		leaderboard.appendChild(l);
	});
}

chrome.runtime.sendMessage({ type: "gameInfoRequest" });

chrome.runtime.onMessage.addListener(({ type, data }) => {
	switch (type) {
		case "gameInfoResponse": {
			document.getElementById("id").innerHTML = `<b> ID: </b>${data.id} `;
			document.getElementById("startPage").innerHTML = `<b> Start page: </b>${data.globalData.startPage.title} `;
			document.getElementById("endPage").innerHTML = `<b> End page: </b>${data.globalData.endPage.title} `;
			repopulateLeaderboard(data.players);
			break;
		}
		case "playerFinished": {
			repopulateLeaderboard(data.allPlayers);
			break;
		}
		case "gameFinished": {
			console.log("noot");
			let p = document.createElement("p");
			let a = document.createElement("a");
			a.href = "popup_main.html";
			a.innerText = "Play again";
			p.appendChild(a);
			document.body.appendChild(p);
			break;
		}
	}
});