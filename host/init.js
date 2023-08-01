let startPage;
let endPage;

let selectedWiki = "en";

function registerAutocomplete(input, datalist) {
	input.addEventListener("input", (event) => {
		let value = event.target.value;
		fetch(`https://${selectedWiki}.wikipedia.org/w/api.php?format=json&action=query&list=prefixsearch&pssearch=${value}`).then(async (response) => {
			datalist.innerHTML = "";
			let json = await response.json();
			json.query.prefixsearch.forEach((item) => {
				datalist.insertAdjacentHTML("beforeend", `<option value="${item.title}" wiki-id="${item.pageid}" />`);
			});
		});
	});
}

function validateDatalist(datalistId, inputId) {
	var option = document.querySelector("#" + datalistId + " option[value='" + document.getElementById(inputId).value + "']");
	if (option) return option.getAttribute("wiki-id");
	return null;
}

let startReady, endReady = false;
function setReady(page) {
	switch (page) {
		case "start": startReady = true; break;
		case "end": endReady = true; break;
	}
	if (startReady && endReady) {
		chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
			chrome.runtime.sendMessage({ type: "host_init", data: {
				startPage: startPage,
				endPage: endPage,
				username: document.getElementById("username").value,
				tabId: tab.id
			}});
		});
	}
}

function go() {
	let startValidation = validateDatalist("start-autocomplete", "start");
	if (!startValidation) {
		alert("Enter a valid start page value!");
		return;
	}
	let endValidation = validateDatalist("end-autocomplete", "end");
	if (!endValidation) {
		alert("Enter a valid end page value!");
		return;
	}
	fetch(`https://${selectedWiki}.wikipedia.org/w/api.php?action=query&pageids=${startValidation}&format=json&formatversion=2&prop=info&inprop=url`).then(async (response) => {
		let data = await response.json();
		startPage = data.query.pages[0];
		setReady("start");
	});
	fetch(`https://${selectedWiki}.wikipedia.org/w/api.php?action=query&pageids=${endValidation}&format=json&formatversion=2&prop=info&inprop=url`).then(async (response) => {
		let data = await response.json();
		endPage = data.query.pages[0];
		setReady("end");	
	});
}

document.getElementById("play").addEventListener("click", go);

registerAutocomplete(document.getElementById("start"), document.getElementById("start-autocomplete"));
registerAutocomplete(document.getElementById("end"), document.getElementById("end-autocomplete"));

let wikiSelect = document.getElementById("wiki");
allWikis.forEach((wiki) => {
	wikiSelect.insertAdjacentHTML("beforeend", `<option value=${wiki}> ${wiki} </option>`);
});
wikiSelect.addEventListener("change", () => { selectedWiki = wikiSelect.value; });

chrome.runtime.onMessage.addListener(({ type, _ }) => {
	switch (type) {
		case "gameCreated": {
			window.location.href = "waiting.html";
			break;
		}
	}
});