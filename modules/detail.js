// ========== 模块：DetailDialog ==========
(function(global) {

    function noteText(val) {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'object') return val.text || '';
        return '';
    }
    function noteMeta(val) {
        if (!val || typeof val !== 'object') return { year: '', ganzhi: '', age: '' };
        return { year: val.year || '', ganzhi: val.ganzhi || '', age: val.age != null ? val.age : '' };
    }
    function escAndBreak(s) {
        return String(s || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }

    function showDetailDialog(record) {
        var existing = document.getElementById('detailDialog');
        if (existing) existing.remove();

        var b = record.bazi || {};
        var ts = record.createdAt ? new Date(record.createdAt * 1000).toLocaleString('zh-CN') : '';
        var fb = record.fullBazi || null;

        function makePillar(stem, branch, label) {
            if (!stem || !branch) return '';
            return '<div style="display:flex;flex-direction:column;align-items:center;min-width:36px;">' +
                   (label ? '<div style="font-size:10px;color:#888;margin-bottom:3px;">' + label + '</div>' : '') +
                   '<div style="font-size:18px;font-weight:bold;line-height:1.2;color:#000;">' + stem + '</div>' +
                   '<div style="border-top:1px solid #000;width:100%;margin:2px 0;"></div>' +
                   '<div style="font-size:18px;font-weight:bold;line-height:1.2;color:#000;">' + branch + '</div>' +
                   '</div>';
        }
        function parseGZ(gz) {
            if (!gz || gz.length < 2) return ['', ''];
            return [gz.charAt(0), gz.charAt(1)];
        }
        var yearGZ = fb ? fb.year : (b.year || '');
        var monthGZ = fb ? fb.month : (b.month || '');
        var dayGZ = fb ? fb.day : (b.day || '');
        var hourGZ = fb ? fb.hour : (b.hour || '');
        var yStem = parseGZ(yearGZ)[0], yBranch = parseGZ(yearGZ)[1];
        var mStem = parseGZ(monthGZ)[0], mBranch = parseGZ(monthGZ)[1];
        var dStem = parseGZ(dayGZ)[0], dBranch = parseGZ(dayGZ)[1];
        var hStem = parseGZ(hourGZ)[0], hBranch = parseGZ(hourGZ)[1];
        var baziHtml = '<div style="display:flex;gap:14px;margin-top:8px;">' +
            makePillar(yStem, yBranch, '年柱') +
            makePillar(mStem, mBranch, '月柱') +
            makePillar(dStem, dBranch, '日柱') +
            makePillar(hStem, hBranch, '时柱') +
            '</div>';

        var basicHtml =
            '<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #ccc;">' +
            '<div style="display:flex;align-items:center;margin-bottom:8px;">' +
            '<input id="dtNameInput" value="' + (record.name || '未命名案例') + '" style="font-size:16px;font-weight:bold;border:1px solid #ccc;padding:4px 6px;margin-right:10px;font-family:inherit;outline:none;background:#fff;min-width:200px;" onfocus="this.select()">' +
            '<span style="font-size:13px;font-weight:normal;border:1px solid #000;padding:1px 8px;">' + (record.gender || '') + '</span></div>' +
            '<div style="font-size:12px;color:#666;">创建时间：' + ts + '</div>' +
            '</div>' +
            '<div style="line-height:1.9;font-size:13px;">' +
            '<div>公历：' + (fb ? (fb.solarDate + ' ' + (fb.shiChen || '')) : (record.solar || '')) + '</div>' +
            '<div>农历：' + (fb ? (fb.lunarDate + ' ' + (fb.shiChen || '')) : '-') + '</div>' +
            (fb && fb.shiChen ? '<div>时辰：' + fb.shiChen + '</div>' : '') +
            (fb && fb.siLing ? '<div>司令：' + fb.siLing + '</div>' : '') +
            (fb && fb.taiYuan ? '<div>胎元：' + fb.taiYuan + '</div>' : '') +
            (fb && fb.jiaoYun ? '<div>交运：' + fb.jiaoYun.jieQi + fb.jiaoYun.days + '天' + fb.jiaoYun.hours + '小时（' + fb.jiaoYun.jiaoYunGan + '）</div>' : '') +
            '</div>';

        var noteHtml =
            '<div style="margin-top:12px;padding:8px;border:1px solid #ccc;">' +
            '<div style="font-size:12px;color:#666;margin-bottom:4px;">描述：</div>' +
            '<textarea id="dtNoteInput" style="width:100%;box-sizing:border-box;border:1px solid #ccc;padding:8px;font-size:13px;line-height:1.7;min-height:60px;resize:none;overflow:hidden;font-family:inherit;outline:none;background:#fff;">' +
            (record.note || '') +
            '</textarea>' +
            '<div style="display:flex;justify-content:flex-end;align-items:center;margin-top:8px;gap:12px;">' +
            '<div id="dtNoteSaveTip" style="font-size:12px;color:#666;display:none;">✓ 已保存</div>' +
            '<button id="dtSaveNoteBtn" style="border:2px solid #000;background:#000;color:#fff;padding:6px 24px;font-size:13px;cursor:pointer;font-family:inherit;letter-spacing:1px;">保存信息</button>' +
            '</div>' +
            '</div>';

        var baziBlockHtml = '<div style="margin-top:12px;padding:10px 12px;border:1px solid #000;background:#fff;">' + baziHtml + '</div>';

        var yunshiHtml = '';
        var allPhase = null;
        var _buildErrMsg = '';
        var _buildInput = null;

        function normalizeGender(g) {
            if (g === 'male' || g === 'female') return g;
            if (g === '男' || g === '乾') return 'male';
            if (g === '女' || g === '坤') return 'female';
            return '';
        }
        function assembleSeedFromRecord() {
            if (!record) return null;
            var y = record.year, m = record.month, d = record.day;
            if (y == null || m == null || d == null) return null;
            return {
                year: Number(y),
                month: Number(m),
                day: Number(d),
                hour: Number(record.hour) || 12,
                minute: Number(record.minute) || 0,
                gender: normalizeGender(record.gender)
            };
        }

        if (fb && fb.allDayuns && fb.allDayuns.length > 0) {
            allPhase = fb.allDayuns;
        } else {
            var _p = null;
            var seedFrom = '';
            if (fb && fb.inputParams && fb.inputParams.year != null && fb.inputParams.month != null && fb.inputParams.day != null) {
                _p = {
                    year: Number(fb.inputParams.year),
                    month: Number(fb.inputParams.month),
                    day: Number(fb.inputParams.day),
                    hour: Number(fb.inputParams.hour) || 12,
                    minute: Number(fb.inputParams.minute != null ? fb.inputParams.minute : 0),
                    gender: normalizeGender(fb.inputParams.gender)
                };
                seedFrom = 'fullBazi.inputParams';
            } else {
                _p = assembleSeedFromRecord();
                seedFrom = 'record 基础字段';
            }
            _buildInput = _p;
            if (_p) {
                if (!_p.gender) {
                    _p.gender = normalizeGender(record.gender || (fb && fb.qianKun));
                }
                if (!_p.gender) {
                    _p.gender = 'male';
                    _buildErrMsg = '性别字段缺失，已默认按"男/乾"重算。';
                }
                var _dateKey = _p.year + '-' + _p.month + '-' + _p.day;
                var _dtGender = (_p.gender === 'male') ? 1 : 0;
                var _yearGanIdx = (_p.year - 4) % 10;
                var _yearGanIsYang = (_yearGanIdx % 2 === 0);
                var _dtShunNi = ((_dtGender === 1 && _yearGanIsYang) || (_dtGender === 0 && !_yearGanIsYang)) ? 1 : 0;
                try {
                    var _dt0 = (function (s, p) {
                        var m1 = /^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/.exec(s || '');
                        if (m1) return { year: +m1[1], month: +m1[2], day: +m1[3], hour: +m1[4], minute: +m1[5] };
                        var m2 = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(s || '');
                        if (m2) return {
                            year: +m2[1], month: +m2[2], day: +m2[3],
                            hour: (m2[4] != null) ? +m2[4] : (p ? (p.hour || 0) : 0),
                            minute: (m2[5] != null) ? +m2[5] : (p ? (p.minute || 0) : 0)
                        };
                        return {
                            year: p ? p.year : 0, month: p ? p.month : 1, day: p ? p.day : 1,
                            hour: p ? (p.hour || 0) : 0, minute: p ? (p.minute || 0) : 0
                        };
                    })(record.solar, _p);
                    var dayunData = global.BaZiCalc.findYearsByGanZhi(
                        _dt0,
                        record.fullBazi.jiaoYun.yearGan,
                        record.bazi.month,
                        _dtShunNi,
                        _dtGender
                    );
                    if (!dayunData || dayunData.length === 0) throw new Error('BaZiCalc.findYearsByGanZhi 返回空数组');
                    allPhase = dayunData;
                } catch (e) {
                    _buildErrMsg = (_buildErrMsg ? _buildErrMsg + '；' : '') + e.message;
                    allPhase = null;
                }
            }
        }
        var hasFullData = !!(allPhase && allPhase.length > 0);

        function dtDateZhuanhuan(solarStr) {
            var p = _buildInput;
            var m1 = /^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/.exec(solarStr || '');
            if (m1) return { year: +m1[1], month: +m1[2], day: +m1[3], hour: +m1[4], minute: +m1[5] };
            var m2 = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(solarStr || '');
            if (m2) return {
                year: +m2[1], month: +m2[2], day: +m2[3],
                hour: (m2[4] != null) ? +m2[4] : (p ? (p.hour || 0) : 0),
                minute: (m2[5] != null) ? +m2[5] : (p ? (p.minute || 0) : 0)
            };
            return {
                year: p ? p.year : 0, month: p ? p.month : 1, day: p ? p.day : 1,
                hour: p ? (p.hour || 0) : 0, minute: p ? (p.minute || 0) : 0
            };
        }

        if (hasFullData) {
            var phases = allPhase;

            for (var i = 0; i < phases.length; i++) {
                if (!phases[i].phaseKey) phases[i].phaseKey = String(i + 1);
                if (!phases[i].title && phases[i].dayunganzhi) phases[i].title = phases[i].dayunganzhi + '大运·流年';
            }
            var _birthYearForPre = _buildInput ? _buildInput.year : 0;
            var _firstAgeForPre = phases[0] ? (phases[0].startAge || 0) : 0;
            var prePhase = {
                phaseKey: 'pre',
                phaseName: '童限/小运',
                title: '起运前流年',
                labelYear: _birthYearForPre,
                labelAge: (_firstAgeForPre > 1) ? ('1-' + (_firstAgeForPre - 1)) : '',
                liunians: []
            };

            var dayunCards = '';
            let by = global.BaZiCalc.getBirthYear(dtDateZhuanhuan(record.solar));

            dayunCards +=
                '<div class="dt-dayun-card" data-dayun-index="pre">' +
                '<div class="dt-year-line">' + (by || '-') + '</div>' +
                '<div class="dt-sub-line">' + (prePhase.labelAge ? prePhase.labelAge + '岁' : '童限') + '</div>' +
                '<div class="dt-ganzhi-line">小运</div>' +
                '</div>';

            phases.slice(0, 12).forEach(function (ph, i) {
                var idx = i + 1;
                dayunCards +=
                    '<div class="dt-dayun-card" data-dayun-index="' + idx + '">' +
                    '<div class="dt-year-line">' + (ph.starYear || '-') + '</div>' +
                    '<div class="dt-sub-line">' + (ph.startAge || '-') + '岁</div>' +
                    '<div class="dt-ganzhi-line">' + (ph.dayunganzhi || '-') + '</div>' +
                    '</div>';
            });

            dayunCards += '<div class="dt-dayun-card dt-empty"></div>';

            yunshiHtml =
                '<div class="dt-yunshi-layout" id="dtYunshiLayout">' +
                '<div class="dt-yunshi-col dt-yunshi-left">' +
                '<div class="dt-block-title">大运阶段</div>' +
                '<div class="dt-dayun-grid" id="dtDayunGrid">' + dayunCards + '</div>' +
                '<div class="dt-notes-block" id="dtNotesBlock" style="min-height:300px;">' +
                '<div class="dt-block-title">事件记录（双击上方卡片添加）</div>' +
                '<div class="dt-notes-box" id="dtNotesBox"></div>' +
                '</div>' +
                '</div>' +
                '<div class="dt-yunshi-col dt-yunshi-right">' +
                '<div class="dt-block">' +
                '<div class="dt-block-title" id="dtLiuNianTitle">流年</div>' +
                '<div id="dtLiuNianArea"></div>' +
                '</div>' +
                '<div class="dt-block dt-block-bottom">' +
                '<div class="dt-block-title" id="dtLiuYueTitle">流月</div>' +
                '<div id="dtLiuYueArea"></div>' +
                '</div>' +
                '</div>' +
                '</div>';
        }

        var oldDataHint = '';
        if (!hasFullData) {
            var tipBorder = 'margin-top:12px;padding:8px;border:1px dashed #999;color:#666;font-size:12px;line-height:1.7;';
            if (_buildInput) {
                var msg = '尝试重算大运数据，但未成功。请回到万年历页面，手动排盘后再保存一次。';
                if (_buildErrMsg) {
                    msg += '<br><span style="color:#333;">错误信息：' + _buildErrMsg + '</span>';
                }
                msg += '<br><span style="color:#999;">实际入参：year=' + _buildInput.year + ', month=' + _buildInput.month + ', day=' + _buildInput.day +
                    ', hour=' + _buildInput.hour + ', minute=' + _buildInput.minute + ', gender=' + _buildInput.gender + '</span>';
                oldDataHint = '<div style="' + tipBorder + '">' + msg + '</div>';
            } else if (!fb) {
                oldDataHint = '<div style="' + tipBorder + '">此为旧版数据，未保存可重算大运的种子信息（年月日时分）。如需查看大运/流年，请回到万年历页面重新排盘后再保存。</div>';
            } else {
                oldDataHint = '<div style="' + tipBorder + '">此版数据缺少可重算大运的年月日字段，请回到万年历页面重新排盘后再保存。</div>';
            }
        }

        // ========== CSS 样式注入 ==========
        (function injectDtStyles() {
            var styleId = 'dtYunshiStyle';
            if (document.getElementById(styleId)) return;
            var s = document.createElement('style');
            s.id = styleId;

            s.textContent = '#detailDialog .dt-yunshi-layout { display: flex; gap: 18px; margin-top: 16px; }\n';
            s.textContent += '#detailDialog .dt-yunshi-col    { display: flex; flex-direction: column; min-width: 0; }\n';
            s.textContent += '#detailDialog .dt-yunshi-left   { flex: 0 0 58%; gap: 16px; }\n';
            s.textContent += '#detailDialog .dt-yunshi-right  { flex: 1 1 auto; }\n';
            s.textContent += '#detailDialog .dt-block         { min-height: 0; }\n';
            s.textContent += '#detailDialog #dtLiuNianArea    { min-height: 120px; }\n';
            s.textContent += '#detailDialog #dtLiuYueArea     { min-height: 100px; }\n';
            s.textContent += '#detailDialog .dt-block-bottom  { margin-top: 16px; padding-top: 14px; border-top: 1px dashed #999; }\n';

            s.textContent += '#detailDialog .dt-block-title { font-size: 13px; font-weight: bold; padding: 0 2px 6px 2px; border-bottom: 1px solid #000; margin-bottom: 12px; letter-spacing: 1px; }\n';

            s.textContent += '#detailDialog .dt-dayun-grid    { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }\n';
            s.textContent += '#detailDialog .dt-dayun-card    { border: 1px solid #000; background: #fff; padding: 10px 6px; cursor: pointer; user-select: none; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; }\n';
            s.textContent += '#detailDialog .dt-dayun-card.dt-empty  { border: 1px dashed #ccc; background: transparent; cursor: default; opacity: 0; pointer-events: none; }\n';
            s.textContent += '#detailDialog .dt-dayun-card.dt-hover  { background: #f0f0f0; }\n';
            s.textContent += '#detailDialog .dt-dayun-card.dt-current{ border: 1px solid #000; background: #fafafa; box-shadow: inset 3px 0 0 0 #000, inset 0 0 0 1px #000; }\n';

            s.textContent += '#detailDialog .dt-liunian-grid  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }\n';
            s.textContent += '#detailDialog .dt-liunian-card  { border: 1px solid #000; background: #fff; padding: 10px 6px; cursor: pointer; user-select: none; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 3px; }\n';
            s.textContent += '#detailDialog .dt-liunian-card.dt-hover  { background: #f0f0f0; }\n';
            s.textContent += '#detailDialog .dt-liunian-card.dt-current{ border: 1px solid #000; background: #fafafa; box-shadow: inset 0 0 0 1px #000; }\n';

            s.textContent += '#detailDialog .dt-liuyue-grid   { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }\n';
            s.textContent += '#detailDialog .dt-liuyue-card   { border: 1px solid #000; background: #fff; padding: 8px 5px; cursor: pointer; user-select: none; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px; }\n';
            s.textContent += '#detailDialog .dt-liuyue-card.dt-hover  { background: #f0f0f0; }\n';
            s.textContent += '#detailDialog .dt-liuyue-card.dt-current{ border: 1px solid #000; background: #fafafa; box-shadow: inset 0 0 0 1px #000; }\n';

            s.textContent += '#detailDialog .dt-year-line     { font-size: 14px; font-weight: bold; line-height: 1.4; }\n';
            s.textContent += '#detailDialog .dt-jieqi-line    { font-size: 13px; font-weight: bold; line-height: 1.4; }\n';
            s.textContent += '#detailDialog .dt-sub-line      { font-size: 11px; color: #666; line-height: 1.4; }\n';
            s.textContent += '#detailDialog .dt-date-line     { font-size: 11px; color: #666; line-height: 1.4; }\n';
            s.textContent += '#detailDialog .dt-ganzhi-line   { font-size: 13px; line-height: 1.4; letter-spacing: 2px; }\n';

            s.textContent += '#detailDialog .dt-empty-tip     { border: 1px dashed #ccc; padding: 12px 8px; font-size: 12px; color: #999; text-align: center; background: #fafafa; }\n';

            s.textContent += '#detailDialog .dt-notes-block     { margin-top: 0; border: 1px solid #000; background: #fff; padding: 12px 14px; flex: 1 1 auto; min-height: 220px; display: flex; flex-direction: column; }\n';
            s.textContent += '#detailDialog .dt-notes-box       { flex: 1 1 auto; display: flex; flex-direction: column; gap: 0; min-height: 0; overflow-y: auto; padding-left: 0; }\n';
            s.textContent += '#detailDialog .dt-timeline       { position: relative; padding-left: 18px; }\n';
            s.textContent += '#detailDialog .dt-timeline::before { content: ""; position: absolute; left: 4px; top: 0; bottom: 0; width: 2px; background: #000; }\n';
            s.textContent += '#detailDialog .dt-tl-item        { position: relative; padding-bottom: 14px; }\n';
            s.textContent += '#detailDialog .dt-tl-item:last-child { padding-bottom: 0; }\n';
            s.textContent += '#detailDialog .dt-tl-node        { position: absolute; left: -18px; top: 3px; width: 10px; height: 10px; background: #000; }\n';
            s.textContent += '#detailDialog .dt-tl-dy .dt-tl-node { width: 12px; height: 12px; left: -19px; top: 2px; }\n';
            s.textContent += '#detailDialog .dt-tl-ln .dt-tl-node { width: 8px; height: 8px; left: -17px; top: 3px; background: #555; }\n';
            s.textContent += '#detailDialog .dt-tl-ly .dt-tl-node { width: 6px; height: 6px; left: -16px; top: 4px; background: #999; border-radius: 50%; }\n';
            s.textContent += '#detailDialog .dt-tl-title      { font-size: 12px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 3px; color: #000; line-height: 1.5; }\n';
            s.textContent += '#detailDialog .dt-tl-content    { font-size: 13px; line-height: 1.7; color: #333; white-space: pre-wrap; word-break: break-word; padding-left: 0; }\n';
            s.textContent += '#detailDialog .dt-tl-ln         { margin-left: 16px; padding-left: 14px; border-left: 1px solid #aaa; }\n';
            s.textContent += '#detailDialog .dt-tl-ly         { margin-left: 32px; padding-left: 14px; border-left: 1px dashed #ccc; }\n';
            s.textContent += '#detailDialog .dt-tl-dy         { margin-left: 0; }\n';

            s.textContent += '.dt-note-dialog-overlay          { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); z-index: 10001; display: flex; justify-content: center; align-items: center; padding: 20px; }\n';
            s.textContent += '.dt-note-dialog                   { background: #fff; border: 1px solid #000; width: 560px; max-width: 100%; padding: 16px 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }\n';
            s.textContent += '.dt-note-dialog-title             { font-size: 14px; font-weight: bold; letter-spacing: 1px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #000; }\n';
            s.textContent += '.dt-note-dialog-ta                { width: 100%; box-sizing: border-box; border: 1px solid #000; padding: 10px; font-size: 13px; line-height: 1.7; resize: vertical; min-height: 180px; font-family: inherit; outline: none; background: #fff; }\n';
            s.textContent += '.dt-note-dialog-ta:focus          { border: 2px solid #000; padding: 9px; }\n';
            s.textContent += '.dt-note-dialog-btns              { margin-top: 14px; display: flex; justify-content: flex-end; gap: 10px; }\n';
            s.textContent += '.dt-note-dialog-btn               { border: 1px solid #000; background: #fff; padding: 5px 16px; font-size: 13px; cursor: pointer; font-family: inherit; }\n';
            s.textContent += '.dt-note-dialog-btn:hover         { background: #f0f0f0; }\n';
            s.textContent += '.dt-note-dialog-btn:disabled      { opacity: .5; cursor: not-allowed; }\n';
            s.textContent += '.dt-note-dialog-btn:disabled:hover{ background: #fff; }\n';
            s.textContent += '.dt-note-dialog-ok                { background: #000; color: #fff; }\n';
            s.textContent += '.dt-note-dialog-ok:hover          { background: #333; }\n';
            s.textContent += '.dt-note-dialog-ok:disabled:hover { background: #000; }\n';

            s.textContent += '#detailDialog .dt-tab-bar { display:flex; gap:0; margin-bottom:16px; border-bottom:2px solid #000; }\n';
            s.textContent += '#detailDialog .dt-tab { padding:8px 28px; font-size:14px; cursor:pointer; border:1px solid #000; border-bottom:none; background:#fff; color:#000; user-select:none; letter-spacing:1px; }\n';
            s.textContent += '#detailDialog .dt-tab.dt-tab-active { background:#000; color:#fff; }\n';
            s.textContent += '#detailDialog .dt-tab-panel { display:none; }\n';
            s.textContent += '#detailDialog .dt-tab-panel.dt-tab-panel-active { display:block; }\n';

            document.head.appendChild(s);
        })();

        // ========== 构造 DOM ==========
        var overlay = document.createElement('div');
        overlay.id = 'detailDialog';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:9999;display:flex;justify-content:center;align-items:flex-start;padding:40px 0;overflow-y:auto;';

        var box = document.createElement('div');
        box.style.cssText = 'background:#fff;border:1px solid #000;padding:20px;width:900px;max-width:94%;';
        var notesBlockHtml = '<div class="dt-notes-block" id="dtNotesBlock" style="min-height:300px;">' +
            '<div class="dt-block-title">事件记录（双击基本信息页卡片添加）</div>' +
            '<div class="dt-notes-box" id="dtNotesBox"></div>' +
            '</div>';

        box.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
            '<h3 style="margin:0;font-size:16px;font-weight:normal;">案例详情</h3>' +
            '<button id="detailCloseX" style="border:1px solid #000;background:#fff;cursor:pointer;padding:2px 10px;font-size:13px;font-family:inherit;">×</button>' +
            '</div>' +
            '<div class="dt-tab-bar">' +
            '<div class="dt-tab dt-tab-active" data-tab="basic">基本信息</div>' +
            '<div class="dt-tab" data-tab="notes">编辑事件</div>' +
            '</div>' +
            '<div style="max-height:70vh;overflow-y:auto;padding-right:6px;">' +
            '<div class="dt-tab-panel dt-tab-panel-active" id="dtPanelBasic">' +
            basicHtml + noteHtml +
            '</div>' +
            '<div class="dt-tab-panel" id="dtPanelNotes">' +
            baziBlockHtml + yunshiHtml + oldDataHint +
            '</div>' +
            '</div>' +
            '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;padding-top:14px;border-top:1px solid #ccc;">' +
            '<button id="detailCloseBtn" style="border:1px solid #000;background:#fff;color:#000;padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;">关闭</button>' +
            '<button id="detailPaipanBtn" style="border:1px solid #000;background:#000;color:#fff;padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;">排盘</button>' +
            '</div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        function close() { overlay.remove(); }

        document.getElementById('detailCloseX').addEventListener('click', close);
        document.getElementById('detailCloseBtn').addEventListener('click', close);

        // ========== Tab 切换 ==========
        var tabs = box.querySelectorAll('.dt-tab');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) { t.classList.remove('dt-tab-active'); });
                tab.classList.add('dt-tab-active');
                var target = tab.dataset.tab;
                var panelBasic = document.getElementById('dtPanelBasic');
                var panelNotes = document.getElementById('dtPanelNotes');
                if (target === 'basic') {
                    panelBasic.classList.add('dt-tab-panel-active');
                    panelNotes.classList.remove('dt-tab-panel-active');
                } else {
                    panelNotes.classList.add('dt-tab-panel-active');
                    panelBasic.classList.remove('dt-tab-panel-active');
                }
            });
        });

        // ========== 保存信息 ==========
        var dtNameInput = document.getElementById('dtNameInput');
        var dtNoteInput = document.getElementById('dtNoteInput');
        // 描述输入框自动随文字换行变高/变矮（用隐藏镜像 clone 测量真实高度，原输入框永不塌陷，避免打字时外层滚动跳动）
        (function bindAutoResize(ta) {
            if (!ta) return;
            // 1) 拿 min-height 下限（从 CSS 读取，不硬编码）
            var cs = window.getComputedStyle ? window.getComputedStyle(ta) : null;
            var minH = 60;
            if (cs && cs.minHeight) {
                var parsed = parseFloat(cs.minHeight);
                if (!isNaN(parsed)) minH = parsed;
            }

            // 2) 建一个脱离文档流的镜像 clone 去测真实 scrollHeight。
            //    原输入框绝不会被设置成 height='auto'，所以不会塌陷→不触发外层滚动容器的 scrollTop 调整→看不到"上下跳动"
            var clone = null;
            function ensureClone() {
                if (clone) return clone;
                clone = document.createElement('textarea');
                var s = clone.style;
                // 继承所有会影响宽度/换行/高度的样式，确保 clone 与原元素的换行点完全一致
                var src = window.getComputedStyle(ta);
                s.position = 'absolute';
                s.visibility = 'hidden';
                s.top = '-99999px';
                s.left = '-99999px';
                s.height = 'auto';          // 唯一关键：clone 永远 auto，靠 scrollHeight 测
                s.overflow = 'hidden';
                s.resize = 'none';
                s.whiteSpace = 'pre-wrap';
                s.wordWrap = 'break-word';
                s.boxSizing = src.boxSizing;
                s.paddingTop = src.paddingTop;
                s.paddingRight = src.paddingRight;
                s.paddingBottom = src.paddingBottom;
                s.paddingLeft = src.paddingLeft;
                s.borderTopWidth = src.borderTopWidth;
                s.borderRightWidth = src.borderRightWidth;
                s.borderBottomWidth = src.borderBottomWidth;
                s.borderLeftWidth = src.borderLeftWidth;
                s.borderStyle = 'solid';    // 宽度要算，样式设 solid 以免无 border-width 影响盒模型
                s.fontFamily = src.fontFamily;
                s.fontSize = src.fontSize;
                s.fontWeight = src.fontWeight;
                s.fontStyle = src.fontStyle;
                s.letterSpacing = src.letterSpacing;
                s.lineHeight = src.lineHeight;
                s.textIndent = src.textIndent;
                s.textTransform = src.textTransform;
                (document.body || document.documentElement).appendChild(clone);
                return clone;
            }

            function measureScrollHeight() {
                var c = ensureClone();
                // 宽度必须与原元素 clientWidth 一致，否则换行点不同导致高度测不准
                var w = ta.clientWidth;
                if (w > 0) c.style.width = w + 'px';
                c.value = ta.value || '';
                // 处理 placeholder 不会影响，但 value 空行要真实反映换行占位：末尾单个 \n scrollHeight 不计，
                // 手动拼一个字符测了再去掉？不需要：浏览器对末尾 \n 有处理，当前值末尾回车用户期望高度+一行。
                // 修正：如果末尾是换行，scrollHeight 可能不增长，给末尾补一个零宽字符确保最后一行被计入
                if (/[\r\n]$/.test(c.value)) c.value += ' ';
                var sh = c.scrollHeight;
                return sh;
            }

            function resize() {
                var sh = measureScrollHeight();
                var newH = Math.max(sh, minH);
                // 只有高度真的变了才写 style.height，减少 IME 连续触发时的重复 layout
                var curStr = ta.style.height;
                var wantStr = newH + 'px';
                if (curStr !== wantStr) {
                    ta.style.height = wantStr;
                }
            }

            // input 覆盖每一次按键/粘贴/中文选字确认；composition 覆盖 IME 候选窗口在选字过程中的实时高度
            ta.addEventListener('input', resize);
            ta.addEventListener('compositionupdate', function () { resize(); });
            ta.addEventListener('compositionend', function () { resize(); });

            // 首次渲染：下一帧再算（字体/Padding 应用完毕）+ 两帧后再确认一次兜底
            requestAnimationFrame(function () {
                resize();
                requestAnimationFrame(function () { resize(); });
            });

            // 窗口大小变化 → 宽度变化 → 换行点变化 → 重测高度
            window.addEventListener('resize', function () {
                if (!ta.offsetParent) return;
                resize();
            });
        })(dtNoteInput);
        var dtSaveNoteBtn = document.getElementById('dtSaveNoteBtn');
        var dtNoteSaveTip = document.getElementById('dtNoteSaveTip');
        if (dtSaveNoteBtn) {
            dtSaveNoteBtn.addEventListener('click', async function () {
                var newName = dtNameInput.value.trim() || '未命名案例';
                var newNote = dtNoteInput.value;
                var records = global.RecordCache.getRecords();
                var sha = global.RecordCache.getSha();
                if (!records || !sha) { global.UI.showToast('数据未初始化，保存失败'); return; }

                var idx = -1;
                for (var ri = 0; ri < records.length; ri++) {
                    if (records[ri].id === record.id) { idx = ri; break; }
                }
                if (idx === -1) { global.UI.showToast('未找到命例'); return; }

                record.name = newName;
                record.note = newNote;
                records[idx] = record;

                dtSaveNoteBtn.disabled = true;
                dtSaveNoteBtn.style.opacity = '0.5';

                try {
                    var result = await global.GiteeStorage.saveRecords(records, sha);
                    if (result && result.content && result.content.sha) {
                        global.RecordCache.setSha(result.content.sha);
                    } else {
                        try { var fresh = await global.GiteeStorage.fetchRecords(); global.RecordCache.setSha(fresh.sha); } catch (_) { }
                    }
                    dtNoteSaveTip.style.display = 'block';
                    dtNoteSaveTip.textContent = '✓ 已保存';
                    setTimeout(function () { dtNoteSaveTip.style.display = 'none'; }, 2000);
                    if (window.LunarList && window.LunarList.refresh) window.LunarList.refresh();
                } catch (e) {
                    console.error('[note save]', e);
                    global.UI.showToast('保存失败：' + (e.message || '请重试'));
                } finally {
                    dtSaveNoteBtn.disabled = false;
                    dtSaveNoteBtn.style.opacity = '1';
                }
            });
        }
        document.getElementById('detailPaipanBtn').addEventListener('click', function () {
            close();
            var recs = global.RecordCache.getRecords();
            var rec = recs.find(function (x) { return x.id === record.id; });
            if (!rec) return;
            var g = (rec.gender === '女') ? 'female' : 'male';
            var params = '?y=' + rec.year + '&m=' + rec.month + '&d=' + rec.day + '&h=' + (rec.hour || 0) + '&min=' + (rec.minute || 0) + '&g=' + g;
            window.location.href = window.location.pathname + params;
        });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                close();
                document.removeEventListener('keydown', escHandler);
            }
        });
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });

        // ========== 大运/流年/流月 联动 ==========
        if (hasFullData) {
            var currentLiuNians = null;

            var liuNianArea = document.getElementById('dtLiuNianArea');

            function renderLiuNianByPhase(phaseKey) {
                var liunians = Array.isArray(currentLiuNians) ? currentLiuNians : [];

                var titleEl = document.getElementById('dtLiuNianTitle');
                if (titleEl) titleEl.textContent = currentPhaseTitle || '流年';

                if (liunians.length === 0) {
                    liuNianArea.innerHTML = '<div class="dt-empty-tip">该阶段暂无流年数据</div>';
                    var liuYueArea = document.getElementById('dtLiuYueArea');
                    if (liuYueArea) liuYueArea.innerHTML = '';
                    var yueTitle = document.getElementById('dtLiuYueTitle');
                    if (yueTitle) yueTitle.textContent = '流月';
                    return;
                }

                var cards = '';
                currentLiuNians.forEach(function (ln, i) {
                    cards +=
                        '<div class="dt-liunian-card" data-liunian-index="' + i + '">' +
                        '<div class="dt-year-line">' + ln.year + '</div>' +
                        '<div class="dt-sub-line">' + (ln.nianling || '-') + '岁</div>' +
                        '<div class="dt-ganzhi-line">' + (ln.yearGanZhi || '-') + '</div>' +
                        '</div>';
                });
                liuNianArea.innerHTML = '<div class="dt-liunian-grid" id="dtLiuNianGrid">' + cards + '</div>';
                bindLiuNianEvents();
            }

            function renderLiuYueByIndex(lnIdx) {
                var liuYueArea = document.getElementById('dtLiuYueArea');
                if (!liuYueArea || !currentLiuNians || !currentLiuNians[lnIdx]) return;
                var ln = currentLiuNians[lnIdx];
                var months = ln.months || [];

                var yueTitle = document.getElementById('dtLiuYueTitle');
                if (yueTitle) yueTitle.textContent = (ln.yearGanZhi ? ln.yearGanZhi + ' · ' : '') + '流月';

                if (months.length === 0) {
                    liuYueArea.innerHTML = '<div class="dt-empty-tip">该流年暂无流月分段</div>';
                    return;
                }
                var cards = '';
                months.forEach(function (m, i) {
                    var md = m.solarDate;
                    var mmdd = md ? (md.month + '/' + md.day) : '-';
                    cards +=
                        '<div class="dt-liuyue-card" data-liuyue-index="' + i + '">' +
                        '<div class="dt-jieqi-line">' + (m.JieQi || '-') + '</div>' +
                        '<div class="dt-date-line">' + mmdd + '</div>' +
                        '<div class="dt-ganzhi-line">' + (m.ganZhi || '-') + '</div>' +
                        '</div>';
                });
                liuYueArea.innerHTML = '<div class="dt-liuyue-grid">' + cards + '</div>';
            }

            // ========== 事件记录系统 ==========
            var _storedNotes = (record && record.notes && typeof record.notes === 'object') ? record.notes : null;
            var notes = _storedNotes ? JSON.parse(JSON.stringify(_storedNotes)) : {};
            var currentDayunKey = null;
            var currentLiuNianIdx = null;
            var currentLiuYueIdx = null;
            var currentPhaseLiunians = [];
            var currentPhaseTitle = '流年';

            async function saveNotesToGitee(record, notes, key, prevValue) {
                var records = global.RecordCache.getRecords();
                var sha = global.RecordCache.getSha();
                if (!records || !sha) { global.UI.showToast('数据未初始化，保存失败'); return false; }

                var idx = -1;
                for (var i = 0; i < records.length; i++) {
                    if (records[i].id === record.id) { idx = i; break; }
                }
                if (idx === -1) { global.UI.showToast('未找到命例，保存失败'); return false; }

                record.notes = notes;
                records[idx] = record;

                try {
                    var result = await global.GiteeStorage.saveRecords(records, sha);
                    if (result && result.content && result.content.sha) {
                        global.RecordCache.setSha(result.content.sha);
                    } else {
                        try { var fresh = await global.GiteeStorage.fetchRecords(); global.RecordCache.setSha(fresh.sha); } catch (_) { }
                    }
                    global.UI.showToast('已保存到云端');
                    return true;
                } catch (e) {
                    console.error('[notes save]', e);
                    global.UI.showToast('保存失败：' + (e.message || '请重试'));
                    if (prevValue == null || prevValue === '') delete notes[key];
                    else notes[key] = prevValue;
                    record.notes = notes;
                    renderNotes();
                    return false;
                }
            }

            function showNoteDialog(title, initValue, onConfirm) {
                var dialogId = 'dtNoteDialog';
                if (document.getElementById(dialogId)) return;
                var dialog = document.createElement('div');
                dialog.id = dialogId;
                dialog.className = 'dt-note-dialog-overlay';
                dialog.innerHTML =
                    '<div class="dt-note-dialog">' +
                    '<div class="dt-note-dialog-title">' + title + '</div>' +
                    '<textarea class="dt-note-dialog-ta" rows="8" spellcheck="false" placeholder="记录这段时期发生的事…"></textarea>' +
                    '<div class="dt-note-dialog-btns">' +
                    '<button class="dt-note-dialog-btn dt-note-dialog-cancel" type="button">取消</button>' +
                    '<button class="dt-note-dialog-btn dt-note-dialog-ok" type="button">确认</button>' +
                    '</div>' +
                    '</div>';
                document.body.appendChild(dialog);

                var ta = dialog.querySelector('.dt-note-dialog-ta');
                ta.value = initValue || '';
                setTimeout(function () { ta.focus(); if (ta.value) ta.setSelectionRange(ta.value.length, ta.value.length); }, 0);

                function closeDialog() { var x = document.getElementById(dialogId); if (x) x.remove(); }

                function ok() {
                    var v = (ta.value || '').replace(/\r\n/g, '\n').trim();
                    var okBtn = dialog.querySelector('.dt-note-dialog-ok');
                    var cancelBtn = dialog.querySelector('.dt-note-dialog-cancel');
                    if (okBtn.disabled) return;
                    var origText = okBtn.textContent;
                    okBtn.disabled = true;
                    cancelBtn.disabled = true;
                    okBtn.textContent = '保存中...';
                    var ret;
                    try { ret = onConfirm ? onConfirm(v) : undefined; }
                    catch (err) {
                        console.error(err);
                        okBtn.disabled = false;
                        cancelBtn.disabled = false;
                        okBtn.textContent = origText;
                        return;
                    }
                    Promise.resolve(ret).then(function (success) {
                        if (success === false) {
                            okBtn.disabled = false;
                            cancelBtn.disabled = false;
                            okBtn.textContent = origText;
                            return;
                        }
                        closeDialog();
                    }).catch(function (err) {
                        console.error(err);
                        okBtn.disabled = false;
                        cancelBtn.disabled = false;
                        okBtn.textContent = origText;
                    });
                }

                dialog.addEventListener('click', function (e) {
                    if (e.target === dialog) closeDialog();
                });
                dialog.querySelector('.dt-note-dialog-cancel').addEventListener('click', closeDialog);
                dialog.querySelector('.dt-note-dialog-ok').addEventListener('click', ok);
                ta.addEventListener('keydown', function (e) {
                    if (e.key === 'Escape') { e.preventDefault(); closeDialog(); }
                    else if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.keyCode === 13)) { e.preventDefault(); ok(); }
                });
            }

            function renderNotes() {
                var box = document.getElementById('dtNotesBox');
                if (!box) return;
                if (currentDayunKey == null) {
                    box.innerHTML = '<div class="dt-empty-tip">请从上方选择一个大运</div>';
                    return;
                }
                var phase = null;
                if (allPhase) {
                    for (var i = 0; i < allPhase.length; i++) {
                        if (String(allPhase[i].phaseKey) === String(currentDayunKey)) { phase = allPhase[i]; break; }
                    }
                }
                var dayunTitle = phase && phase.title ? phase.title : ('大运 · ' + currentDayunKey);
                var html = '<div class="dt-timeline">';

                var dk = 'dayun:' + currentDayunKey;
                var dyMeta = noteMeta(notes[dk]);
                var dyTitleParts = ['【大运】'];
                // 基于大运卡片本身的数据补齐，然后用保存的元数据优先覆盖
                var dyYear = '', dyGz = '', dyAge = '';
                if (currentDayunKey === 'pre') {
                    if (typeof prePhase !== 'undefined' && prePhase) {
                        dyYear = prePhase.labelYear || '';
                        dyGz = '小运';
                        dyAge = prePhase.labelAge || '';
                    }
                } else if (phase) {
                    dyYear = phase.starYear || '';
                    dyGz = phase.dayunganzhi || '';
                    dyAge = phase.startAge != null ? phase.startAge : '';
                }
                if (dyMeta.year) dyYear = dyMeta.year;
                if (dyMeta.ganzhi) dyGz = dyMeta.ganzhi;
                if (dyMeta.age !== '' && dyMeta.age != null) dyAge = dyMeta.age;
                if (dyYear) dyTitleParts.push(dyYear);
                if (dyGz) dyTitleParts.push(dyGz);
                if (dyAge !== '' && dyAge != null) dyTitleParts.push(dyAge + '岁');

                var lnGroups = [];
                if (currentPhaseLiunians && currentPhaseLiunians.length) {
                    for (var li2 = 0; li2 < currentPhaseLiunians.length; li2++) {
                        var ln2 = currentPhaseLiunians[li2];
                        var lnk2 = 'liunian:' + currentDayunKey + ':' + li2;
                        var lnHasText2 = !!noteText(notes[lnk2]);
                        var lyItems2 = [];
                        if (ln2.months && ln2.months.length) {
                            for (var mj2 = 0; mj2 < ln2.months.length; mj2++) {
                                var ly2 = ln2.months[mj2];
                                var lyk2 = 'liuyue:' + currentDayunKey + ':' + li2 + ':' + mj2;
                                if (noteText(notes[lyk2])) {
                                    var lyMeta2 = noteMeta(notes[lyk2]);
                                    var md2 = ly2.solarDate;
                                    var yueStr = (md2 && md2.month != null && md2.day != null)
                                        ? (md2.month + '/' + md2.day)
                                        : ('第' + (mj2 + 1));
                                    var lyParts2 = ['【流月】', yueStr];
                                    if (lyMeta2.ganzhi) lyParts2.push(lyMeta2.ganzhi);
                                    lyItems2.push({ title: lyParts2.join(' '), text: noteText(notes[lyk2]) });
                                }
                            }
                        }
                        if (lnHasText2 || lyItems2.length > 0) {
                            lnGroups.push({ ln: ln2, lnIdx: li2, lnItem: ln2, lyItems: lyItems2 });
                        }
                    }
                }

                var dyHasText = !!noteText(notes[dk]);
                if (dyHasText || lnGroups.length > 0) {
                    html += '<div class="dt-tl-item dt-tl-dy">';
                    html += '<div class="dt-tl-node"></div>';
                    html += '<div class="dt-tl-title">' + dyTitleParts.join(' ') + '</div>';
                    if (dyHasText) {
                        html += '<div class="dt-tl-content">' + escAndBreak(noteText(notes[dk])) + '</div>';
                    }

                    lnGroups.forEach(function (g) {
                        var lnMeta = noteMeta(notes['liunian:' + currentDayunKey + ':' + g.lnIdx]);
                        var lnYear = lnMeta.year || (g.ln.year || '');
                        var lnGz = lnMeta.ganzhi || (g.ln.yearGanZhi || '');
                        var lnAge = (lnMeta.age !== '' && lnMeta.age != null) ? lnMeta.age : (g.ln.nianling != null ? g.ln.nianling : '');
                        var lnTitle = '【流年】' + lnYear + ' ' + lnGz + (lnAge !== '' ? ' · ' + lnAge + '岁' : '');

                        html += '<div class="dt-tl-item dt-tl-ln">';
                        html += '<div class="dt-tl-node"></div>';
                        html += '<div class="dt-tl-title">' + lnTitle + '</div>';
                        if (noteText(notes['liunian:' + currentDayunKey + ':' + g.lnIdx])) {
                            html += '<div class="dt-tl-content">' + escAndBreak(noteText(notes['liunian:' + currentDayunKey + ':' + g.lnIdx])) + '</div>';
                        }

                        g.lyItems.forEach(function (ly) {
                            html += '<div class="dt-tl-item dt-tl-ly">';
                            html += '<div class="dt-tl-node"></div>';
                            html += '<div class="dt-tl-title">' + ly.title + '</div>';
                            html += '<div class="dt-tl-content">' + escAndBreak(ly.text) + '</div>';
                            html += '</div>';
                        });

                        html += '</div>';
                    });

                    html += '</div>';
                }

                html += '</div>';

                if (!dyHasText && lnGroups.length === 0) {
                    html = '<div class="dt-empty-tip">双击上方任一卡片（大运 / 流年 / 流月），记录【' + dayunTitle + '】期间发生的事</div>';
                }
                box.innerHTML = html;
            }

            // ========== 大运事件绑定 ==========
            var dtGrid = document.getElementById('dtDayunGrid');
            var liuYueAreaRoot = document.getElementById('dtLiuYueArea');

            function clearSelectedDayun() {
                if (!dtGrid) return;
                dtGrid.querySelectorAll('.dt-dayun-card').forEach(function (c) { c.classList.remove('dt-current'); });
            }
            function selectDayunByKey(key) {
                if (!dtGrid) return;
                clearSelectedDayun();
                var el = dtGrid.querySelector('.dt-dayun-card[data-dayun-index="' + key + '"]');
                if (el) el.classList.add('dt-current');
            }

            if (dtGrid) {
                dtGrid.addEventListener('click', function (e) {
                    var card = e.target.closest('.dt-dayun-card');
                    if (!card || card.classList.contains('dt-empty')) return;
                    if (card.classList.contains('dt-current')) return;
                    var key = card.dataset.dayunIndex;
                    selectDayunByKey(key);
                    currentDayunKey = key;
                    currentLiuNianIdx = null;
                    currentLiuYueIdx = null;
                    var phase = null;
                    if (key == "pre") {
                        phase = (typeof prePhase !== 'undefined') ? prePhase : null;
                    } else if (allPhase) {
                        for (var pi = 0; pi < allPhase.length; pi++) {
                            if (String(allPhase[pi].phaseKey) === String(key)) { phase = allPhase[pi]; break; }
                        }
                    }
                    let filered = null;
                    try {
                        var _dt = dtDateZhuanhuan(record.solar);
                        var dayunIdxForCalc = (key == "pre") ? null : (Number(key) - 1);
                        if (key == "pre") {
                            filered = global.BaZiCalc.getYearRange(_dt, _dtGender);
                        } else if (dayunIdxForCalc >= 0 && dayunIdxForCalc <= 11) {
                            filered = global.BaZiCalc.generateLunarMonths(_dt, _dtGender, dayunIdxForCalc);
                        } else {
                            filered = [];
                        }
                    } catch (e) {
                        console.warn('[案例详情] BaZiCalc 流年生成失败 key=' + key + '：', e);
                        filered = null;
                    }
                    if (!Array.isArray(filered)) filered = [];

                    if (phase) {
                        try { phase.liunians = filered; } catch (e) { }
                        if (!phase.title) {
                            try { phase.title = (key === 'pre') ? '起运前流年' : ((phase.phaseName || phase.dayunganzhi || '大运') + '·流年'); } catch (e) { }
                        }
                    }
                    currentPhaseLiunians = filered;
                    currentLiuNians = filered;
                    currentPhaseTitle = (key === 'pre') ? '起运前流年' : ((phase && (phase.phaseName || phase.dayunganzhi)) ? ((phase.phaseName || phase.dayunganzhi) + '·流年') : '流年');
                    renderNotes();

                    renderLiuNianByPhase(key);
                    var firstLn = document.querySelector('#dtLiuNianGrid .dt-liunian-card[data-liunian-index="0"]');
                    if (firstLn) firstLn.classList.add('dt-current');
                    currentLiuNianIdx = 0;
                    currentLiuYueIdx = null;
                    renderNotes();
                    renderLiuYueByIndex(0);
                });

                dtGrid.addEventListener('dblclick', function (e) {
                    var card = e.target.closest('.dt-dayun-card');
                    if (!card || card.classList.contains('dt-empty')) return;
                    var key = card.dataset.dayunIndex;
                    var phase = null;
                    if (allPhase) {
                        for (var pi = 0; pi < allPhase.length; pi++) {
                            if (String(allPhase[pi].phaseKey) === String(key)) { phase = allPhase[pi]; break; }
                        }
                    }
                    var dlgTitle = '记录【大运】' + (phase && phase.title ? phase.title : key) + ' 发生的事';
                    var k = 'dayun:' + key;
                    var initText = noteText(notes[k]);
                    var dyYear = (key === 'pre') ? (typeof prePhase !== 'undefined' ? prePhase.labelYear : '') : (phase ? phase.starYear : '');
                    var dyGz = (key === 'pre') ? '小运' : (phase ? phase.dayunganzhi : '');
                    var dyAge = (key === 'pre') ? (typeof prePhase !== 'undefined' ? prePhase.labelAge : '') : (phase ? phase.startAge : '');
                    showNoteDialog(dlgTitle, initText, async function (newText) {
                        var prev = notes[k] || '';
                        if (!newText) delete notes[k];
                        else notes[k] = { text: newText, year: dyYear, ganzhi: dyGz, age: dyAge };
                        renderNotes();
                        return await saveNotesToGitee(record, notes, k, prev);
                    });
                });
                dtGrid.addEventListener('mouseover', function (e) {
                    var card = e.target.closest('.dt-dayun-card');
                    if (!card || card.classList.contains('dt-empty')) return;
                    card.classList.add('dt-hover');
                });
                dtGrid.addEventListener('mouseout', function (e) {
                    var card = e.target.closest('.dt-dayun-card');
                    if (!card || card.classList.contains('dt-empty')) return;
                    card.classList.remove('dt-hover');
                });
            }

            // ========== 流年事件绑定 ==========
            function bindLiuNianEvents() {
                var lnGrid = document.getElementById('dtLiuNianGrid');
                if (!lnGrid) return;

                function clearSel() { lnGrid.querySelectorAll('.dt-liunian-card').forEach(function (c) { c.classList.remove('dt-current'); }); }
                function selByIdx(idx) {
                    clearSel();
                    var el = lnGrid.querySelector('.dt-liunian-card[data-liunian-index="' + idx + '"]');
                    if (el) el.classList.add('dt-current');
                }

                lnGrid.addEventListener('click', function (e) {
                    var card = e.target.closest('.dt-liunian-card');
                    if (!card) return;
                    if (card.classList.contains('dt-current')) return;
                    var idx = card.dataset.liunianIndex;
                    selByIdx(idx);
                    var intIdx = parseInt(idx, 10);
                    currentLiuNianIdx = intIdx;
                    currentLiuYueIdx = null;
                    renderNotes();

                    renderLiuYueByIndex(intIdx);
                    if (liuYueAreaRoot) liuYueAreaRoot.querySelectorAll('.dt-liuyue-card').forEach(function (c) { c.classList.remove('dt-current'); });
                });
                lnGrid.addEventListener('dblclick', function (e) {
                    var card = e.target.closest('.dt-liunian-card');
                    if (!card) return;
                    var idx = card.dataset.liunianIndex;
                    var intIdx = parseInt(idx, 10);
                    var ln = (currentPhaseLiunians && currentPhaseLiunians[intIdx]) ? currentPhaseLiunians[intIdx] : null;
                    var phaseTitle = '大运';
                    if (allPhase && currentDayunKey != null) {
                        for (var pi = 0; pi < allPhase.length; pi++) {
                            if (String(allPhase[pi].phaseKey) === String(currentDayunKey)) {
                                phaseTitle = allPhase[pi].title || phaseTitle;
                                break;
                            }
                        }
                    }
                    var lnSubTitle = ln
                        ? (ln.year + ' ' + (ln.yearGanZhi || '') + ' · ' + (ln.nianling != null ? ln.nianling + '岁' : ''))
                        : ('第 ' + intIdx + ' 个流年');
                    var dlgTitle = '记录【' + phaseTitle + ' / 流年】' + lnSubTitle + ' 发生的事';
                    var k = 'liunian:' + currentDayunKey + ':' + intIdx;
                    var initText = noteText(notes[k]);
                    var lnYear = ln ? ln.year : '';
                    var lnGz = ln ? ln.yearGanZhi : '';
                    var lnAge = ln ? ln.nianling : '';
                    showNoteDialog(dlgTitle, initText, async function (newText) {
                        var prev = notes[k] || '';
                        if (!newText) delete notes[k];
                        else notes[k] = { text: newText, year: lnYear, ganzhi: lnGz, age: lnAge };
                        renderNotes();
                        return await saveNotesToGitee(record, notes, k, prev);
                    });
                });
                lnGrid.addEventListener('mouseover', function (e) {
                    var card = e.target.closest('.dt-liunian-card');
                    if (!card) return;
                    card.classList.add('dt-hover');
                });
                lnGrid.addEventListener('mouseout', function (e) {
                    var card = e.target.closest('.dt-liunian-card');
                    if (!card) return;
                    card.classList.remove('dt-hover');
                });
            }

            // ========== 流月事件绑定 ==========
            if (liuYueAreaRoot) {
                liuYueAreaRoot.addEventListener('click', function (e) {
                    var card = e.target.closest('.dt-liuyue-card');
                    if (!card) return;
                    if (card.classList.contains('dt-current')) return;
                    liuYueAreaRoot.querySelectorAll('.dt-liuyue-card').forEach(function (c) { c.classList.remove('dt-current'); });
                    card.classList.add('dt-current');
                    currentLiuYueIdx = parseInt(card.dataset.liuyueIndex, 10);
                    renderNotes();
                });
                liuYueAreaRoot.addEventListener('dblclick', function (e) {
                    var card = e.target.closest('.dt-liuyue-card');
                    if (!card) return;
                    var lyIdx = parseInt(card.dataset.liuyueIndex, 10);
                    if (isNaN(lyIdx)) return;
                    var ln = (currentPhaseLiunians && currentLiuNianIdx != null) ? currentPhaseLiunians[currentLiuNianIdx] : null;
                    var ly = (ln && ln.months && ln.months[lyIdx]) ? ln.months[lyIdx] : null;
                    var phaseTitle = '大运';
                    if (allPhase && currentDayunKey != null) {
                        for (var pi = 0; pi < allPhase.length; pi++) {
                            if (String(allPhase[pi].phaseKey) === String(currentDayunKey)) {
                                phaseTitle = allPhase[pi].title || phaseTitle;
                                break;
                            }
                        }
                    }
                    var lnSubTitle = ln
                        ? (ln.year + ' ' + (ln.yearGanZhi || '') + ' · ' + (ln.nianling != null ? ln.nianling + '岁' : ''))
                        : '流年';
                    var md = (ly && ly.solarDate) ? ly.solarDate : null;
                    var mmdd = md ? (md.month + '/' + md.day) : '-';
                    var lySubTitle = ly
                        ? ((ly.JieQi || '-') + ' ' + (ly.ganZhi || '') + ' · ' + mmdd)
                        : ('第 ' + lyIdx + ' 月');
                    var dlgTitle = '记录【' + phaseTitle + ' / ' + lnSubTitle + ' · 流月】' + lySubTitle + ' 发生的事';
                    var k = 'liuyue:' + currentDayunKey + ':' + currentLiuNianIdx + ':' + lyIdx;
                    var initText = noteText(notes[k]);
                    var lyGz = ly ? ly.ganZhi : '';
                    var lyYear = ln ? ln.year : '';
                    var lyAge = ln ? ln.nianling : '';
                    var lyMd = mmdd || '';
                    showNoteDialog(dlgTitle, initText, async function (newText) {
                        var prev = notes[k] || '';
                        if (!newText) delete notes[k];
                        else notes[k] = { text: newText, year: lyYear, ganzhi: lyGz, age: lyAge, md: lyMd };
                        renderNotes();
                        return await saveNotesToGitee(record, notes, k, prev);
                    });
                });
                liuYueAreaRoot.addEventListener('mouseover', function (e) {
                    var card = e.target.closest('.dt-liuyue-card');
                    if (!card) return;
                    card.classList.add('dt-hover');
                });
                liuYueAreaRoot.addEventListener('mouseout', function (e) {
                    var card = e.target.closest('.dt-liuyue-card');
                    if (!card) return;
                    card.classList.remove('dt-hover');
                });
            }

            // ========== 默认选中 ==========
            if (typeof prePhase !== 'undefined' && prePhase) {
                var firstPhase = prePhase;
                var firstKey = 'pre';
                currentDayunKey = firstKey;
                currentLiuNianIdx = null;
                currentLiuYueIdx = null;

                try {
                    var _dt = dtDateZhuanhuan(record.solar);
                    var preFiltered = global.BaZiCalc.getYearRange(_dt, _dtGender);
                    if (Array.isArray(preFiltered)) {
                        try { firstPhase.liunians = preFiltered; } catch (e) { }
                        try { if (!firstPhase.title) firstPhase.title = '起运前流年'; } catch (e) { }
                    }
                } catch (e) { console.warn('[案例详情] 默认童限流年生成失败：', e); }
                if (!firstPhase.liunians || !Array.isArray(firstPhase.liunians)) firstPhase.liunians = [];
                currentPhaseLiunians = firstPhase.liunians;
                currentLiuNians = firstPhase.liunians;
                currentPhaseTitle = firstPhase.title || '起运前流年';

                selectDayunByKey(firstKey);
                renderNotes();
                renderLiuNianByPhase(firstKey);
                var firstLn = document.querySelector('#dtLiuNianGrid .dt-liunian-card[data-liunian-index="0"]');
                if (firstLn) firstLn.classList.add('dt-current');
                currentLiuNianIdx = 0;
                currentLiuYueIdx = null;
                renderNotes();
                renderLiuYueByIndex(0);
            }
        }
    }

    global.DetailDialog = { showDetailDialog };
})(window);