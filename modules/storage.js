// GiteeStorage - Gitee API 配置与 CRUD
// 注意：Gitee 私人令牌 TOKEN 不再硬编码（否则 GitHub Push Protection 会拒绝推送）
// 改为从浏览器 localStorage.getItem('gitee_token') 读取，首次打开页面会弹 prompt 让用户输入并保存
(function(global) {
    const CONFIG = {
        OWNER: 'a-treasure-trove-of-wisdom',
        REPO: 'bazi-data',
        PATH: 'data/records.json',
        TOKEN: '',
        BRANCH: 'master',
        base: 'https://gitee.com/api/v5'
    };

    /**
     * 获取 Gitee 私人令牌：优先 localStorage，没有就弹 prompt 让用户填并保存
     * 返回空串时，后续 fetch 会被 Gitee API 401/403 拒绝，但不会把密钥泄露到仓库源码
     */
    function getToken() {
        var tk = '';
        try { tk = (window.localStorage && window.localStorage.getItem('gitee_token')) || ''; }
        catch (e) { tk = ''; }
        if (!tk && typeof window !== 'undefined' && typeof window.prompt === 'function') {
            var input = window.prompt(
                '请输入你的 Gitee 私人令牌（只在第一次访问时需要，之后会保存在本机浏览器）：\n\n' +
                '生成方法：Gitee 头像 -> 设置 -> 私人令牌 -> 生成新令牌 -> 勾选 projects 权限\n' +
                '（不是 Gitee 登录密码，是一串 32 位以上的随机字母数字）'
            );
            if (input && (input = input.trim())) {
                tk = input;
                try { window.localStorage.setItem('gitee_token', tk); } catch (e) {}
            }
        }
        return tk;
    }

    async function fetchRecords() {
        var tk = getToken();
        const url = `${CONFIG.base}/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.PATH}?access_token=${encodeURIComponent(tk)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Gitee API 请求失败: ' + res.status + (res.status === 401 || res.status === 403 ? '（令牌无效或未填，请刷新页面重新输入）' : ''));
        const file = await res.json();
        const text = atob(file.content.replace(/\n/g, ''));
        const decoded = decodeURIComponent(escape(text));
        const data = JSON.parse(decoded);
        return { records: data.records || [], sha: file.sha };
    }

    async function saveRecords(records, sha) {
        var tk = getToken();
        const content = JSON.stringify({ records: records }, null, 2);
        const b64 = btoa(unescape(encodeURIComponent(content)));
        const url = `${CONFIG.base}/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.PATH}`;
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: tk,
                message: 'update records via app',
                content: b64,
                sha: sha,
                branch: CONFIG.BRANCH
            })
        });
        if (!res.ok) throw new Error('保存失败: ' + res.status + (res.status === 401 || res.status === 403 ? '（令牌无效或未填，请刷新页面重新输入）' : ''));
        return res.json();
    }

    global.GiteeStorage = { fetchRecords, saveRecords, CONFIG };
})(window);