console.log('mock-helper start');

// mock server的配置
let MockedPaths = {};
// mock file的配置
let FileMockedPaths = {};
let AllPaths = [];
let filterString = '';
let DataFrom = 'filesystem';
let mockServerUrl = '';
let fileRootPath = '';

function setStorage (key, value, cb) {
    chrome.storage.local.set({ [key]: value }, function() {
        cb && cb();
    });
}

function getStorageItem (key, cb) {
    chrome.storage.local.get({ [key]: null }, cb);
}

function getStorage (obj, cb) {
    chrome.storage.local.get(obj, cb);
}

function Ajax (path, cb) {
    console.log('will send xhr', path);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", path, true);
    xhr.send();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            cb(xhr.responseText);
        }
    }
}

// 监听操作事件
document.addEventListener('DOMContentLoaded', function () {
    loadPage();
    document.querySelector('.swagger-url-input').addEventListener('blur', onSwaggerInput);
    document.querySelector('.swagger-reload').addEventListener('click', onSwaggerReload);
    document.querySelector('.mock-url-input').addEventListener('blur', onMockServerInput);
    document.querySelector('.local-url-input').addEventListener('blur', onLocalInput);

    document.querySelector('.swagger-wrapper').addEventListener('click', onStatusChange);
    $('.swagger-wrapper').on('blur', 'input', onFileNameChange);

    document.querySelector('.filter-url-input').addEventListener('input', onFilterInput);
    document.querySelector('.clear-filter').addEventListener('click', onClearFilter);

    // 数据来源改变
    document.querySelector('.datafrom-server').addEventListener('click', onDataFromChange);
    document.querySelector('.datafrom-file').addEventListener('click', onDataFromChange);

});

// parse swagger data
function parseSwagger (response) {
    const ret = JSON.parse(response);
    const paths = ret.paths;
    const pathArr = [];
    Object.keys(paths).forEach(function(path, index) {
        const item = paths[path];
        Object.keys(item).forEach(function (method) {
            pathArr.push([parsePath(path), method]);
        })
    })

    function parsePath (path) {
        let tmpPath = path;
        const matched = path.match(/\{.*\}/);
        if (matched) {
            tmpPath = path.replace(matched[0], '\\d+');
        }
        return tmpPath;
    }

    return pathArr;
}

// swagger file path change
function onSwaggerInput () {
    const url = this.value;
    if (!url) return;
    setStorage('swaggerUrl', url, function() {
        console.log('save url success');
    });
}

// local url change
function onLocalInput () {
    const url = this.value;
    if (!url) return;
    setStorage('localUrl', url, function() {
        console.log('save local url success');
    });
}

// 数据来源改变
function onDataFromChange () {
    DataFrom = this.value;
    reloadDataFrom();
    renderPaths();
    setStorage('dataFrom', this.value, function() {
        console.log('save dataFrom success');
    })
}

// mock server url change
function onMockServerInput () {
    const url = this.value;
    if (!url) return;
    let storeKey = 'mockServerUrl';
    if (DataFrom === 'filesystem') {
        storeKey = 'fileRootPath';
        fileRootPath = url;
    } else {
        mockServerUrl = url;
    }
    setStorage(storeKey, url, function() {
        console.log('save mock server url/ file root path success');
    });
}

// filter path
function onFilterInput () {
    filterString = this.value || '';
    renderPaths();
}

// clear filter string
function onClearFilter () {
    filterString = '';
    document.querySelector('.filter-url-input').value = '';
    renderPaths();
}


function onSwaggerReload () {
    const path = document.querySelector('.swagger-url-input').value;
    // reload
    Ajax(path, function (resp) {
        console.log(parseSwagger(resp));
        const arr = parseSwagger(resp);
        AllPaths = arr;
        setStorage('paths', arr, function () {
            console.log('save path arr ok');
            renderPaths();
        });
    })
}

// mock状态改变
function onStatusChange (e) {
    if (e.target.className == 'swagger-url-status') {
        const parentNode = e.target.parentNode;
        const data = JSON.parse(parentNode.getAttribute('data-item'));
        const key = data[1] + '-' + data[0];
        let status = 'yes';
        let storeKey = 'mocked';
        if (DataFrom === 'filesystem') {
            // 文件系统
            storeKey = 'fileMocked';
            if (FileMockedPaths[key] && FileMockedPaths[key].mocked) {
                FileMockedPaths[key].mocked = false;
                status = 'no';
            } else {
                FileMockedPaths[key]= FileMockedPaths[key] || {};
                FileMockedPaths[key].mocked = true;
            }
        } else {
            storeKey = 'mocked';
            if (MockedPaths[key]) {
                delete MockedPaths[key];
                status = 'no';
            } else {
                MockedPaths[key] = true;
            }
        }

        setStorage(storeKey, DataFrom === 'filesystem' ? FileMockedPaths : MockedPaths, function () {
            console.log('save mocked success');
            e.target.innerHTML = status;
            renderPaths();
        })
    }
}

