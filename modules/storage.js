// GiteeStorage - Gitee API 配置与 CRUD
(function(global) {
    const CONFIG = {
        OWNER: 'a-treasure-trove-of-wisdom',
        REPO: 'bazi-data',
        PATH: 'data/records.json',
        TOKEN: 'f66594ca2bba32caad9d255b278dcabd',
        BRANCH: 'master',
        base: 'https://gitee.com/api/v5'
    };

    async function fetchRecords() {
        var tk = CONFIG.TOKEN;
        const url = `${CONFIG.base}/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.PATH}?access_token=${encodeURIComponent(tk)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Gitee API 请求失败: ' + res.status);
        const file = await res.json();
        const text = atob(file.content.replace(/\n/g, ''));
        const decoded = decodeURIComponent(escape(text));
        const data = JSON.parse(decoded);
        return { records: data.records || [], sha: file.sha };
    }

    async function saveRecords(records, sha) {
        var tk = CONFIG.TOKEN;
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
        if (!res.ok) throw new Error('保存失败: ' + res.status);
        return res.json();
    }

    global.GiteeStorage = { fetchRecords, saveRecords, CONFIG };
})(window);
