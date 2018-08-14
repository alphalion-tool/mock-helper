

### Mock Helper

chrome extension for mock helper, combine with express-http-proxy, you can access data from 2 mock servers


### How it works
use `chrome.webRequest` change the requests headers, add a header named `__MOCK__DATAFROM__`, then proxy in dev server

- for local file system (数据来源本地文件)
    
    add three headers
    __MOCK__DATAFROM__='filesystem'
    __MOCK__FILENAME__='xx.json'
    __MOCK__FILEROOT__='/xcsdf/sdfsdf'

- for mock server (数据来源mock server)
    
    add two headers
    __MOCK__DATAFROM__='mockserver'
    __MOCK__SERVER__='http://xxx' 



### Recommend
[easy-mock](https://github.com/easy-mock/easy-mock)