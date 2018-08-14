var mocked = {},  // 是否进行mocked的判断，结构为 { 'path': bool }
    localUrl = '',  // 本地需要拦截的链接
    mockServerUrl = '',  // 远程mock-server
    fileRootPath = '',
    fileMocked = {}, // 本地获取文件, 结构为 { 'path': { mocked: bool, file: 'xxx' } }
    dataFrom = ''; // 数据来源是filesystem还是mockserver


// 加载数据
function localLoad () {
    chrome.storage.local.get({ mocked: {}, localUrl: '', mockServerUrl: '', fileRootPath: '', fileMocked: {},  dataFrom: 'filesystem' }, function(items) {
        console.log('storage loaded', items);
        if (items.mocked) mocked = items.mocked;
        fileMocked = items.fileMocked;
        localUrl = items.localUrl;
        mockServerUrl = items.mockServerUrl;
        fileRootPath = items.fileRootPath;
        dataFrom = items.dataFrom;
    });
}

localLoad();

chrome.storage.onChanged.addListener(function(changes, namespace) {
    console.log('storage changed');
    localLoad();
});

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {

    if (!localUrl) return;
    if (!details.url.startsWith(localUrl)) return;
    const method = details.method.toLowerCase();
    const path = details.url.replace(localUrl, '').split('?')[0];
    const key = method + '-' + path;
    let otherKey = key;
    if (path.match(/\/[\d]+/)) {
        otherKey = method + '-' + path.replace(/(\/[\d]+)/, '/\\d+');
    }
    const newHeaders = details.requestHeaders;
    
    // 本地文件
    if (dataFrom === 'filesystem') {
        let fileUrl = '';
        if (fileMocked[key] && fileMocked[key].mocked) fileUrl = fileMocked[key].file;
        if (fileMocked[otherKey] && fileMocked[otherKey].mocked) fileUrl = fileMocked[otherKey].file;
        if (fileUrl) {
            console.log('need proxy');
            newHeaders.push({
                name: '__MOCK__FILEROOT__',
                value: fileRootPath,
            });
            newHeaders.push({
                name: '__MOCK__FILENAME__',
                value: fileUrl
            })
            newHeaders.push({
                name: '__MOCK__DATAFROM__',
                value: 'filesystem'
            })
        }
    } else {
        // 从Mock server上获取数据
        if (mocked[key] || mocked[otherKey]) {
            newHeaders.push({
                name: '__MOCK__SERVER__',
                value: mockServerUrl
            });
            newHeaders.push({
                name: '__MOCK__DATAFROM__',
                value: 'mockserver'
            });
            console.log('need proxy');
        }
    }
    return {
        requestHeaders: newHeaders
    };

    return details;
}, { //Filter
    urls: ["<all_urls>"], //For all
},["requestHeaders", "blocking"]);
