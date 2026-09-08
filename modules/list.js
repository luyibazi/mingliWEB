// RecordList - 命例列表
(function(global) {
    let listViewLoaded = false;
    let filterBound = false;

    var STEM = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    var BRANCH = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

    // 8 个筛选类别：取值位置 pillar[charIndex]
    var FILTER_CATS = [
        { key: 'yearS',  label: '年干', opts: STEM,    src: function(b){ return b.year ? b.year[0] : ''; } },
        { key: 'yearB',  label: '年支', opts: BRANCH,  src: function(b){ return b.year ? b.year[1] : ''; } },
        { key: 'monthS', label: '月干', opts: STEM,    src: function(b){ return b.month ? b.month[0] : ''; } },
        { key: 'monthB', label: '月支', opts: BRANCH,  src: function(b){ return b.month ? b.month[1] : ''; } },
        { key: 'dayS',   label: '日干', opts: STEM,    src: function(b){ return b.day ? b.day[0] : ''; } },
        { key: 'dayB',   label: '日支', opts: BRANCH,  src: function(b){ return b.day ? b.day[1] : ''; } },
        { key: 'hourS',  label: '时干', opts: STEM,    src: function(b){ return b.hour ? b.hour[0] : ''; } },
        { key: 'hourB',  label: '时支', opts: BRANCH,  src: function(b){ return b.hour ? b.hour[1] : ''; } }
    ];

    // 每个类别的选中集合，空 = 不过滤
    var filterSel = {};
    FILTER_CATS.forEach(function(c) { filterSel[c.key] = {}; });

    function buildFilterPanel() {
        var panel = document.getElementById('filterPanel');
        if (!panel || panel.dataset.built === '1') return;
        var html = '<div class="fcb-header">' +
            '<span class="fcb-toggle" id="fcbToggle">筛选 &#9660;</span>' +
            '<span id="filterCount" class="filter-count"></span>' +
            '<button id="filterReset" class="fcb-reset">重置</button>' +
            '</div>';
        html += '<div class="fcb-body" id="fcbBody" style="display:none;">';
        html += FILTER_CATS.map(function(cat) {
            var boxes = ['<label class="fcb-label"><input type="checkbox" class="fcb-all" data-cat="' + cat.key + '" checked><span>全部</span></label>'];
            cat.opts.forEach(function(ch) {
                boxes.push('<label class="fcb-label"><input type="checkbox" class="fcb-opt" data-cat="' + cat.key + '" data-val="' + ch + '"><span>' + ch + '</span></label>');
            });
            return '<div class="fcb-row"><span class="fcb-cat">' + cat.label + '</span><div class="fcb-opts">' + boxes.join('') + '</div></div>';
        }).join('');
        html += '</div>';
        panel.innerHTML = html;
        panel.dataset.built = '1';
    }

    function onFilterChange(e) {
        var el = e.target;
        var cat = el.dataset.cat;
        if (!cat) return;
        var row = el.closest('.fcb-row');
        var allBox = row.querySelector('.fcb-all');
        var optBoxes = row.querySelectorAll('.fcb-opt');

        if (el.classList.contains('fcb-all')) {
            // 点"全部"：清空该类别所有选中
            if (el.checked) {
                optBoxes.forEach(function(b) { b.checked = false; });
                filterSel[cat] = {};
            }
        } else {
            // 点具体选项：取消"全部"
            if (el.checked) {
                allBox.checked = false;
                filterSel[cat][el.dataset.val] = true;
            } else {
                delete filterSel[cat][el.dataset.val];
                // 如果一个都没选了，恢复"全部"
                if (Object.keys(filterSel[cat]).length === 0) allBox.checked = true;
            }
        }
        applyFilter();
    }

    function bindFilterEvents() {
        if (filterBound) return;
        var panel = document.getElementById('filterPanel');
        if (panel) panel.addEventListener('change', onFilterChange);
        var toggle = document.getElementById('fcbToggle');
        if (toggle) toggle.addEventListener('click', function() {
            var body = document.getElementById('fcbBody');
            if (!body) return;
            var isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : '';
            toggle.innerHTML = isOpen ? '筛选 &#9660;' : '筛选 &#9650;';
        });
        var resetBtn = document.getElementById('filterReset');
        if (resetBtn) resetBtn.addEventListener('click', function() {
            FILTER_CATS.forEach(function(c) {
                filterSel[c.key] = {};
                var allBox = document.querySelector('.fcb-all[data-cat="' + c.key + '"]');
                if (allBox) {
                    allBox.checked = true;
                    var row = allBox.closest('.fcb-row');
                    if (row) row.querySelectorAll('.fcb-opt').forEach(function(b) { b.checked = false; });
                }
            });
            applyFilter();
        });
        filterBound = true;
    }

    function getFilteredRecords() {
        var records = global.RecordCache.getRecords() || [];
        return records.filter(function(r) {
            var b = r.bazi || {};
            for (var i = 0; i < FILTER_CATS.length; i++) {
                var cat = FILTER_CATS[i];
                var sel = filterSel[cat.key];
                if (Object.keys(sel).length === 0) continue; // 全部 = 不过滤
                var val = cat.src(b);
                if (!sel[val]) return false; // 该类别选中的字里没有当前值
            }
            return true;
        });
    }

    function applyFilter() {
        var total = (global.RecordCache.getRecords() || []).length;
        var filtered = getFilteredRecords();
        renderList(filtered);
        var el = document.getElementById('filterCount');
        if (el) el.textContent = '共 ' + filtered.length + ' / ' + total + ' 例';
    }

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
        buildFilterPanel();
        bindFilterEvents();
        applyFilter();
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