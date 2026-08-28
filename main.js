const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow = null;

// 注册自定义协议，需在 app ready 前调用
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('wannianli', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('wannianli');
}

// 从命令行参数中解析 query（支持 --key=value 和 --key value 两种形式）
function parseQueryFromArgs(argv) {
    const args = argv.slice(process.defaultApp ? 2 : 1);
    const params = new URLSearchParams();
    const keys = ['y', 'm', 'd', 'h', 'min', 'g'];
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith('--')) {
            const eq = a.indexOf('=');
            if (eq > 0) {
                const k = a.slice(2, eq);
                const v = a.slice(eq + 1);
                if (keys.includes(k)) params.set(k, v);
            } else {
                const k = a.slice(2);
                if (keys.includes(k) && i + 1 < args.length && !args[i + 1].startsWith('--')) {
                    params.set(k, args[i + 1]);
                    i++;
                }
            }
        }
    }
    return params.toString();
}

// 从 wannianli:// URL 解析 query
function parseQueryFromProtocol(str) {
    try {
        // 形如 wannianli://?y=2024&m=1 或 wannianli://open?y=...
        const clean = str.replace(/^wannianli:\/\//i, 'http://_/');
        const u = new URL(clean);
        const keys = ['y', 'm', 'd', 'h', 'min', 'g'];
        const params = new URLSearchParams();
        keys.forEach(k => {
            const v = u.searchParams.get(k);
            if (v !== null) params.set(k, v);
        });
        return params.toString();
    } catch (e) {
        return '';
    }
}

function createWindow(initialSearch) {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 820,
        minWidth: 900,
        minHeight: 600,
        title: '万年历',
        backgroundColor: '#ffffff',
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    // 通过文件路径直接加载，不启动任何 HTTP 服务器，不占用端口
    const loadOpts = {};
    if (initialSearch) loadOpts.search = initialSearch;
    mainWindow.loadFile(path.join(__dirname, 'index.html'), loadOpts);

    // 外部链接在系统默认浏览器中打开
    mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
        if (openUrl.startsWith('http://') || openUrl.startsWith('https://')) {
            shell.openExternal(openUrl);
            return { action: 'deny' };
        }
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 合并两个 query 字符串，后者优先
function mergeSearch(a, b) {
    if (!a && !b) return '';
    if (!a) return b;
    if (!b) return a;
    const pa = new URLSearchParams(a);
    const pb = new URLSearchParams(b);
    for (const [k, v] of pb) pa.set(k, v);
    return pa.toString();
}

let pendingSearch = '';

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', (_event, argv) => {
        if (mainWindow) {
            let search = '';
            const protocolArg = argv.find(a => a && a.toLowerCase().startsWith('wannianli://'));
            if (protocolArg) search = parseQueryFromProtocol(protocolArg);
            else search = parseQueryFromArgs(argv);

            if (search) {
                const newPath = path.join(__dirname, 'index.html') + '?' + search;
                mainWindow.loadFile(path.join(__dirname, 'index.html'), { search });
            }
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        // 优先处理协议唤起的 URL（macOS 的 open-url，Windows 通常在 argv 里）
        let protocolSearch = '';
        const protocolArg = process.argv.find(a => a && a.toLowerCase().startsWith('wannianli://'));
        if (protocolArg) protocolSearch = parseQueryFromProtocol(protocolArg);

        const argsSearch = parseQueryFromArgs(process.argv);
        const initialSearch = mergeSearch(argsSearch, protocolSearch) || pendingSearch;
        pendingSearch = '';
        createWindow(initialSearch);

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow('');
            }
        });
    });
}

// macOS 上协议打开的事件，Windows 一般走 argv / second-instance
app.on('open-url', (_event, urlStr) => {
    const search = parseQueryFromProtocol(urlStr);
    if (mainWindow) {
        if (search) {
            mainWindow.loadFile(path.join(__dirname, 'index.html'), { search });
        }
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    } else {
        pendingSearch = search;
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 保险：app.quit() 后若进程仍未完全退出（子进程卡住等），强制终止
app.on('before-quit', () => {
    BrowserWindow.getAllWindows().forEach(w => {
        try { w.webContents.removeAllListeners(); w.destroy(); } catch (e) { }
    });
});
app.on('quit', () => {
    // 释放单实例锁，避免锁文件残留
    try { app.releaseSingleInstanceLock(); } catch (e) { }
});
