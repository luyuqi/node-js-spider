# node-js-spider
## 3_2.0 新版知乎爬虫登录 (node js)

### 请求用的是axios

#### 4个地址

```
const url = {
    login_url: "https://www.zhihu.com/api/v3/oauth/sign_in",  //登录接口
    target_url: "https://www.zhihu.com/follow", // 推荐
    captcha_url: "https://www.zhihu.com/api/v3/oauth/captcha?lang=en", //验证码接口
    ocr_captcha: 'https://302307.market.alicloudapi.com/ocr/captcha' //第三方识别验证码接口
};
const browserMsg = {
    "User-Agent":"Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36",
    'content-type':'application/x-www-form-urlencoded'
};
```

```
const shaObj = new jsSHA("SHA-1", "TEXT");
shaObj.setHMACKey("d1b964811afb40118a12068ff74a12f4", "TEXT");
shaObj.update(grant_type);
shaObj.update(client_id);
shaObj.update(source);
shaObj.update(now + '');
const signature = shaObj.getHMAC("HEX");
console.log(signature);

let data = {
    client_id: client_id,  //固定值
    grant_type: grant_type,  //固定值
    timestamp: now,  //时间戳 需和signature中加密的时间戳一样
    source: source,  //固定值
    signature: signature,  //jsSha加密值
    username: "+86？？？",  //账号 需要加上+86
    password: "？？？",  //密码
    captcha: "",  //验证码
    lang: "en",  //固定值
    utm_source: undefined,  //固定值
    ref_source: "other_https://www.zhihu.com/signin?next=%2F",  //固定值
}
```

#### 首先是获取验证码 get请求

```
function getCaptcha() {
    axios({
        headers: {
            ...browserMsg
        },
        url: url.captcha_url,
        method: 'get'
    })
        .then(res => {
            let headers = res.headers;
            let set_cookie = headers['set-cookie'].toString();
            // set_cookie 为服务端返回的cookie
            capsion_ticket = set_cookie.split(';')[0].replace(/capsion_ticket=/, '');
            // capsion_ticket为验证码票据 需要储存下来
            if (res.data.show_captcha == true) {
            	...
            }
            // 服务端会返回 show_captcha 字段 是否需要输入验证码
        })
}
```
#### 当getCaptcha返回的show_captcha为true时 继续请求验证码接口 put 请求,需要带上之前的set_cookie

```
//此处是以获取en的验证码 所以只会返回数字加英文
function putCaptcha(set_cookie) {
    return axios({
        method: 'PUT',
        url: url.captcha_url,
        headers: {
            ...browserMsg,
            Cookie: set_cookie
        },
    })
    .then(response => {
    	// 返回结果是base64的图片,response.data.img_base64
}
```

#### 调用第三方接口识别验证码 
##### https://market.aliyun.com/products/57124001/cmapi027426.html#sku=yuncode2142600000 (可以免费试用30次)

```
//第三方图片验证码
return axios({
    method: 'POST',
    headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': 'APPCODE ？？？',  //三方验证码的code
    },
    data: qs.stringify({ 'image': response.data.img_base64, 'type': 1001 }),
    url: url.ocr_captcha
})
    .then(res => {
        return res.data  // 返回结果
    })
```

#### 再调用验证码接口 post 请求

```
function postCaptcha(code) {
	// capsion_ticket 将之前的验证码票据放入cookie 以及三方识别出来的验证码当做参数
    return axios({
        method: 'POST',
        url: url.captcha_url,
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Cookie': `capsion_ticket=${capsion_ticket}`
        },
        data: qs.stringify({ input_text: code }) // code为验证码
    })
}
```

#### 调用登陆接口之前需要将用户名、密码和一些基本信息加密，加密的代码在encrypt.js文件中（拷贝的知乎源码），由于是在node端加密的，所以需要将加密代码中的 window 变量以及 atob方法稍作修改，然后直接引用就行

#### 调用登陆接口

```
function sign_in(data) {
	// data为加密后的值
    return axios({
        method: 'post',
        headers: {
            ...browserMsg,
            'Cookie': `capsion_ticket=${capsion_ticket}`,  //登录需要验证码票据
            "x-zse-83": "3_2.0"  //应该是版本号吧
        },
        url: url.login_url,
        data: data
    })
        .then(res => {
            console.log('res.data============>', res.data)  //返回的用户信息 z_c0
            return z_c0 = res.data.cookie.z_c0
        })
}

```

#### 最后请求follow页面 带上 z_c0

```
function getFollower(z_c0){
    axios({
        method: 'get',
        headers: {
            ...browserMsg,
            "Cookie": `z_c0=${z_c0}`  // 访问页面的时候带上 z_c0 就可以了
        },
        url: url.target_url,
    })
        .then(res => {
            console.log(res.data) //html代码
        })
}
```

## Usage

```
git clone xxx

npm install

在data对象中填上自己的用户名以及密码，再把第三方的验证码code填入 ？？？ 中，可以用其他验证的方法，只要保证高精确度就可以了

node index.js

```
#### PS：纯属喜欢折腾,不用做商业用途，读知乎ugly的代码不易，觉得可以的给个star吧，有问题的可以私聊我哦！