chrome.runtime.onMessage.addListener((message) => {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.url == message) {
            console.log("winny yay");
        }
    });
});