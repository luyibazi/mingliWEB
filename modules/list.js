// RecordList - 命例列表
(function(global) {
    let listViewLoaded = false;

    function renderList(records) {
        const container = document.getElementById('listContent');
        if (!records || records.length === 0) {
            container.innerHTML = '<p class="list-empty">暂无命例数据</p>';
            return;
        }
        container.innerHTML = records.map(function (r) {
            var b = r.bazi || {};
            var baziStr = [b.year, b.month, b.day, b.hour].filter(Boolean).join('  ');
            var solar = r.solar || (r.year + '-' + String(r.month || 1).padStart(2, '0') + '-' + String(r.day || 1).padStart(2, '0') + ' ' + String(r.hour || 0).padStart(2, '0') + ':' + String(r.minute || 0).padStart(2, '0'));
            var ts = r.createdAt ? new Date(r.createdAt * 1000).toLocaleString('zh-CN') : '';
            return '<div class="list-item">' +
                '<div class="list-item-info">' +
                '<span class="list-item-name">' + (r.name || '未命名') + '</span>' +
                '<span class="list-item-gender">' + (r.gender || '') + '</span>' +
                '<span class="list-item-solar">' + solar + '</span>' +
                '<span class="list-item-bazi">' + baziStr + '</span>' +
                (r.note ? '<span class="list-item-note">' + r.note + '</span>' : '') +
                '</div>' +
                '<div class="list-item-actions">' +
                '<button onclick="LunarList.detailRecord(\'' + r.id + '\')">详细</button>' +
                '<button onclick="LunarList.showNotesRecord(\'' + r.id + '\')">事件</button>' +
                '<button onclick="LunarList.deleteRecord(\'' + r.id + '\')">删除</button>' +
                '</div>' +
                '</div>';
        }).join('');
    }

    function renderListWithCache(records) {
        global.RecordCache.setRecords(records);
        renderList(records);
    }

    async function loadAndRenderList() {
        var container = document.getElementById('listContent');
        container.innerHTML = '<p class="list-loading">正在从云端加载数据...</p>';
        try {
            var data = await global.GiteeStorage.fetchRecords();
            global.RecordCache.setSha(data.sha);
            renderListWithCache(data.records);
            listViewLoaded = true;
        } catch (e) {
            container.innerHTML = '<p class="list-empty">加载失败: ' + e.message + '</p>';
        }
    }

    async function doDelete(id) {
        try {
            var data = await global.GiteeStorage.fetchRecords();
            var before = data.records.length;
            data.records = data.records.filter(function (r) { return r.id !== id; });
            if (data.records.length >= before) {
                global.UI.showToast('未找到该记录');
                return;
            }
            await global.GiteeStorage.saveRecords(data.records, data.sha);
            await loadAndRenderList();
            global.UI.showToast('删除成功');
        } catch (e) {
            global.UI.showToast('删除失败: ' + e.message);
        }
    }

    async function deleteRecord(id) {
        var randNum = String(Math.floor(Math.random() * 9000) + 1000);
        global.UI.showDeleteDialog(randNum, function () {
            doDelete(id);
        });
    }

    global.RecordList = {
        renderList: renderListWithCache,
        loadAndRenderList,
        deleteRecord,
        _isLoaded: function () { return listViewLoaded; },
        _resetLoaded: function () { listViewLoaded = false; }
    };
})(window);