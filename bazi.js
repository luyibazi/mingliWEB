// bazi.js —— 八字排盘结果页（独立页面，由 index.html 点击"确定"后通过 iframe 调用）
// 依赖：lib/tyme4ts.mjs（全局类）、dayunliunianliuyue.js（window.BaZiCalc）、style.css
// 入口：URL 参数 ?y=&m=&d=&h=&min=&g=（g: male/female）

(function () {
    'use strict';

    let currentBaZi = null;
    // embed=1：由案例详情弹窗内嵌调用时置真。
    // 此模式与大页面内容完全一致（四柱 + 司令/胎元/交运 + 大运/流年/流月 + 选中面板），
    // 仅隐藏"复制八字/保存"按钮（保存会往 Gitee 新增命例），并去掉容器内边距、背景转白。
    let EMBED = false;

    // 时辰名称（原 script.js GanZhiUtil.getShiChen，本页内联）
    function getShiChen(hour) {
        if (hour >= 23) return '夜子时';
        const names = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
        const idx = Math.floor((hour + 1) / 2);
        return names[idx] + '时';
    }

    // 通知父页面本页高度，用于 iframe 自适应（file:// 跨源下 postMessage 可用）
    // 注意：必须测量真实内容容器，而非 documentElement.scrollHeight——
    // 后者在内容矮于视口时等于视口高度，会导致父页不断增高 iframe 的死循环
    function reportHeight() {
        if (!(window.parent && window.parent !== window)) return;
        try {
            const el = document.getElementById('baziContainer');
            const h = el ? Math.ceil(el.getBoundingClientRect().bottom) : document.documentElement.scrollHeight;
            // embed 模式使用独立的消息类型，避免与 index.html 中 #baZiArea 的高度监听互相串台
            window.parent.postMessage({ type: EMBED ? 'baziHeightEmbed' : 'baziHeight', height: h }, '*');
        } catch (e) { }
    }
    // 合并上报：同一轮 JS 任务里的多次渲染只上报一次「最终高度」。
    // 否则中间态（如先删流月表再建流月表）的"瞬时变矮"也会发给父页，
    // 父页跟着变矮再变高 → 外层页面滚动条抖动 / 滚动位置被夹回去。
    let heightPending = false;
    function notifyHeight() {
        if (heightPending) return;
        heightPending = true;
        const flush = () => { heightPending = false; reportHeight(); };
        if (typeof queueMicrotask === 'function') queueMicrotask(flush);
        else Promise.resolve().then(flush);
    }
    window.addEventListener('load', notifyHeight);
    window.addEventListener('resize', notifyHeight);
    // 内容尺寸任何变化（渲染、展开流年/流月、字体加载等）都实时上报
    // 上报值固定为容器底边位置，与 iframe 视口无关，父页守卫会拦截无效更新，不会死循环
    if (window.ResizeObserver) {
        new ResizeObserver(notifyHeight).observe(document.documentElement);
    }

    //得出八字数据
    function calculateBaZi(dateKey, hour, minute, gender) {
        const [year, month, day] = dateKey.split('-').map(Number);
        const solarTime = SolarTime.fromYmdHms(year, month, day, hour, minute, 0);
        const lunarHour = solarTime.getLunarHour();
        const eightChar = lunarHour.getEightChar();
        // 1. 一路向上追溯到农历年对象 (LunarYear)
        const lunarYear = lunarHour.getLunarDay().getLunarMonth().getLunarYear();

        // 2. 获取农历年份的数字（例如：2026）
        const lunarYearNum = lunarYear.getYear();

        var dayun = {
            startTime: null,
            endTime: null,
            dayuns: []
        };
        // 获取司令分野（按 rysl.json 藏干天数分配，实现在 dayunliunianliuyue.js）
        const siLing = BaZiCalc.getSiLingFromRysl(solarTime);

        // 起运信息（童限）与交运时间（封装在 dayunliunianliuyue.js）
        const genderCode = gender === 'male' ? 1 : 0;
        const jyInfo = BaZiCalc.getJiaoYunInfo({ year, month, day, hour, minute }, genderCode);
        const childLimit = jyInfo.childLimit;

        dayun.startTime = jyInfo.startTime;
        dayun.endTime = jyInfo.endTime;
        const jiaoYun = jyInfo.jiaoYun;
        const qishi = jyInfo.qishi;

        // 大运顺逆：男逢阳年/女逢阴年顺行(1)，男逢阴年/女逢阳年逆行(0)
        const yearGan = eightChar.getYear().getName().charAt(0);
        const isYangGan = '甲丙戊庚壬'.includes(yearGan);
        const isMale = gender === 'male';
        const dayunDirection = (isMale === isYangGan) ? 1 : 0;
        dayun.dayuns = BaZiCalc.findYearsByGanZhi({ year, month, day, hour, minute }, jiaoYun.yearGan, eightChar.getMonth().getName(), dayunDirection, genderCode);

        // 从出生年到未来若干年的逐年信息
        const birthYear = year;
        const endYear = birthYear + 70;
        const yearlyFortunes = [];
        const firstFortune = childLimit.getStartFortune();
        const firstDecade = childLimit.getStartDecadeFortune();
        for (let y = birthYear; y <= endYear; y++) {
            const offset = y - childLimit.getEndSixtyCycleYear().getYear();
            const fortune = firstFortune.next(offset);
            const xiaoYun = fortune.getName();
            const age = fortune.getAge();

            // 判断该年所属大运（以 firstDecade.getStartSixtyCycleYear 为基准，每10年1步）
            let daYunName = '';
            const startDecadeYear = firstDecade.getStartSixtyCycleYear().getYear();
            let daYunIndex = Math.floor((y - startDecadeYear) / 10);
            if (daYunIndex < 0) {
                daYunName = '';
            } else {
                const decade = firstDecade.next(daYunIndex);
                daYunName = decade.getName();
            }

            yearlyFortunes.push({
                year: y,
                age: age,
                daYun: daYunName,
                xiaoYun: xiaoYun
            });
        }

        return {
            qianKun: gender === 'male' ? '乾' : '坤',
            year: eightChar.getYear().getName(),
            month: eightChar.getMonth().getName(),
            day: eightChar.getDay().getName(),
            hour: eightChar.getHour().getName(),
            siLing: siLing,
            taiYuan: BaZiCalc.getTaiYuan({ year, month, day, hour, minute }),
            yearlyFortunes: yearlyFortunes,
            childLimit: childLimit,
            dayun: dayun,
            birthYear: lunarYearNum,
            birthDate: `${year}年${month}月${day}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            solarDate: `${year}年${month}月${day}日`,
            lunarDate: `${lunarHour.getLunarDay().getLunarMonth().getName()}${lunarHour.getLunarDay().getName()}`,
            shiChen: getShiChen(hour),
            inputParams: { year, month, day, hour, minute, gender },
            jiaoYun: jiaoYun,
            qishi: qishi
        };
    }

    // ====== 五行配色工具 ======
    const WX_MAP = [
        { chars: '甲乙寅卯', cls: 'wx-mu', name: '木' },
        { chars: '丙丁巳午', cls: 'wx-huo', name: '火' },
        { chars: '戊己辰戌丑未', cls: 'wx-tu', name: '土' },
        { chars: '庚辛申酉', cls: 'wx-jin', name: '金' },
        { chars: '壬癸亥子', cls: 'wx-shui', name: '水' }
    ];
    function wxInfo(c) {
        for (const w of WX_MAP) if (w.chars.includes(c)) return w;
        return null;
    }
    // 渲染单个干支字符；withTag 为 true 时在字符下方标注五行
    function wxSpan(c, withTag) {
        const w = wxInfo(c);
        if (!w) return `<span class="wx-char">${c}</span>`;
        return `<span class="wx-char ${w.cls}">${c}${withTag ? `<i>${w.name}</i>` : ''}</span>`;
    }
    function wxGanZhi(gz, withTag) {
        return (gz || '').split('').map(c => wxSpan(c, withTag)).join('');
    }

    function showBaZi(baZi) {
        currentBaZi = baZi;
        // 新排盘重置选中状态
        selDayunIdx = null;
        selLiunianIdx = null;
        selLiuyueIdx = null;
        const container = document.getElementById('baziContainer');
        if (!container) return;
        container.innerHTML = '';

        let daYunHtml = '';
        // 大运/流年/流月：embed 内嵌模式同样渲染（详情页基本信息页也要看）
        if (baZi.dayun && baZi.dayun.dayuns && baZi.dayun.dayuns.length > 0) {
            const dayuns = baZi.dayun.dayuns.slice(0, 12);

            let yearCells = `<td class="dayun-cell" data-dayun-index="pre">${baZi.birthYear}</td>`;
            let ageCells = `<td class="dayun-cell" data-dayun-index="pre">1~${dayuns[0].startAge}岁</td>`;
            let ganCells = `<td class="dayun-cell" data-dayun-index="pre">小运</td>`;

            dayuns.forEach((item, idx) => {
                const year = item.starYear;
                const colIdx = idx + 1;

                yearCells += `<td class="dayun-cell" data-dayun-index="${colIdx}">${year}</td>`;
                ageCells += `<td class="dayun-cell" data-dayun-index="${colIdx}">${item.startAge}岁</td>`;
                ganCells += `<td class="dayun-cell" data-dayun-index="${colIdx}">${wxGanZhi(item.dayunganzhi)}</td>`;
            });

            daYunHtml = `
                <div class="dayun-section">
                    <div class="section-hint">${EMBED ? '点击查看流年 · 双击大运/流年/流月记录事件' : '点击任一列查看流年'}</div>
                    <div class="gz-row">
                        <div class="gz-label">大运</div>
                        <div class="dayun-scroll">
                            <table class="dayun-table" id="dayunTable">
                                <tr>${yearCells}</tr>
                                <tr>${ageCells}</tr>
                                <tr>${ganCells}</tr>
                            </table>
                        </div>
                    </div>
                    <div id="dayunNotePanel" class="note-inline-wrap"></div>
                    <div id="liuNianArea"></div>
                </div>
            `;
        }

        // 日柱标签按性别显示「元男 / 元女」
        const isMale = baZi.inputParams ? baZi.inputParams.gender === 'male' : baZi.qianKun === '乾';
        const pillars = [
            { label: '年柱', gz: baZi.year },
            { label: '月柱', gz: baZi.month },
            { label: isMale ? '元男' : '元女', gz: baZi.day },
            { label: '时柱', gz: baZi.hour }
        ];
        const pillarHtml = pillars.map((p, i) => `
            <div class="pillar-card${i === 2 ? ' day-pill' : ''}">
                <div class="pillar-label">${p.label}</div>
                <div class="pillar-gan">${wxSpan(p.gz.charAt(0), true)}</div>
                <div class="pillar-zhi">${wxSpan(p.gz.charAt(1), true)}</div>
            </div>`).join('');

        const html = `
            <div id="baZiArea" class="bazi-area">
                <div class="bazi-card">
                    <div class="bazi-header">
                        <span class="qiankun-badge">${baZi.qianKun}</span>
                        <span class="bazi-birth">${baZi.birthDate}</span>
                        <span class="bazi-lunar">农历${baZi.lunarDate} · ${baZi.shiChen}</span>
                    </div>
                    <div class="bazi-main-row">
                        <div class="bazi-pillars">${pillarHtml}</div>
                        ${'<div class="selection-panel" id="selectionPanel"></div>'}
                    </div>
                    <div class="bazi-info-row">
                        <span class="info-item"><span class="info-label">司令分野</span><span class="info-value">${baZi.siLing}</span></span>
                        <span class="info-item"><span class="info-label">胎元</span><span class="info-value">${wxGanZhi(baZi.taiYuan)}</span></span>
                        <span class="info-item"><span class="info-label">交运</span><span class="info-value">${baZi.jiaoYun ? `${baZi.jiaoYun.jieQi}后${baZi.jiaoYun.days}天${baZi.jiaoYun.hours}小时 <span class="info-sub">(${baZi.jiaoYun.jiaoYunGan})</span>` : '—'}</span></span>
                    </div>
                </div>
                ${daYunHtml}
                ${EMBED ? '' : `<div class="bazi-actions">
                    <button id="exportBtn" class="export-btn">复制八字</button>
                    <button id="saveBtn" class="export-btn primary">保存</button>
                </div>`}
            </div>
        `;

        container.innerHTML = html;

        bindDayunEvents();
        bindExportEvent();
        // 默认选中：优先「今年」→ 默认选中今年所在的大运 + 流年（流月不默认选中）
        // 若没有大运包含今年，则退回到童限（起运前）的第一年 / 第一个大运的第一年
        applyDefaultSelection();
        applyNoteMarks();
        notifyHeight();
    }

    //保存按钮的功能
    function bindExportEvent() {
        const btn = document.getElementById('exportBtn');
        if (!btn) return;
        btn.addEventListener('click', () => exportBaZi(currentBaZi));
        var saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                showSaveDialog(function (name, desc) {
                    saveCurrentToGitee(name, desc);
                });
            });
        }
    }

    function showSaveDialog(onConfirm) {
        var existing = document.getElementById('saveDialog');
        if (existing) existing.remove();

        // 保存弹窗样式（内联 style 写不了 focus/hover，注入一次）
        if (!document.getElementById('saveDialogStyle')) {
            var st = document.createElement('style');
            st.id = 'saveDialogStyle';
            st.textContent =
                '#saveDialog input:focus, #saveDialog textarea:focus { border-color:#1a1a1a !important; box-shadow:0 0 0 3px rgba(26,26,26,0.08); }\n' +
                '#saveDialog #saveCancelBtn:hover { background:#f2f3f5; border-color:#c2c7ce; }\n' +
                '#saveDialog #saveConfirmBtn:hover { background:#333 !important; border-color:#333 !important; }\n';
            document.head.appendChild(st);
        }

        var overlay = document.createElement('div');
        overlay.id = 'saveDialog';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(31,35,41,0.4);z-index:9999;display:flex;justify-content:center;align-items:center;';

        var box = document.createElement('div');
        box.style.cssText = 'background:#fff;border:1px solid #e8e8ec;border-radius:14px;box-shadow:0 12px 48px rgba(31,35,41,0.2);padding:24px 26px;width:360px;';
        box.innerHTML =
            '<h3 style="margin-bottom:16px;font-size:16px;font-weight:bold;text-align:center;letter-spacing:1px;color:#1f2329;">保存案例</h3>' +
            '<label style="display:block;margin-bottom:5px;font-size:13px;color:#646a73;">案例名称</label>' +
            '<input type="text" id="saveNameInput" style="width:100%;padding:8px 10px;border:1px solid #d8d8dc;border-radius:8px;font-size:14px;margin-bottom:15px;box-sizing:border-box;outline:none;font-family:inherit;transition:border-color .15s, box-shadow .15s;" placeholder="如：张三" autofocus />' +
            '<label style="display:block;margin-bottom:5px;font-size:13px;color:#646a73;">描述（选填）</label>' +
            '<textarea id="saveDescInput" rows="3" style="width:100%;padding:8px 10px;border:1px solid #d8d8dc;border-radius:8px;font-size:14px;margin-bottom:15px;box-sizing:border-box;resize:vertical;font-family:inherit;outline:none;transition:border-color .15s, box-shadow .15s;" placeholder="可填写备注信息，也可留空"></textarea>' +
            '<div style="display:flex;gap:10px;justify-content:center;">' +
            '<button id="saveCancelBtn" style="border:1px solid #d8d8dc;background:#fff;color:#1f2329;padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;border-radius:8px;transition:all .15s;">取消</button>' +
            '<button id="saveConfirmBtn" style="border:1px solid #1a1a1a;background:#1a1a1a;color:#fff;padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;border-radius:8px;transition:background .15s;">确认</button>' +
            '</div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        var nameInput = document.getElementById('saveNameInput');
        var descInput = document.getElementById('saveDescInput');
        nameInput.focus();

        function close() { overlay.remove(); }

        function confirm() {
            var name = nameInput.value.trim() || '未命名';
            var desc = descInput.value.trim();
            close();
            onConfirm(name, desc);
        }

        document.getElementById('saveCancelBtn').addEventListener('click', close);
        document.getElementById('saveConfirmBtn').addEventListener('click', confirm);
        nameInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') confirm();
            if (e.key === 'Escape') close();
        });

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });
    }

    // 把 months 数组里的 SolarTime 类实例转成纯数据，避免 JSON.stringify 循环引用
    function serializeMonths(months) {
        if (!months || !months.length) return [];
        return months.map(function (m) {
            var sd = m.solarDate;
            var dateObj = null;
            if (sd) {
                // SolarTime 实例 / 或字符串两种兼容
                if (typeof sd.getYear === 'function') {
                    dateObj = {
                        year: sd.getYear(),
                        month: sd.getMonth(),
                        day: sd.getDay(),
                        hour: sd.getHour(),
                        minute: sd.getMinute()
                    };
                } else if (typeof sd === 'string') {
                    // 形如 "YYYY-MM-DD HH:mm"
                    var m1 = sd.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})/);
                    if (m1) {
                        dateObj = {
                            year: parseInt(m1[1], 10),
                            month: parseInt(m1[2], 10),
                            day: parseInt(m1[3], 10),
                            hour: parseInt(m1[4], 10),
                            minute: parseInt(m1[5], 10)
                        };
                    } else {
                        dateObj = null;
                    }
                }
            }
            var dateStr = '';
            if (dateObj) {
                dateStr = dateObj.year + '-' + String(dateObj.month).padStart(2, '0') + '-' + String(dateObj.day).padStart(2, '0') + ' ' +
                    String(dateObj.hour).padStart(2, '0') + ':' + String(dateObj.minute).padStart(2, '0');
            }
            return {
                JieQi: m.JieQi,
                ganZhi: m.ganZhi,
                solarDate: dateObj,
                solarDateStr: dateStr
            };
        });
    }
    function saveCurrentToGitee(caseName, desc) {
        var bz = currentBaZi;
        if (!bz || !bz.inputParams) return;

        var p = bz.inputParams;
        // 【精简保存体积】大运、12步大运数组、70年流年 yearlyFortunes 一律不保存！
        // 详情页打开时用下方 inputParams 调用项目原有 calculateBaZi 现场重新生成，完全等价
        // 司令/胎元/交运 同理：详情页内嵌排盘会按 inputParams 重算，无需落库
        // （detail.js 需要 jiaoYun.yearGan 算大运顺逆时，会自动按 inputParams 重算）
        var fullBazi = {
            qianKun: bz.qianKun,
            year: bz.year,
            month: bz.month,
            day: bz.day,
            hour: bz.hour,
            birthYear: bz.birthYear,
            birthDate: bz.birthDate,
            solarDate: bz.solarDate,
            lunarDate: bz.lunarDate,
            shiChen: bz.shiChen,
            inputParams: bz.inputParams   // ★重算大运流年流月/司令/胎元/交运的唯一入口（年月日时分性别）
        };
        var newRecord = {
            id: 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
            name: caseName,
            gender: p.gender === 'male' ? '男' : '女',
            solar: p.year + '-' + String(p.month).padStart(2, '0') + '-' + String(p.day).padStart(2, '0') + ' ' + String(p.hour).padStart(2, '0') + ':' + String(p.minute || 0).padStart(2, '0'),
            year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute || 0,
            bazi: { year: bz.year, month: bz.month, day: bz.day, hour: bz.hour },
            fullBazi: fullBazi,
            note: desc || '',
            createdAt: Math.floor(Date.now() / 1000)
        };

        var btn = document.getElementById('exportBtn');
        var origText = btn ? btn.textContent : '';
        var restoreTimer = null;
        if (btn) {
            btn.textContent = '保存中...';
            btn.disabled = true;
            // 15 秒兜底恢复（防止网络挂了按钮一直灰）
            restoreTimer = setTimeout(function () {
                btn.textContent = origText;
                btn.disabled = false;
            }, 15000);
        }

        fetch('https://gitee.com/api/v5/repos/a-treasure-trove-of-wisdom/bazi-data/contents/data/records.json?access_token=f66594ca2bba32caad9d255b278dcabd')
            .then(function (res) { return res.json(); })
            .then(function (file) {
                // 解码旧数据
                var text = atob((file.content || '').replace(/\n/g, ''));
                var decoded = decodeURIComponent(escape(text));
                var data = JSON.parse(decoded || '{"records":[]}');
                var records = data.records || [];

                // 新命例插到数组最前面
                records.unshift(newRecord);

                // 编码 & PUT 保存
                var content = JSON.stringify({ records: records }, null, 2);
                var b64 = btoa(unescape(encodeURIComponent(content)));
                return fetch('https://gitee.com/api/v5/repos/a-treasure-trove-of-wisdom/bazi-data/contents/data/records.json', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: 'f66594ca2bba32caad9d255b278dcabd',
                        message: 'update records via app',
                        content: b64,
                        sha: file.sha,
                        branch: 'master'
                    })
                }).then(function (r) {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                });
            })
            .then(function () {
                if (restoreTimer) clearTimeout(restoreTimer);
                if (btn) { btn.textContent = origText; btn.disabled = false; }
                alert('保存成功！命例已写入 Gitee 仓库。');
            })
            .catch(function (e) {
                if (btn) btn.textContent = origText;
                alert('保存失败: ' + e.message);
            });
    }

    function exportBaZi(baZi) {
        if (!baZi) return;

        let text = '';
        text += `性别：${baZi.inputParams.gender === 'male' ? '男' : '女'}\n`;
        text += `公历：${baZi.solarDate} ${baZi.shiChen}\n`;
        text += `农历：${baZi.lunarDate} ${baZi.shiChen}\n`;
        text += '\n';
        text += `司令：${baZi.siLing}\n`;
        text += `胎元：${baZi.taiYuan}\n`;
        if (baZi.jiaoYun) {
            text += `交运：${baZi.jiaoYun.jieQi}${baZi.jiaoYun.days}天${baZi.jiaoYun.hours}小时（${baZi.jiaoYun.jiaoYunGan}）\n`;
        }
        text += '\n';
        text += `${baZi.year} ${baZi.month} ${baZi.day} ${baZi.hour}`;
        text += '\n\n';

        if (baZi.dayun && baZi.dayun.dayuns && baZi.dayun.dayuns.length > 0) {
            const dayuns = baZi.dayun.dayuns.slice(0, 12);
            const dayunStr = dayuns.map(item => {
                const year = item.starYear || '';
                return `${item.dayunganzhi}（${year}，${item.startAge}）`;
            }).join(' ');
            text += dayunStr;
        }

        // 复制到剪贴板（file:// 协议下 navigator.clipboard 不可用，统一用降级方案）
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);

        // execCommand 失败时再尝试 Clipboard API
        if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => { });
        }

        const btn = document.getElementById('exportBtn');
        if (btn) {
            const origText = btn.textContent;
            btn.textContent = '已复制';
            setTimeout(() => { btn.textContent = origText; }, 1500);
        }
    }

    // ====== 选中联动状态与四柱右侧详情面板 ======
    let selDayunIdx = null;    // 'pre' | 数字字符串 | null
    let selLiunianIdx = null;  // 数字 | null
    let selLiuyueIdx = null;   // 数字 | null

    // 选中项渲染成与四柱一致的柱形卡片
    function selCard(label, gz, meta) {
        let inner;
        if (gz) {
            inner = `<div class="sel-gan">${wxSpan(gz.charAt(0), true)}</div>
                     <div class="sel-zhi">${wxSpan(gz.charAt(1), true)}</div>`;
        } else {
            inner = `<div class="sel-text">${label === '阶段' ? '起运前' : '—'}</div>`;
        }
        return `<div class="sel-card">
            <div class="pillar-label">${label}</div>
            ${inner}
            ${meta ? `<div class="sel-meta2">${meta}</div>` : ''}
        </div>`;
    }

    function updateSelectionPanel() {
        // 先刷新表格下方的内联事件面板（未选中时清空），再刷右侧卡片
        renderNotePanels();

        const panel = document.getElementById('selectionPanel');
        if (!panel || !currentBaZi) return;

        if (selDayunIdx === null) {
            panel.innerHTML = '<div class="selection-empty">点击下方「大运」<br>选中后流年/流月详情在此显示</div>';
            return;
        }

        let cards = '';

        if (selDayunIdx === 'pre') {
            cards += selCard('阶段', null);
        } else {
            const d = currentBaZi.dayun.dayuns[parseInt(selDayunIdx, 10) - 1];
            if (d) cards += selCard('大运', d.dayunganzhi, `${d.starYear}年<br>${d.startAge}岁起`);
        }

        if (selLiunianIdx !== null && currentBaZi.liunians && currentBaZi.liunians[selLiunianIdx]) {
            const ln = currentBaZi.liunians[selLiunianIdx];
            cards += selCard('流年', ln.yearGanZhi, `${ln.year}年<br>${ln.nianling}岁`);
        }

        if (selLiuyueIdx !== null && currentBaZi.liunians && currentBaZi.liunians[selLiunianIdx]
            && currentBaZi.liunians[selLiunianIdx].months) {
            const lm = currentBaZi.liunians[selLiunianIdx].months[selLiuyueIdx];
            if (lm) {
                cards += selCard('流月', lm.ganZhi, `${lm.JieQi}<br>${lm.solarDate.month}/${lm.solarDate.day}`);
            }
        }

        panel.innerHTML = `<div class="sel-cards">${cards}</div>`;
    }

    // ===== 选中联动（点击/默认选中 共用） =====
    // 高亮某一大运列的三行单元格；idx: 'pre' | '1' | '2' ...
    function highlightDayun(idx) {
        document.querySelectorAll('#dayunTable .dayun-cell').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll(`#dayunTable .dayun-cell[data-dayun-index="${idx}"]`).forEach(c => c.classList.add('selected'));
    }
    function highlightLiunian(idx) {
        document.querySelectorAll('#liuNianTable .liunian-cell').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll(`#liuNianTable .liunian-cell[data-liunian-index="${idx}"]`).forEach(c => c.classList.add('selected'));
    }
    function highlightLiuyue(idx) {
        document.querySelectorAll('#liuYueTable .liuyue-cell').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll(`#liuYueTable .liuyue-cell[data-liuyue-index="${idx}"]`).forEach(c => c.classList.add('selected'));
    }

    // 选大运：渲染对应流年表；若传入 liunianIdx 则同时选中该流年
    // （流年 + 流月在同一次 innerHTML 里写出，避免中间态导致父页 iframe 高度抖动）
    function selectDayun(dayunIdx, liunianIdx) {
        const wantLn = (liunianIdx !== null && liunianIdx !== undefined) ? liunianIdx : null;
        selDayunIdx = dayunIdx;
        selLiunianIdx = wantLn;   // 先置位：renderLiuNian 内的 applyNoteMarks 要靠它算流月的事件标记
        selLiuyueIdx = null;
        highlightDayun(dayunIdx);
        renderLiuNian(dayunIdx, wantLn);
        // 下标越界（该阶段没有流年数据）→ 回退为「只选大运」
        if (wantLn !== null && !(currentBaZi.liunians && currentBaZi.liunians[wantLn])) {
            selLiunianIdx = null;
        }
        applyNoteMarks();
        updateSelectionPanel();
    }

    // 选流年：渲染对应流月表（流月默认不选中）；若传入 liuyueIdx 则进一步选中该流月
    function selectLiunian(liunianIdx, liuyueIdx) {
        // 防御：该大运下没有流年数据时不进入（避免 renderLiuYue 取到 undefined）
        if (!currentBaZi || !currentBaZi.liunians || !currentBaZi.liunians[liunianIdx]) {
            selLiunianIdx = null;
            selLiuyueIdx = null;
            updateSelectionPanel();
            return;
        }
        selLiunianIdx = liunianIdx;
        selLiuyueIdx = null;
        highlightLiunian(liunianIdx);
        renderLiuYue(liunianIdx);
        if (liuyueIdx !== null && liuyueIdx !== undefined) {
            selectLiuyue(liuyueIdx);
        } else {
            updateSelectionPanel();
        }
    }

    // 选流月：只高亮 + 刷新右侧面板
    function selectLiuyue(liuyueIdx) {
        selLiuyueIdx = liuyueIdx;
        highlightLiuyue(liuyueIdx);
        updateSelectionPanel();
    }

    // ====== 默认选中规则 ======
    // 1) 「今年」落在某一步大运的十年区间内 → 默认选中该大运 + 今年的流年（流月不选中）
    // 2) 所有大运都不包含今年 → 默认选中童限（起运前，即 pre 列）的第一年；
    //    若不存在童限，则选第一步大运的第一年
    function applyDefaultSelection() {
        // 兜底：无大运数据时保持"未选中"空态提示
        if (!currentBaZi || !currentBaZi.dayun || !currentBaZi.dayun.dayuns) { updateSelectionPanel(); return; }
        const dayuns = currentBaZi.dayun.dayuns.slice(0, 12);
        if (dayuns.length === 0) { updateSelectionPanel(); return; }

        const nowYear = new Date().getFullYear();
        const birthYear = currentBaZi.birthYear;

        let dayunIdx = null;
        let wantYear = null;

        // 1) 今年是否落在某步大运内（每步大运管 10 年）
        for (let i = 0; i < dayuns.length; i++) {
            const d = dayuns[i];
            if (nowYear >= d.starYear && nowYear < d.starYear + 10) {
                dayunIdx = String(i + 1);
                wantYear = nowYear;
                break;
            }
        }

        // 2) 大运不包含今年：有童限（出生年早于第一步大运起运年）选童限的第一年
        if (dayunIdx === null) {
            const firstStarYear = dayuns[0].starYear;
            if (firstStarYear - birthYear >= 1) {
                dayunIdx = 'pre';
                wantYear = birthYear;          // 童限的第一年 = 出生年
            } else {
                dayunIdx = '1';
                wantYear = firstStarYear;      // 无童限 → 第一步大运的第一年
            }
        }

        // 先选大运（内部渲染出流年表，并写入 currentBaZi.liunians）
        selectDayun(dayunIdx, null);

        // 再按年份在流年表里定位（找不到就退回第一个流年）
        let lnIdx = null;
        if (currentBaZi.liunians && currentBaZi.liunians.length) {
            const found = currentBaZi.liunians.findIndex(x => x.year === wantYear);
            lnIdx = found >= 0 ? found : 0;
        }
        if (lnIdx === null) {
            updateSelectionPanel();
        } else {
            selectLiunian(lnIdx, null);   // 流月不默认选中
        }
    }

    // ===== embed 模式：双击大运/流年/流月 → 交由父页面（案例详情）打开事件编辑弹窗 =====
    // notes 的 key 与详情页"编辑事件"完全一致：
    //   dayun:<大运key> / liunian:<大运key>:<流年下标> / liuyue:<大运key>:<流年下标>:<流月下标>
    // 子页只负责"发起编辑请求 + 显示已有事件标记"，真正的读写（含 Gitee 保存）仍由父页完成。
    const noteMarks = Object.create(null);

    function postToParent(msg) {
        if (!EMBED || !window.parent || window.parent === window) return;
        try { window.parent.postMessage(msg, '*'); } catch (e) { }
    }

    function cellNoteKey(level, dayunIdx, lnIdx, lyIdx) {
        if (level === 'dayun') return 'dayun:' + dayunIdx;
        if (level === 'liunian') return 'liunian:' + dayunIdx + ':' + lnIdx;
        return 'liuyue:' + dayunIdx + ':' + lnIdx + ':' + lyIdx;
    }

    // ===== 选中有事件记录的条目时，在其表格下方内联显示事件内容 =====
    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // noteMarks 的值：父页回传的是完整 note 对象 { text, ... }（旧数据可能是纯文本）；面板只显示正文，不显示年份/岁数/干支等 meta
    function notePanelHtml(key) {
        const v = key ? noteMarks[key] : null;
        if (!v) return '';
        const text = (typeof v === 'string') ? v : ((v && v.text) || '');
        if (!text) return '';

        return '<div class="note-inline"><span class="note-inline-badge">记</span>' +
            '<div class="note-inline-body">' +
            '<div class="note-inline-text">' + escapeHtml(text) + '</div></div></div>';
    }

    // 刷新三块内联事件面板（大运表下 / 流年表下 / 流月表下），只显示「当前选中」条目的内容
    function renderNotePanels() {
        const dy = (selDayunIdx !== null) ? document.getElementById('dayunNotePanel') : null;
        if (dy) dy.innerHTML = notePanelHtml(cellNoteKey('dayun', selDayunIdx));

        const ln = (selDayunIdx !== null && selLiunianIdx !== null) ? document.getElementById('liunianNotePanel') : null;
        if (ln) ln.innerHTML = notePanelHtml(cellNoteKey('liunian', selDayunIdx, selLiunianIdx));

        const ly = (selDayunIdx !== null && selLiunianIdx !== null && selLiuyueIdx !== null)
            ? document.getElementById('liuyueNotePanel') : null;
        if (ly) ly.innerHTML = notePanelHtml(cellNoteKey('liuyue', selDayunIdx, selLiunianIdx, selLiuyueIdx));

        // 面板出现/消失会改变内容高度；notifyHeight 内部按微任务合并，一轮只上报一次
        notifyHeight();
    }

    // 大运干支（弹窗标题用）
    function dayunGanZhiOf(dayunIdx) {
        if (dayunIdx === 'pre') return '小运';
        const d = (currentBaZi && currentBaZi.dayun) ? currentBaZi.dayun.dayuns[parseInt(dayunIdx, 10) - 1] : null;
        return d ? (d.dayunganzhi || '') : '';
    }

    // 组装一次编辑请求：key + 弹窗标题 + 存入 notes 的元信息（结构同详情页）
    function buildNoteRequest(level, dayunIdx, lnIdx, lyIdx) {
        const gz = dayunGanZhiOf(dayunIdx);
        const phaseLabel = (dayunIdx === 'pre') ? '起运前小运' : (gz + '大运');
        let meta = {};
        let title = '';

        if (level === 'dayun') {
            if (dayunIdx === 'pre') {
                const first = (currentBaZi.dayun.dayuns[0] || {});
                meta = {
                    year: currentBaZi.birthYear,
                    ganzhi: '小运',
                    age: first.startAge ? ('1-' + (first.startAge - 1) + '岁') : ''
                };
            } else {
                const d = currentBaZi.dayun.dayuns[parseInt(dayunIdx, 10) - 1] || {};
                meta = { year: d.starYear || '', ganzhi: d.dayunganzhi || '', age: d.startAge || '' };
            }
            title = '记录【大运】' + phaseLabel + ' 发生的事';
        } else {
            const ln = (currentBaZi.liunians && currentBaZi.liunians[lnIdx]) ? currentBaZi.liunians[lnIdx] : null;
            const lnSub = ln
                ? (ln.year + ' ' + (ln.yearGanZhi || '') + ' · ' + (ln.nianling != null ? ln.nianling + '岁' : ''))
                : ('第 ' + lnIdx + ' 个流年');
            if (level === 'liunian') {
                meta = {
                    year: ln ? ln.year : '',
                    ganzhi: ln ? ln.yearGanZhi : '',
                    age: (ln && ln.nianling != null) ? ln.nianling : ''
                };
                title = '记录【' + phaseLabel + ' / 流年】' + lnSub + ' 发生的事';
            } else {
                const ly = (ln && ln.months) ? ln.months[lyIdx] : null;
                const md = (ly && ly.solarDate) ? (ly.solarDate.month + '/' + ly.solarDate.day) : '';
                meta = {
                    year: ln ? ln.year : '',
                    ganzhi: ly ? ly.ganZhi : '',
                    age: (ln && ln.nianling != null) ? ln.nianling : '',
                    md: md
                };
                const lySub = ly ? ((ly.JieQi || '-') + ' ' + (ly.ganZhi || '') + ' · ' + md) : ('第 ' + lyIdx + ' 月');
                title = '记录【' + phaseLabel + ' / ' + lnSub + ' · 流月】' + lySub + ' 发生的事';
            }
        }

        return {
            type: 'baziNoteEdit',
            key: cellNoteKey(level, dayunIdx, lnIdx, lyIdx),
            title: title,
            meta: meta
        };
    }

    // 依据父页回传的 marks，给有事件记录的格子打标记
    function applyNoteMarks() {
        if (!EMBED) return;
        document.querySelectorAll('.dayun-cell, .liunian-cell, .liuyue-cell').forEach(el => {
            let k = '';
            if (el.classList.contains('dayun-cell')) {
                k = cellNoteKey('dayun', el.dataset.dayunIndex);
            } else if (el.classList.contains('liunian-cell')) {
                if (selDayunIdx !== null) k = cellNoteKey('liunian', selDayunIdx, el.dataset.liunianIndex);
            } else if (selDayunIdx !== null && selLiunianIdx !== null) {
                k = cellNoteKey('liuyue', selDayunIdx, selLiunianIdx, el.dataset.liuyueIndex);
            }
            el.classList.toggle('has-note', !!(k && noteMarks[k]));
        });
    }

    // 向父页索要当前所有事件标记（子页每次重新加载/重新渲染后调用）
    function requestNoteMarks() {
        postToParent({ type: 'baziNotesWant' });
    }

    // 父页回传事件标记：baziNotesMark { marks: { key: note对象或true } }
    window.addEventListener('message', (e) => {
        const d = e.data;
        if (!d || d.type !== 'baziNotesMark' || !d.marks) return;
        Object.keys(noteMarks).forEach(k => { delete noteMarks[k]; });
        Object.keys(d.marks).forEach(k => { noteMarks[k] = d.marks[k]; });
        applyNoteMarks();
        renderNotePanels();   // 标记可能迟到（init 后才回传），此时选中项的事件内容要补显示
    });

    //大运添加点击事件
    function bindDayunEvents() {
        const table = document.getElementById('dayunTable');
        if (!table) return;

        table.addEventListener('click', (e) => {

            const cell = e.target.closest('.dayun-cell');
            if (!cell) return;

            // 选中所属大运列，并渲染其流年——每次切换大运都默认选中该大运的第一个流年
            // （流月仍不默认选中；首屏的「今年」默认选中由 applyDefaultSelection 负责覆盖）
            selectDayun(cell.dataset.dayunIndex, 0);
        });

        // embed 模式（案例详情内嵌）：双击大运列 → 请父页弹出事件编辑框
        table.addEventListener('dblclick', (e) => {
            if (!EMBED) return;
            const cell = e.target.closest('.dayun-cell');
            if (!cell) return;
            if (window.getSelection) window.getSelection().removeAllRanges();
            postToParent(buildNoteRequest('dayun', cell.dataset.dayunIndex, null, null));
        });

        table.addEventListener('mouseover', (e) => {
            const cell = e.target.closest('.dayun-cell');
            if (!cell) return;

            const idx = cell.dataset.dayunIndex;
            document.querySelectorAll(`.dayun-cell[data-dayun-index="${idx}"]`).forEach(c => {
                c.classList.add('hover');
            });
        });

        table.addEventListener('mouseout', (e) => {
            const cell = e.target.closest('.dayun-cell');
            if (!cell) return;

            const idx = cell.dataset.dayunIndex;
            document.querySelectorAll(`.dayun-cell[data-dayun-index="${idx}"]`).forEach(c => {
                c.classList.remove('hover');
            });
        });
    }
    function bindLiuNianEvent() {
        const table = document.getElementById('liuNianTable');
        if (!table) return;
        table.addEventListener('click', (e) => {

            const cell = e.target.closest('.liunian-cell');
            if (!cell) return;

            // 选中该流年，并渲染其流月（流月不自动选中）
            selectLiunian(parseInt(cell.dataset.liunianIndex, 10), null);
        });

        // embed 模式：双击流年列 → 请父页弹出事件编辑框
        table.addEventListener('dblclick', (e) => {
            if (!EMBED) return;
            const cell = e.target.closest('.liunian-cell');
            if (!cell || selDayunIdx === null) return;
            if (window.getSelection) window.getSelection().removeAllRanges();
            postToParent(buildNoteRequest('liunian', selDayunIdx, parseInt(cell.dataset.liunianIndex, 10), null));
        });
        table.addEventListener('mouseover', (e) => {
            const cell = e.target.closest('.liunian-cell');
            if (!cell) return;
            const idx = cell.dataset.liunianIndex;

            document.querySelectorAll(`.liunian-cell[data-liunian-index="${idx}"]`).forEach(c => {
                c.classList.add('hover');
            });
        });

        table.addEventListener('mouseout', (e) => {
            const cell = e.target.closest('.liunian-cell');
            if (!cell) return;

            const idx = cell.dataset.liunianIndex;
            document.querySelectorAll(`.liunian-cell[data-liunian-index="${idx}"]`).forEach(c => {
                c.classList.remove('hover');
            });
        });
    }

    //流年流月
    // liunianIdx：需要同时选中的流年下标（可为 null）。
    // 传入时会把该流年的流月表「一起」写进同一次 innerHTML —— 避免先删流月再建流月
    // 造成的瞬时变矮（父页 iframe 高度抖动 → 外层滚动条跳动）。
    function renderLiuNian(dayunIndex, liunianIdx) {

        const area = document.getElementById('liuNianArea');
        if (!area || !currentBaZi) return;

        let filtered = [];

        let genderCode = currentBaZi.qianKun === "乾" ? 1 : 0; // 1为男 0为女

        if (dayunIndex == 'pre') {
            filtered = BaZiCalc.getYearRange(BaZiCalc.dateZhuanhuan(currentBaZi.birthDate), genderCode);
        } else {
            filtered = BaZiCalc.generateLunarMonths(BaZiCalc.dateZhuanhuan(currentBaZi.birthDate), genderCode, dayunIndex - 1);
        }
        currentBaZi.liunians = filtered;

        if (filtered.length === 0) {
            area.innerHTML = '<div class="liunian-empty">该阶段暂无流年数据</div>';
            notifyHeight();
            return;
        }

        // 需要选中的流年（做下标边界校验，越界则不选）
        const selLn = (liunianIdx !== null && liunianIdx !== undefined && filtered[liunianIdx]) ? liunianIdx : null;

        let yearCells = '';
        let ageCells = '';
        let ganCells = '';

        filtered.forEach((item, ids) => {
            const colIdx = ids;
            const selCls = (selLn === colIdx) ? ' selected' : '';
            yearCells += `<td class="liunian-cell${selCls}" data-liunian-index="${colIdx}">${item.year}</td>`;
            ageCells += `<td class="liunian-cell${selCls}" data-liunian-index="${colIdx}">${item.nianling}岁</td>`;
            ganCells += `<td class="liunian-cell${selCls}" data-liunian-index="${colIdx}">${wxGanZhi(item.yearGanZhi)}</td>`;
        });

        // 流月与流年一次性写入（高度不抖动）
        const liuYueInner = (selLn !== null) ? buildLiuYueHtml(filtered[selLn].months, null) : '';

        area.innerHTML = `
            <div class="gz-row">
                <div class="gz-label">流年</div>
                <div class="dayun-scroll">
                    <table class="liunian-table" id="liuNianTable">
                        <tr>${yearCells}</tr>
                        <tr>${ageCells}</tr>
                        <tr>${ganCells}</tr>
                    </table>
                </div>
            </div>
            <div id="liunianNotePanel" class="note-inline-wrap"></div>
            <div id="liuYueArea">${liuYueInner}</div>
        `;
        bindLiuNianEvent();
        if (liuYueInner) bindLiuYueEvent();
        applyNoteMarks();
        notifyHeight();
    }

    // 流月表 HTML（caption + 三行表格）；selectedIdx 用于预置选中态
    function buildLiuYueHtml(months, selectedIdx) {
        if (!months || !months.length) {
            return '<div class="liunian-empty">该年暂无流月数据</div>';
        }
        let jieQiCells = '';
        let timeCells = '';
        let ganzhiCells = '';

        months.forEach((item, ids) => {
            const selCls = (selectedIdx === ids) ? ' selected' : '';
            jieQiCells += `<td class="liuyue-cell${selCls}" data-liuyue-index="${ids}">${item.JieQi}</td>`;
            timeCells += `<td class="liuyue-cell${selCls}" data-liuyue-index="${ids}">${item.solarDate.month}/${item.solarDate.day}</td>`;
            ganzhiCells += `<td class="liuyue-cell${selCls}" data-liuyue-index="${ids}">${wxGanZhi(item.ganZhi)}</td>`;
        });
        return `
            <div class="gz-row">
                <div class="gz-label">流月</div>
                <div class="dayun-scroll">
                    <table class="liuyue-table" id="liuYueTable">
                        <tr>${jieQiCells}</tr>
                        <tr>${timeCells}</tr>
                        <tr>${ganzhiCells}</tr>
                    </table>
                </div>
            </div>
            <div id="liuyueNotePanel" class="note-inline-wrap"></div>
        `;
    }

    function renderLiuYue(liuNianIndex) {
        const area = document.getElementById('liuYueArea');
        if (!area || !currentBaZi) return;

        const ln = currentBaZi.liunians ? currentBaZi.liunians[liuNianIndex] : null;
        if (!ln) return;

        // 只替换流月区内部内容（表格行数固定，整体高度不变，不会引起滚动条抖动）
        area.innerHTML = buildLiuYueHtml(ln.months, null);
        bindLiuYueEvent();
        applyNoteMarks();
        notifyHeight();
    }

    //流月添加点击事件（选中并联动右侧面板）
    function bindLiuYueEvent() {
        const table = document.getElementById('liuYueTable');
        if (!table) return;

        table.addEventListener('click', (e) => {
            const cell = e.target.closest('.liuyue-cell');
            if (!cell) return;

            selectLiuyue(parseInt(cell.dataset.liuyueIndex, 10));
        });

        // embed 模式：双击流月列 → 请父页弹出事件编辑框
        table.addEventListener('dblclick', (e) => {
            if (!EMBED) return;
            const cell = e.target.closest('.liuyue-cell');
            if (!cell || selDayunIdx === null || selLiunianIdx === null) return;
            if (window.getSelection) window.getSelection().removeAllRanges();
            postToParent(buildNoteRequest('liuyue', selDayunIdx, selLiunianIdx, parseInt(cell.dataset.liuyueIndex, 10)));
        });

        table.addEventListener('mouseover', (e) => {
            const cell = e.target.closest('.liuyue-cell');
            if (!cell) return;
            const idx = cell.dataset.liuyueIndex;
            document.querySelectorAll(`.liuyue-cell[data-liuyue-index="${idx}"]`).forEach(c => {
                c.classList.add('hover');
            });
        });

        table.addEventListener('mouseout', (e) => {
            const cell = e.target.closest('.liuyue-cell');
            if (!cell) return;
            const idx = cell.dataset.liuyueIndex;
            document.querySelectorAll(`.liuyue-cell[data-liuyue-index="${idx}"]`).forEach(c => {
                c.classList.remove('hover');
            });
        });
    }

    // ====== 页面入口：读取 URL 参数并渲染 ======
    function init() {
        const params = new URLSearchParams(window.location.search);

        // embed=1：由案例详情弹窗内嵌调用。内容与大页面一致，仅背景转白、去掉容器内边距，
        // 让 iframe 与弹窗白底无缝衔接，并隐藏"复制八字/保存"按钮
        EMBED = params.get('embed') === '1';
        if (EMBED) {
            document.body.style.background = '#fff';
            const bcEl = document.getElementById('baziContainer');
            if (bcEl) {
                bcEl.style.padding = '0';
                bcEl.classList.add('embed-mode');
            }
        }

        const y = parseInt(params.get('y'), 10);
        const m = parseInt(params.get('m'), 10);
        const d = parseInt(params.get('d'), 10);
        const h = params.get('h') !== null ? parseInt(params.get('h'), 10) : 12;
        const min = params.get('min') !== null ? parseInt(params.get('min'), 10) : 0;
        const gender = params.get('g') === 'female' ? 'female' : 'male';

        const container = document.getElementById('baziContainer');
        if (!y || !m || !d) {
            container.innerHTML = '<p style="color:#c00;padding:20px;">缺少日期参数，请从万年历页面选择日期后点击"确定"进入。</p>';
            return;
        }

        const dateKey = `${y}-${m}-${d}`;
        const baZi = calculateBaZi(dateKey, h, min, gender);
        showBaZi(baZi);

        // embed 模式：向父页（案例详情）索要已有事件标记，给对应格子打点
        if (EMBED) setTimeout(requestNoteMarks, 120);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
