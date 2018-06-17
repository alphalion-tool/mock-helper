var mocked = {},
    localUrl = '',
    mockUrl = '';


function localLoad () {
    chrome.storage.local.get({ mocked: {}, localUrl: '', mockUrl: '' }, function(items) {
        if (items.mocked) mocked = items.mocked;
        localUrl = items.localUrl;
        mockUrl = items.mockUrl;
    });
}

localLoad();

chrome.storage.onChanged.addListener(function(changes, namespace) {
    localLoad();
});

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {

    if (!localUrl || !mockUrl) return;
    if (!details.url.startsWith(localUrl)) return;
    const method = details.method.toLowerCase();
    const path = details.url.replace(localUrl, '');
    const key = method + '-' + path;
    let otherKey = key;
    if (path.match(/\/[\d]+/)) {
        otherKey = method + '-' + path.replace(/(\/[\d]+)/, '/\\d+');
    }
    const newHeaders = details.requestHeaders;
    if (mocked[key] || mocked[otherKey]) {
        newHeaders.push({
            name: '__MOCK__SERVER__',
            value: mockUrl
        });
        console.log('need proxy', path);
    }
    return {
        requestHeaders: newHeaders
    };

    return details;
}, { //Filter
    urls: ["<all_urls>"], //For all
},["requestHeaders", "blocking"]);