// mock的本地file内容改变
function onFileNameChange (e) {

    if (e.target.nodeName === 'INPUT') {
        console.log(e, e.target.value);
        const parentNode = e.target.parentNode.parentNode;
        const data = JSON.parse(parentNode.getAttribute('data-item'));
        const key = data[1] + '-' + data[0];

        console.log(key);
        FileMockedPaths[key] = FileMockedPaths[key] || {};
        FileMockedPaths[key].file = e.target.value;
        setStorage('fileMocked', FileMockedPaths, function () {
            console.log('save file mocked success');
            // e.target.innerHTML = status;
            renderPaths();
        })
    }
}

// render paths，渲染从swagger读取的url
function renderPaths () {

    let paths = AllPaths;
    if (filterString) {
        paths = [];
        AllPaths.forEach((item) => {
            if (item[0].search(filterString) !== -1) {
                paths.push(item);
            }
        });
    }

    let swaggerHtml = '<div class="swagger-urls">';

    if (paths && paths.length) {
        // 头部地址
        swaggerItemHead = '<div class="swagger-url-item swagger-url-item--head">' +
            '<span class="swagger-url-status">Mock</span>' +
            '<span class="swagger-url-method">Method</span>' +
            '<span class="swagger-url-path">Path</span>';

        if (DataFrom === 'filesystem') {
            swaggerItemHead += '<span class="swagger-url-file">File Name</span>';
        }
        swaggerItemHead += '</div>';

        swaggerHtml += swaggerItemHead;

        paths.forEach(function (path) {
            const key = path[1] + '-' + path[0];
            let status = '';
            let fileInputStr = '';
            let tmpFileUrl = '';

            // 如果数据来源是file system
            if (DataFrom == 'filesystem') {
                status = FileMockedPaths[key] ? FileMockedPaths[key].mocked ? 'yes' : 'no' : 'no';
                tmpFileUrl = FileMockedPaths[key] ? (FileMockedPaths[key].file || '') : '';
                fileInputStr = '<span class="swagger-url-file"><input type="text" value="'+ tmpFileUrl +'" placeholder="文件如xy/data.json" /></span>';
            } else {
                status = MockedPaths[key] ? 'yes' : 'no';
            }
            
            swaggerHtml += '<div class="swagger-url-item swagger-url-item--proxy-'+ status +'" data-item=\''+ JSON.stringify(path) +'\'>'+
                '<span class="swagger-url-status">' + status + '</span>' +
                '<span class="swagger-url-method">'+ path[1] + '</span>' +
                '<span class="swagger-url-path">' + path[0] +'</span>' +
                fileInputStr +
                '</div>';
        })
        swaggerHtml += '</div>';
        document.querySelector('.swagger-wrapper').innerHTML = swaggerHtml;
    } else {
        document.querySelector('.swagger-wrapper').innerHTML = 'No data!';
    }
}

// 重置datafrom后的数据
function reloadDataFrom () {
    if (DataFrom === 'filesystem') {
        $('.datafrom-file').get(0).checked = true;
        $('.file-or-server-label').text('Local File Root:');
        $('.mock-url-input').attr('placeholder', '本地数据文件放置的目录，如/Users/xx/project');
        $('.mock-url-input').val(fileRootPath);
    } else {
        $('.datafrom-server').get(0).checked = true;
        $('.file-or-server-label').text('Mock Server:');
        $('.mock-url-input').attr('placeholder', 'mock server地址，如http://xx.xxx.xx/xx');
        $('.mock-url-input').val(mockServerUrl);
    }
}

function loadPage () {

    getStorage({
        swaggerUrl: '',
        mockServerUrl: '',
        fileRootPath: '',
        mocked: {},
        paths: [],
        localUrl: '',
        dataFrom: 'filesystem',
        fileMocked: {},
    }, function (items) {

        DataFrom = items.dataFrom;
        document.querySelector('.swagger-url-input').value = items.swaggerUrl || '';
        mockServerUrl = items.mockServerUrl || '';
        fileRootPath = items.fileRootPath || '';
        document.querySelector('.local-url-input').value = items.localUrl || '';
        
        MockedPaths = items.mocked || {};
        FileMockedPaths = items.fileMocked || {};
        AllPaths = items.paths;

        reloadDataFrom();
        renderPaths(AllPaths);
    });

}

