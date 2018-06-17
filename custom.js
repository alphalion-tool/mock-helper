console.log('mock-helper start');

let MockedPaths = {};
let AllPaths = [];
let filterString = '';

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


document.addEventListener('DOMContentLoaded', function () {
    loadPage();
    document.querySelector('.swagger-url-input').addEventListener('blur', onSwaggerInput);
    document.querySelector('.swagger-reload').addEventListener('click', onSwaggerReload);
    document.querySelector('.mock-url-input').addEventListener('blur', onMockInput);
    document.querySelector('.local-url-input').addEventListener('blur', onLocalInput);
    document.querySelector('.swagger-wrapper').addEventListener('click', onStatusChange);
    document.querySelector('.filter-url-input').addEventListener('input', onFilterInput);
    document.querySelector('.clear-filter').addEventListener('click', onClearFilter);

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

// mock server url change
function onMockInput () {
    const url = this.value;
    if (!url) return;
    setStorage('mockUrl', url, function() {
        console.log('save mock url success');
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
        setStorage('paths', arr, function () {
            console.log('save path arr ok');
        });
    })
}

function onStatusChange (e) {
    if (e.target.className == 'swagger-url-status') {
        const parentNode = e.target.parentNode;
        const data = JSON.parse(parentNode.getAttribute('data-item'));
        const key = data[1] + '-' + data[0];
        let status = 'yes';
        if (MockedPaths[key]) {
            delete MockedPaths[key];
            status = 'no';
        } else {
            MockedPaths[key] = true;
        }

        setStorage('mocked', MockedPaths, function () {
            console.log('save mocked success');
            e.target.innerHTML = status;
            renderPaths();
        })
    }
}

// render paths
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
        paths.forEach(function (path) {
            const key = path[1] + '-' + path[0];
            const status = MockedPaths[key] ? 'yes' : 'no';
            swaggerHtml += '<div class="swagger-url-item swagger-url-item--proxy-'+ status +'" data-item=\''+ JSON.stringify(path) +'\'>'+
                '<span class="swagger-url-status">' + status + '</span>' +
                '<span class="swagger-url-method">'+ path[1] + '</span>' +
                '<span class="swagger-url-path">' + path[0] +'</span>' +
                '</div>';
        })
        swaggerHtml += '</div>';
        document.querySelector('.swagger-wrapper').innerHTML = swaggerHtml;
    } else {
        document.querySelector('.swagger-wrapper').innerHTML = 'No data!';
    }
}


function loadPage () {

    getStorage({
        swaggerUrl: '',
        mockUrl: '',
        mocked: {},
        paths: [],
        localUrl: '',
    }, function (items) {


        if (items.swaggerUrl) {
            document.querySelector('.swagger-url-input').value = items.swaggerUrl;
        }

        if (items.mockUrl) {
            document.querySelector('.mock-url-input').value = items.mockUrl;
        }

        if (items.localUrl) {
            document.querySelector('.local-url-input').value = items.localUrl;
        }

        if (items.mocked) {
            MockedPaths = items.mocked;
        }

        AllPaths = items.paths;

        renderPaths(AllPaths);
    });

}

