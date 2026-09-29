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
                   (label ? '<div style="font-size:10px;color:#8f959e;margin-bottom:3px;">' + label + '</div>' : '') +
                   '<div style="font-size:18px;font-weight:bold;line-height:1.2;color:#1f2329;">' + stem + '</div>' +
                   '<div style="border-top:1px solid #e0e1e5;width:100%;margin:3px 0;"></div>' +
                   '<div style="font-size:18px;font-weight:bold;line-height:1.2;color:#1f2329;">' + branch + '</div>' +
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
        // 日柱标签按性别显示「元男 / 元女」
        var isMale = (fb && fb.inputParams && fb.inputParams.gender)
            ? fb.inputParams.gender === 'male'
            : String(record.gender || '').indexOf('男') >= 0;
        var dayLabel = isMale ? '元男' : '元女';
        var baziHtml = '<div style="display:flex;gap:14px;margin-top:8px;">' +
            makePillar(yStem, yBranch, '年柱') +
            makePillar(mStem, mBranch, '月柱') +
            makePillar(dStem, dBranch, dayLabel) +
            makePillar(hStem, hBranch, '时柱') +
            '</div>';

        var basicHtml =
            '<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #f1f2f4;">' +
            '<div style="display:flex;align-items:center;margin-bottom:8px;">' +
            '<input id="dtNameInput" value="' + (record.name || '未命名案例') + '" style="font-size:16px;font-weight:bold;border:1px solid transparent;padding:4px 6px;margin-right:10px;font-family:inherit;outline:none;background:transparent;color:#1f2329;min-width:200px;border-radius:6px;transition:all .15s;" onfocus="this.style.borderColor=\'#d8d8dc\';this.style.background=\'#fff\';this.select()" onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'">' +
            '<span style="font-size:12px;font-weight:normal;background:#f2f3f5;color:#646a73;padding:2px 10px;border-radius:999px;">' + (record.gender || '') + '</span></div>' +
            '<div style="font-size:12px;color:#8f959e;">创建时间：' + ts + '</div>' +
            '</div>';

        // 司令/胎元/交运：保存端已不再落库这几个派生字段，
        // 缺失时用出生信息（inputParams → record 字段）现场重算；老记录仍优先用已存值
        var derivedInfo = (function () {
            var out = {
                siLing: (fb && fb.siLing) || '',
                taiYuan: (fb && fb.taiYuan) || '',
                jiaoYun: (fb && fb.jiaoYun) || null
            };
            if (out.siLing && out.taiYuan && out.jiaoYun) return out;
            if (!global.BaZiCalc) return out;

            var seed = null;
            if (fb && fb.inputParams && fb.inputParams.year != null && fb.inputParams.month != null && fb.inputParams.day != null) {
                seed = {
                    year: Number(fb.inputParams.year),
                    month: Number(fb.inputParams.month),
                    day: Number(fb.inputParams.day),
                    hour: Number(fb.inputParams.hour) || 12,
                    minute: Number(fb.inputParams.minute != null ? fb.inputParams.minute : 0),
                    gender: normalizeGender(fb.inputParams.gender)
                };
            } else {
                seed = assembleSeedFromRecord();
            }
            if (!seed) return out;
            if (!seed.gender) seed.gender = normalizeGender(record.gender || (fb && fb.qianKun)) || 'male';

            try {
                var genderCode = seed.gender === 'male' ? 1 : 0;
                if (!out.siLing && global.BaZiCalc.getSiLingFromRysl && typeof SolarTime !== 'undefined') {
                    out.siLing = global.BaZiCalc.getSiLingFromRysl(
                        SolarTime.fromYmdHms(seed.year, seed.month, seed.day, seed.hour, seed.minute, 0)
                    );
                }
                if (!out.taiYuan && global.BaZiCalc.getTaiYuan) {
                    out.taiYuan = global.BaZiCalc.getTaiYuan(seed);
                }
                if (!out.jiaoYun && global.BaZiCalc.getJiaoYunInfo) {
                    out.jiaoYun = global.BaZiCalc.getJiaoYunInfo(seed, genderCode).jiaoYun;
                }
            } catch (e) { }

            return out;
        })();

        // 公历/农历/时辰/司令/胎元/交运文字行。
        // 内嵌排盘可用时这些信息由排盘卡片承担，此处不再渲染，避免同一页出现两遍。
        var infoLinesHtml =
            '<div style="line-height:1.9;font-size:13px;">' +
            '<div>公历：' + (fb ? (fb.solarDate + ' ' + (fb.shiChen || '')) : (record.solar || '')) + '</div>' +
            '<div>农历：' + (fb ? (fb.lunarDate + ' ' + (fb.shiChen || '')) : '-') + '</div>' +
            (fb && fb.shiChen ? '<div>时辰：' + fb.shiChen + '</div>' : '') +
            (derivedInfo.siLing ? '<div>司令：' + derivedInfo.siLing + '</div>' : '') +
            (derivedInfo.taiYuan ? '<div>胎元：' + derivedInfo.taiYuan + '</div>' : '') +
            (derivedInfo.jiaoYun ? '<div>交运：' + derivedInfo.jiaoYun.jieQi + derivedInfo.jiaoYun.days + '天' + derivedInfo.jiaoYun.hours + '小时（' + derivedInfo.jiaoYun.jiaoYunGan + '）</div>' : '') +
            '</div>';

        // 描述块：位于基本信息与四柱之间
        var noteHtml =
            '<div style="margin-bottom:14px;padding:10px 12px;border:1px solid #e8e8ec;border-radius:10px;background:#fafafb;">' +
            '<div style="font-size:12px;color:#8f959e;margin-bottom:5px;">描述</div>' +
            '<textarea id="dtNoteInput" style="width:100%;box-sizing:border-box;border:1px solid #d8d8dc;border-radius:8px;padding:8px 10px;font-size:13px;line-height:1.7;min-height:60px;resize:none;overflow:hidden;font-family:inherit;outline:none;background:#fff;transition:border-color .15s, box-shadow .15s;">' +
            (record.note || '') +
            '</textarea>' +
            '<div style="display:flex;justify-content:flex-end;align-items:center;margin-top:8px;gap:12px;">' +
            '<div id="dtNoteSaveTip" style="font-size:12px;color:#8f959e;display:none;">✓ 已保存</div>' +
            '<button id="dtSaveNoteBtn" style="border:1px solid #1a1a1a;background:#1a1a1a;color:#fff;padding:6px 22px;font-size:13px;cursor:pointer;font-family:inherit;letter-spacing:1px;border-radius:8px;transition:background .15s;">保存信息</button>' +
            '</div>' +
            '</div>';

        var baziBlockHtml = '<div style="margin-top:12px;padding:10px 12px;border:1px solid #e8e8ec;border-radius:10px;background:#fff;">' + baziHtml + '</div>';

        // ===== 内嵌排盘（复用 bazi.html）=====
        // 案例里已存有出生信息（fullBazi.inputParams，缺失时回退到 record 顶层字段），
        // 因此可以直接拼 URL 复用已封装好的排盘页。
        // embed=1 的语义见 bazi.js：内容与万年历大页面一致（四柱 + 司令/胎元/交运 + 大运/流年/流月 + 选中面板），
        // 仅隐藏"复制八字/保存"按钮（保存会往 Gitee 新增命例）。
        function buildEmbedSrc() {
            var s = null;
            var ip = fb && fb.inputParams;
            if (ip && ip.year != null && ip.month != null && ip.day != null) {
                s = {
                    year: Number(ip.year), month: Number(ip.month), day: Number(ip.day),
                    hour: ip.hour != null ? Number(ip.hour) : 0,
                    minute: ip.minute != null ? Number(ip.minute) : 0,
                    gender: normalizeGender(ip.gender)
                };
            } else if (record.year != null && record.month != null && record.day != null) {
                s = {
                    year: Number(record.year), month: Number(record.month), day: Number(record.day),
                    hour: Number(record.hour) || 0,
                    minute: Number(record.minute) || 0,
                    gender: normalizeGender(record.gender || (fb && fb.qianKun))
                };
            }
            if (!s || !s.year || !s.month || !s.day) return '';
            if (!s.gender) s.gender = 'male';
            return 'bazi.html?embed=1&y=' + s.year + '&m=' + s.month + '&d=' + s.day +
                   '&h=' + s.hour + '&min=' + s.minute + '&g=' + s.gender;
        }
        var embedSrc = buildEmbedSrc();

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
                        derivedInfo.jiaoYun ? derivedInfo.jiaoYun.yearGan : undefined,
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

            // 「编辑事件」Tab = 事件步骤器：整页只显示全部已录入事件的时间线，
            // 点击任一条目即可编辑。添加新事件走「基本信息」页排盘的双击。
            yunshiHtml =
                '<div class="dt-notes-block" id="dtNotesBlock" style="min-height:300px;">' +
                '<div class="dt-block-title">事件记录（在「基本信息」页的排盘上双击大运/流年/流月添加）</div>' +
                '<div class="dt-notes-box" id="dtNotesBox"></div>' +
                '</div>';
        }

        var oldDataHint = '';
        if (!hasFullData) {
            var tipBorder = 'margin-top:12px;padding:10px 12px;border:1px dashed #d8d8dc;border-radius:8px;color:#646a73;font-size:12px;line-height:1.7;background:#fafafb;';
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

            s.textContent += '#detailDialog .dt-block-title { font-size: 13px; font-weight: bold; padding: 0 2px 8px 2px; border-bottom: 1px solid #f1f2f4; margin-bottom: 12px; letter-spacing: 1px; color: #1f2329; }\n';

            s.textContent += '#detailDialog .dt-empty-tip     { border: 1px dashed #d8d8dc; border-radius: 8px; padding: 14px 8px; font-size: 12px; color: #8f959e; text-align: center; background: #fafafb; }\n';

            s.textContent += '#detailDialog .dt-notes-block     { margin-top: 0; border: 1px solid #e8e8ec; border-radius: 12px; background: #fff; padding: 14px 16px; flex: 1 1 auto; min-height: 220px; display: flex; flex-direction: column; }\n';
            s.textContent += '#detailDialog .dt-notes-box       { flex: 1 1 auto; display: flex; flex-direction: column; gap: 0; min-height: 0; overflow-y: auto; padding-left: 0; }\n';
            s.textContent += '#detailDialog .dt-timeline       { position: relative; padding-left: 18px; }\n';
            s.textContent += '#detailDialog .dt-timeline::before { content: ""; position: absolute; left: 4px; top: 0; bottom: 0; width: 2px; background: #e8e8ec; }\n';
            s.textContent += '#detailDialog .dt-tl-item        { position: relative; padding-bottom: 14px; }\n';
            s.textContent += '#detailDialog .dt-tl-item:last-child { padding-bottom: 0; }\n';
            s.textContent += '#detailDialog .dt-tl-node        { position: absolute; left: -18px; top: 3px; width: 10px; height: 10px; background: #1a1a1a; border-radius: 3px; }\n';
            s.textContent += '#detailDialog .dt-tl-dy .dt-tl-node { width: 12px; height: 12px; left: -19px; top: 2px; }\n';
            s.textContent += '#detailDialog .dt-tl-ln .dt-tl-node { width: 8px; height: 8px; left: -17px; top: 3px; background: #8f959e; border-radius: 50%; }\n';
            s.textContent += '#detailDialog .dt-tl-ly .dt-tl-node { width: 6px; height: 6px; left: -16px; top: 4px; background: #c2c7ce; border-radius: 50%; }\n';
            s.textContent += '#detailDialog .dt-tl-title      { font-size: 12px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 3px; color: #1f2329; line-height: 1.5; }\n';
            s.textContent += '#detailDialog .dt-tl-content    { font-size: 13px; line-height: 1.7; color: #42474e; white-space: pre-wrap; word-break: break-word; padding-left: 0; }\n';
            s.textContent += '#detailDialog .dt-tl-ln         { margin-left: 16px; padding-left: 14px; border-left: 1px solid #e0e1e5; }\n';
            s.textContent += '#detailDialog .dt-tl-ly         { margin-left: 32px; padding-left: 14px; border-left: 1px dashed #e0e1e5; }\n';
            s.textContent += '#detailDialog .dt-tl-dy         { margin-left: 0; }\n';

            s.textContent += '.dt-note-dialog-overlay          { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(31,35,41,0.4); z-index: 10001; display: flex; justify-content: center; align-items: center; padding: 20px; }\n';
            s.textContent += '.dt-note-dialog                   { background: #fff; border: 1px solid #e8e8ec; border-radius: 14px; width: 560px; max-width: 100%; padding: 18px 20px; box-shadow: 0 12px 48px rgba(31,35,41,0.2); }\n';
            s.textContent += '.dt-note-dialog-title             { font-size: 14px; font-weight: bold; letter-spacing: 1px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f1f2f4; }\n';
            s.textContent += '.dt-note-dialog-ta                { width: 100%; box-sizing: border-box; border: 1px solid #d8d8dc; border-radius: 8px; padding: 10px; font-size: 13px; line-height: 1.7; resize: vertical; min-height: 180px; font-family: inherit; outline: none; background: #fff; transition: border-color .15s, box-shadow .15s; }\n';
            s.textContent += '.dt-note-dialog-ta:focus          { border-color: #1a1a1a; box-shadow: 0 0 0 3px rgba(26,26,26,0.08); }\n';
            s.textContent += '.dt-note-dialog-btns              { margin-top: 14px; display: flex; justify-content: flex-end; gap: 10px; }\n';
            s.textContent += '.dt-note-dialog-btn               { border: 1px solid #d8d8dc; border-radius: 8px; background: #fff; padding: 6px 18px; font-size: 13px; cursor: pointer; font-family: inherit; color: #1f2329; transition: all .15s; }\n';
            s.textContent += '.dt-note-dialog-btn:hover         { background: #f2f3f5; }\n';
            s.textContent += '.dt-note-dialog-btn:disabled      { opacity: .5; cursor: not-allowed; }\n';
            s.textContent += '.dt-note-dialog-btn:disabled:hover{ background: #fff; }\n';
            s.textContent += '.dt-note-dialog-ok                { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }\n';
            s.textContent += '.dt-note-dialog-ok:hover          { background: #333; border-color: #333; }\n';
            s.textContent += '.dt-note-dialog-ok:disabled:hover { background: #1a1a1a; }\n';

            s.textContent += '#detailDialog .dt-tab-bar { display:flex; gap:6px; margin-bottom:16px; }\n';
            s.textContent += '#detailDialog .dt-tab { padding:7px 22px; font-size:13px; cursor:pointer; border:none; background:#f2f3f5; color:#646a73; user-select:none; letter-spacing:1px; border-radius:999px; transition:all .15s; }\n';
            s.textContent += '#detailDialog .dt-tab:hover { background:#e8eaee; color:#1f2329; }\n';
            s.textContent += '#detailDialog .dt-tab.dt-tab-active { background:#1a1a1a; color:#fff; }\n';
            s.textContent += '#detailDialog .dt-tab-panel { display:none; }\n';
            s.textContent += '#detailDialog .dt-tab-panel.dt-tab-panel-active { display:block; }\n';

            // 内联样式的动态元素补 hover/focus（内联 style 写不了伪类）
            s.textContent += '#detailCloseX:hover            { background:#e8eaee; color:#1f2329; }\n';
            s.textContent += '#detailCloseBtn:hover          { background:#f2f3f5; border-color:#c2c7ce; }\n';
            s.textContent += '#detailPaipanBtn:hover         { background:#333; border-color:#333; }\n';
            s.textContent += '#dtSaveNoteBtn:hover           { background:#333; border-color:#333; }\n';
            s.textContent += '#dtNoteInput:focus             { border-color:#1a1a1a; box-shadow:0 0 0 3px rgba(26,26,26,0.08); }\n';

            document.head.appendChild(s);
        })();

        // ========== 构造 DOM ==========
        var overlay = document.createElement('div');
        overlay.id = 'detailDialog';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:9999;display:flex;justify-content:center;align-items:flex-start;padding:40px 0;overflow-y:auto;';

        var box = document.createElement('div');
        box.style.cssText = 'background:#fff;border:1px solid #e8e8ec;border-radius:16px;box-shadow:0 12px 48px rgba(31,35,41,0.18);padding:22px 24px;width:900px;max-width:94%;';

        box.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
            '<h3 style="margin:0;font-size:16px;font-weight:bold;letter-spacing:1px;">案例详情</h3>' +
            '<button id="detailCloseX" style="border:none;background:#f2f3f5;color:#646a73;cursor:pointer;padding:4px 12px;font-size:14px;font-family:inherit;border-radius:8px;transition:all .15s;">×</button>' +
            '</div>' +
            '<div class="dt-tab-bar">' +
            '<div class="dt-tab dt-tab-active" data-tab="basic">基本信息</div>' +
            '<div class="dt-tab" data-tab="notes">事件记录</div>' +
            '</div>' +
            '<div style="max-height:70vh;overflow-y:auto;padding-right:6px;">' +
            '<div class="dt-tab-panel dt-tab-panel-active" id="dtPanelBasic">' +
            // 内嵌排盘可用时：由排盘卡片给出公历/农历/时辰/司令/胎元/交运 + 四柱，替换掉文字行与手搓四柱
            basicHtml + noteHtml + (embedSrc ? '<div id="dtBaziEmbed" style="margin-top:12px;"></div>' : (infoLinesHtml + baziBlockHtml)) +
            '</div>' +
            '<div class="dt-tab-panel" id="dtPanelNotes">' +
            yunshiHtml + oldDataHint +
            '</div>' +
            '</div>' +
            '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;padding-top:14px;border-top:1px solid #f1f2f4;">' +
            '<button id="detailCloseBtn" style="border:1px solid #d8d8dc;background:#fff;color:#1f2329;padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;border-radius:8px;transition:all .15s;">关闭</button>' +
            '<button id="detailPaipanBtn" style="border:1px solid #1a1a1a;background:#1a1a1a;color:#fff;padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;border-radius:8px;transition:background .15s;">排盘</button>' +
            '</div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // ===== 内嵌排盘 iframe 挂载 + 高度自适应 =====
        // bazi.js 在 embed 模式下上报 baziHeightEmbed，与 index.html 中 #baZiArea 的
        // baziHeight 消息互相隔离；关闭弹窗时移除监听，避免多次打开后重复触发
        var onBzHeight = null;
        var onBzMsg = null;
        if (embedSrc) {
            var embedHost = document.getElementById('dtBaziEmbed');
            if (embedHost) {
                var bzFrame = document.createElement('iframe');
                bzFrame.id = 'dtBaziFrame';
                bzFrame.title = '八字排盘';
                bzFrame.src = embedSrc;
                bzFrame.style.cssText = 'width:100%;border:none;display:block;background:#fff;min-height:260px;';
                embedHost.appendChild(bzFrame);

                onBzHeight = function (e) {
                    var d = e.data;
                    if (!d || d.type !== 'baziHeightEmbed' || !d.height) return;
                    var f = document.getElementById('dtBaziFrame');
                    if (!f) { window.removeEventListener('message', onBzHeight); return; }
                    var h = Math.ceil(d.height) + 4;
                    if (Math.abs(f.getBoundingClientRect().height - h) > 2) f.style.height = h + 'px';
                };
                window.addEventListener('message', onBzHeight);
            }
        }

        function close() {
            if (onBzHeight) window.removeEventListener('message', onBzHeight);
            if (onBzMsg) window.removeEventListener('message', onBzMsg);
            overlay.remove();
        }

        // 【基本信息页内嵌排盘：双击大运/流年/流月记录事件】
        // 监听与处理逻辑必须放在下方 hasFullData 块内——
        // saveNotesToGitee 是块内的 async function 声明，不会提升到函数作用域（V8 行为），
        // 放在这里调用会直接 ReferenceError。详见"事件记录系统"段落末尾。

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

        // ========== 事件记录系统（「事件记录」Tab = 全量时间线步骤器） ==========
        if (hasFullData) {
            var _storedNotes = (record && record.notes && typeof record.notes === 'object') ? record.notes : null;
            var notes = _storedNotes ? JSON.parse(JSON.stringify(_storedNotes)) : {};

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

            // 事件记录区：全量时间线（大运→流年→流月），
            // 一次性展示全部事件的时间线（大运 → 流年 → 流月 三层），不再只显示当前选中的大运。
            // 双击上方卡片编辑的逻辑不变；本区只承担「查看全部内容」。
            var _dtMetaCache = {};
            function liuniansOfDayun(dk) {
                if (_dtMetaCache[dk]) return _dtMetaCache[dk];
                var list = null;
                try {
                    var _dt = dtDateZhuanhuan(record.solar);
                    if (dk === 'pre') {
                        list = global.BaZiCalc.getYearRange(_dt, _dtGender);
                    } else {
                        var di = Number(dk) - 1;
                        if (di >= 0 && di <= 11) list = global.BaZiCalc.generateLunarMonths(_dt, _dtGender, di);
                    }
                } catch (e) { list = null; }
                if (!Array.isArray(list)) list = [];
                _dtMetaCache[dk] = list;
                return list;
            }
            function dyMetaOf(dk) {
                var meta = { year: '', ganzhi: '', age: '' };
                if (dk === 'pre') {
                    meta.year = (typeof prePhase !== 'undefined' && prePhase) ? (prePhase.labelYear || '') : '';
                    meta.ganzhi = '小运';
                    meta.age = (typeof prePhase !== 'undefined' && prePhase) ? (prePhase.labelAge || '') : '';
                } else if (allPhase) {
                    for (var i = 0; i < allPhase.length; i++) {
                        if (String(allPhase[i].phaseKey) === String(dk)) {
                            meta.year = allPhase[i].starYear || '';
                            meta.ganzhi = allPhase[i].dayunganzhi || '';
                            meta.age = allPhase[i].startAge != null ? allPhase[i].startAge : '';
                            break;
                        }
                    }
                }
                return meta;
            }
            function lnMetaOf(dk, lnIdx, fb) {
                var meta = { year: fb.year || '', ganzhi: fb.ganzhi || '', age: fb.age != null ? fb.age : '' };
                var ln = liuniansOfDayun(dk)[Number(lnIdx)];
                if (ln) {
                    if (!meta.year) meta.year = ln.year || '';
                    if (!meta.ganzhi) meta.ganzhi = ln.yearGanZhi || '';
                    if (meta.age === '' || meta.age == null) meta.age = ln.nianling != null ? ln.nianling : '';
                }
                return meta;
            }

            function renderNotes() {
                var box = document.getElementById('dtNotesBox');
                if (!box) return;

                // 1) 按 key 分组：dayun:<dk> / liunian:<dk>:<ln> / liuyue:<dk>:<ln>:<ly>
                var groups = {};
                Object.keys(notes).forEach(function (k) {
                    if (!noteText(notes[k])) return;
                    var p = k.split(':');
                    if (p[0] === 'dayun') {
                        if (!groups[p[1]]) groups[p[1]] = { dayunNote: null, liunians: {} };
                        groups[p[1]].dayunNote = notes[k];
                    } else if (p[0] === 'liunian') {
                        if (!groups[p[1]]) groups[p[1]] = { dayunNote: null, liunians: {} };
                        if (!groups[p[1]].liunians[p[2]]) groups[p[1]].liunians[p[2]] = { note: null, liuyues: {} };
                        groups[p[1]].liunians[p[2]].note = notes[k];
                    } else if (p[0] === 'liuyue') {
                        if (!groups[p[1]]) groups[p[1]] = { dayunNote: null, liunians: {} };
                        if (!groups[p[1]].liunians[p[2]]) groups[p[1]].liunians[p[2]] = { note: null, liuyues: {} };
                        groups[p[1]].liunians[p[2]].liuyues[p[3]] = notes[k];
                    }
                });

                var dkKeys = Object.keys(groups).sort(function (a, b) {
                    if (a === 'pre') return -1;
                    if (b === 'pre') return 1;
                    return Number(a) - Number(b);
                });

                if (dkKeys.length === 0) {
                    box.innerHTML = '<div class="dt-empty-tip">暂无事件记录，在「基本信息」页的排盘上双击大运 / 流年 / 流月添加</div>';
                    return;
                }

                // 2) 时间线 HTML（步骤器样式，纯查看）
                var html = '<div class="dt-timeline">';
                dkKeys.forEach(function (dk) {
                    var g = groups[dk];
                    var dm = dyMetaOf(dk);
                    var dyMeta = noteMeta(g.dayunNote);
                    if (dyMeta.year) dm.year = dyMeta.year;
                    if (dyMeta.ganzhi) dm.ganzhi = dyMeta.ganzhi;
                    if (dyMeta.age !== '' && dyMeta.age != null) dm.age = dyMeta.age;

                    var dParts = ['【大运】'];
                    if (dm.year) dParts.push(dm.year);
                    if (dm.ganzhi) dParts.push(dm.ganzhi);
                    if (dm.age !== '' && dm.age != null) dParts.push(dm.age + '岁');

                    html += '<div class="dt-tl-item dt-tl-dy">';
                    html += '<div class="dt-tl-node"></div>';
                    html += '<div class="dt-tl-title">' + escAndBreak(dParts.join(' ')) + '</div>';
                    if (noteText(g.dayunNote)) {
                        html += '<div class="dt-tl-content">' + escAndBreak(noteText(g.dayunNote)) + '</div>';
                    }

                    var lnKeys = Object.keys(g.liunians).sort(function (a, b) { return Number(a) - Number(b); });
                    lnKeys.forEach(function (lnIdx) {
                        var lnG = g.liunians[lnIdx];
                        var lm = lnMetaOf(dk, lnIdx, noteMeta(lnG.note));
                        var lnMain = '';
                        if (lm.year) lnMain += lm.year;
                        if (lm.ganzhi) lnMain += (lnMain ? ' ' : '') + lm.ganzhi;
                        var lnAgeStr = (lm.age !== '' && lm.age != null) ? (' · ' + lm.age + '岁') : '';

                        html += '<div class="dt-tl-item dt-tl-ln">';
                        html += '<div class="dt-tl-node"></div>';
                        html += '<div class="dt-tl-title">' + escAndBreak('【流年】' + lnMain + lnAgeStr) + '</div>';
                        if (noteText(lnG.note)) {
                            html += '<div class="dt-tl-content">' + escAndBreak(noteText(lnG.note)) + '</div>';
                        }

                        var lyKeys = Object.keys(lnG.liuyues).sort(function (a, b) { return Number(a) - Number(b); });
                        lyKeys.forEach(function (lyIdx) {
                            var lyNote = lnG.liuyues[lyIdx];
                            var lym = noteMeta(lyNote);
                            var lyLn = liuniansOfDayun(dk)[Number(lnIdx)];
                            var md = lym.md || ((lyLn && lyLn.solarDate && lyLn.solarDate.month != null) ? (lyLn.solarDate.month + '/' + lyLn.solarDate.day) : '');
                            var yueStr = md || ('第' + (Number(lyIdx) + 1));
                            var lyParts = ['【流月】', yueStr];
                            if (lym.ganzhi) lyParts.push(lym.ganzhi);

                            html += '<div class="dt-tl-item dt-tl-ly">';
                            html += '<div class="dt-tl-node"></div>';
                            html += '<div class="dt-tl-title">' + escAndBreak(lyParts.join(' ')) + '</div>';
                            html += '<div class="dt-tl-content">' + escAndBreak(noteText(lyNote)) + '</div>';
                            html += '</div>';
                        });

                        html += '</div>';
                    });

                    html += '</div>';
                });
                html += '</div>';

                box.innerHTML = html;
            }

            // ===== 基本信息页内嵌排盘：双击大运/流年/流月 → 记录事件 =====
            // 子页（bazi.html?embed=1）双击时发来 baziNoteEdit；这里复用「编辑事件」页的
            // notes 数据与云端保存逻辑，保存后把最新标记回传，子页给对应格子打点。
            // ⚠ 本段必须留在 hasFullData 块内：saveNotesToGitee 是块内的 async function 声明，
            //   V8 下不会提升到函数作用域，放到外层调用会直接 ReferenceError。
            function pushNoteMarksToEmbed() {
                var f = document.getElementById('dtBaziFrame');
                if (!f || !f.contentWindow) return;
                var marks = {};
                // 回传完整 note 对象（{text,year,ganzhi,age,md?}，旧数据可能是纯文本），
                // 子页据此在选中条目下方内联显示事件内容；仅做真值判断的旧逻辑不受影响
                Object.keys(notes).forEach(function (k) { if (noteText(notes[k])) marks[k] = notes[k]; });
                try { f.contentWindow.postMessage({ type: 'baziNotesMark', marks: marks }, '*'); } catch (e) { }
            }

            function openNoteEditFromEmbed(d) {
                var key = String(d.key);
                var meta = (d.meta && typeof d.meta === 'object') ? d.meta : {};
                showNoteDialog(d.title || '记录事件', noteText(notes[key]), async function (newText) {
                    var prev = notes[key] || '';
                    if (!newText) {
                        delete notes[key];
                    } else {
                        var item = {
                            text: newText,
                            year: meta.year || '',
                            ganzhi: meta.ganzhi || '',
                            age: (meta.age != null && meta.age !== '') ? meta.age : ''
                        };
                        if (meta.md) item.md = meta.md;
                        notes[key] = item;
                    }
                    renderNotes();
                    var ok = await saveNotesToGitee(record, notes, key, prev);
                    pushNoteMarksToEmbed();
                    return ok;
                });
            }

            onBzMsg = function (e) {
                var d = e.data;
                if (!d || typeof d !== 'object') return;
                if (d.type === 'baziNotesWant') { pushNoteMarksToEmbed(); return; }
                if (d.type === 'baziNoteEdit' && d.key) openNoteEditFromEmbed(d);
            };

            var _bzFrameEl = document.getElementById('dtBaziFrame');
            if (_bzFrameEl) {
                window.addEventListener('message', onBzMsg);
                // 子页加载完成后主动推一次标记（子页 init 后也会索要一次，双保险）
                _bzFrameEl.addEventListener('load', function () { setTimeout(pushNoteMarksToEmbed, 60); });
            }

            // ========== 初始渲染 ==========
            renderNotes();
        }
    }

    global.DetailDialog = { showDetailDialog };
})(window);