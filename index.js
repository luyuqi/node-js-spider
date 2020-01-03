const cheerio = require("cheerio");
const fs = require('fs');
const qs = require('qs');
const axios = require('axios');
const jsSHA = require("jssha");
const encrypt = require('./encrypt');
const url = {
    login_url: "https://www.zhihu.com/api/v3/oauth/sign_in",
    target_url: "https://www.zhihu.com/follow",
    captcha_url: "https://www.zhihu.com/api/v3/oauth/captcha?lang=en",
    ocr_captcha: 'https://302307.market.alicloudapi.com/ocr/captcha'
};

const browserMsg = {
    "User-Agent":"Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36",
    'content-type':'application/x-www-form-urlencoded'
};

const now = Date.now();
const client_id = "c3cef7c66a1843f8b3a9e6a1e3160e20";
const source = "com.zhihu.web";
const grant_type = 'password';

const shaObj = new jsSHA("SHA-1", "TEXT");
shaObj.setHMACKey("d1b964811afb40118a12068ff74a12f4", "TEXT");
shaObj.update(grant_type);
shaObj.update(client_id);
shaObj.update(source);
shaObj.update(now + '');
const signature = shaObj.getHMAC("HEX");
console.log(signature);

axios.interceptors.response.use(function (response) {
    return response;
}, function (error) {
    console.log('error===========>', error)
    return Promise.reject(error)
});

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

let capsion_ticket;  //验证码票据
let z_c0;  //登录需要的字段

function postCaptcha(code) {
    return axios({
        method: 'POST',
        url: url.captcha_url,
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Cookie': `capsion_ticket=${capsion_ticket}`
        },
        data: qs.stringify({ input_text: code })
    })
}

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
            if (res.data.show_captcha == true) {
                putCaptcha(set_cookie)
                    .then(code => {
                        code = code.data.captcha;
                        data.captcha = code;
                        capsion_ticket = set_cookie.split(';')[0].replace(/capsion_ticket=/, '');
                        console.log("code================>", code, capsion_ticket);
                        return new Promise((resolve, reject) => {
                            setTimeout(() => {
                                resolve(code)
                            }, 2000)  //需要加定时器防止过快提交验证码
                        })
                    })
                    .then(code => {
                        return postCaptcha(code)
                    })
                    .then(res => {
                        let key = encrypt.default(transformData(data)).replace('_AFX', '');  //加密后需要把后缀_AFX去掉
                        return sign_in(key)
                    })
                    .then(z_c0 => {
                        return getFollower(z_c0)
                    })
            }
        })
}

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
            const dataBuffer = new Buffer.from(response.data.img_base64, 'base64');
            fs.writeFile('base64.txt', response.data.img_base64, (err) => {
                if (err) throw err;
                console.log('文件已被保存');
            });
            fs.writeFile('base64.jpg', dataBuffer, (err) => {
                if (err) throw err;
                console.log('照片已被保存');
            });

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
                    return res.data
                })
        })
}

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
            console.log(res.data)
        })
}

function sign_in(data) {
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

function transformData(data) {
    return Object.keys(data).map(key => {
        return `${key}=${encodeURIComponent(data[key] || '')}`
    }).join('&')
}

getCaptcha();
