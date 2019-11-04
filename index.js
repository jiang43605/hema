/**
 * 因时间问题目前存在两个问题
 * - 浏览器不自动发送 If-Modify-Since
 * - https 未实现
 */

const http = require('http');
const Url = require('url');
const fs = require('fs');
const path = require('path');

const CWD = process.cwd();
const PORT = 8080;


// 获取 cwd 目录文件
function getDir(localPath, urlPathname, res) {
    const files = fs.readdirSync(localPath, { encoding: 'utf8' });
    if (!files.length) return res.end('暂无文件');

    let liHtml = '';
    files.forEach(item =>
        liHtml += `<li><a href=${path.join(urlPathname, item)}>${item}</a></li>`
    );

    let preDirHtml = '';
    if (urlPathname !== '/') {
        preDirHtml += `<li><a href=${path.dirname(urlPathname)}>上一级目录</a></li>`;
    }

    const html = `
<ul>
${preDirHtml}
${liHtml}
</ul>
`;
    res.setHeader('Content-Type', 'text/html;charset=utf-8');
    res.end(html);
}

function getFile(localPath, req, res) {
    // mime 对应参考：https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Complete_list_of_MIME_types

    const ext = path.extname(localPath);
    const ifms = req.headers["If-Modify-Since"];
    const mtime = fs.statSync(localPath).mtime;

    if (ifms) {
        if (mtime.getTime() === new Date(ifms).getTime()) {
            res.statusCode = 304;
            return req.end();
        }
    }

    res.setHeader('Last-Modify', mtime.toGMTString());

    switch (ext) {
        case '.js':
            res.setHeader('Content-Type', 'text/javascript;charset=utf-8');
            break;
        case '.txt':
            res.setHeader('Content-Type', 'text/html;charset=utf-8');
            break;
        case '.html':
            res.setHeader('Content-Type', 'text/html;charset=utf-8');
            break;
        case '.json':
            res.setHeader('Content-Type', 'application/json;charset=utf-8');
            break;
        // 还有其它很多图片格式，这里只列了一种
        case '.png':
            res.setHeader('Cache-Control', 'max-age=2592000');
            res.setHeader('Content-Type', 'image/png');
            fs.createReadStream(localPath).pipe(res);
        default:
            res.setHeader('Content-Type', 'application/octet-stream');
            fs.createReadStream(localPath).pipe(res);
            return;
    }

    const body = fs.readFileSync(localPath, { encoding: 'utf8' });
    res.end(body);
}

const server = http.createServer((req, res) => {
    const urlObj = Url.parse(req.url);
    const urlPathname = urlObj.pathname;
    const localPath = path.resolve(CWD, urlPathname.substring(1));
    let stat;
    let err;

    if (urlPathname === '/favicon.ico') return res.end();
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        stat = fs.statSync(localPath)
    } catch (error) {
        return res.end(error.message);
    }

    if (stat.isFile()) {
        try {
            return getFile(localPath, req, res);
        } catch (error) {
            err = error;
        }
    } else {
        try {
            return getDir(localPath, urlPathname, res);
        } catch (error) {
            err = error;
        }
    }

    if (err) return res.end(error.message);
});

server.on('error', (err) => {
    console.error(err);
});

server.on('close', () => {
    console.error('服务器关闭。。。');
});

server.listen(PORT);
console.log(`server at http://0.0.0.0:${PORT}`);