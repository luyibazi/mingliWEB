﻿// 万年历 - 使用 tyme4ts 库：https://github.com/6tail/tyme4ts
// tyme4ts.mjs 以普通脚本加载，类已挂载到全局作用域

const LunarCalendar = (function () {
    const CONFIG = {
        MIN_YEAR: 1885,
        MAX_YEAR: 2050
    };

    const DOM = {
        yearGrid: null,
        prevYearBtn: null,
        nextYearBtn: null,
        currentYearText: null,
        ganZhiSpan: null,
        yearInfoDiv: null,
        toggleGridBtn: null
    };

    let currentYear = new Date().getFullYear();
    let currentBaZi = null;
    // 天干五合映射
    const GAN_HE_MAP = {
        '甲': '己', '己': '甲',
        '乙': '庚', '庚': '乙',
        '丙': '辛', '辛': '丙',
        '丁': '壬', '壬': '丁',
        '戊': '癸', '癸': '戊'
    };

    // rysl.json · 十二地支藏干人元司令分日用事
    // 顺序：寅(立春) → 卯(惊蛰) → 辰(清明) → 巳(立夏) → 午(芒种) → 未(小暑)
    //       申(立秋) → 酉(白露) → 戌(寒露) → 亥(立冬) → 子(大雪) → 丑(小寒)
    // 算法：前面各段按固定天数，最后一段吃掉当月剩余所有天数（不论月大月小）
    const RYSL_DATA = [
        { 月份: '寅月', 节气: '立春', 分日用事: [{ 天数: 7, 藏干: '戊' }, { 天数: 7, 藏干: '丙' }, { 天数: 16, 藏干: '甲' }] },
        { 月份: '卯月', 节气: '惊蛰', 分日用事: [{ 天数: 10, 藏干: '甲' }, { 天数: 20, 藏干: '乙' }] },
        { 月份: '辰月', 节气: '清明', 分日用事: [{ 天数: 9, 藏干: '乙' }, { 天数: 3, 藏干: '癸' }, { 天数: 18, 藏干: '戊' }] },
        { 月份: '巳月', 节气: '立夏', 分日用事: [{ 天数: 5, 藏干: '戊' }, { 天数: 9, 藏干: '庚' }, { 天数: 16, 藏干: '丙' }] },
        { 月份: '午月', 节气: '芒种', 分日用事: [{ 天数: 10, 藏干: '丙' }, { 天数: 9, 藏干: '己' }, { 天数: 11, 藏干: '丁' }] },
        { 月份: '未月', 节气: '小暑', 分日用事: [{ 天数: 9, 藏干: '丁' }, { 天数: 3, 藏干: '乙' }, { 天数: 18, 藏干: '己' }] },
        { 月份: '申月', 节气: '立秋', 分日用事: [{ 天数: 10, 藏干: '戊' }, { 天数: 3, 藏干: '壬' }, { 天数: 17, 藏干: '庚' }] },
        { 月份: '酉月', 节气: '白露', 分日用事: [{ 天数: 10, 藏干: '庚' }, { 天数: 20, 藏干: '辛' }] },
        { 月份: '戌月', 节气: '寒露', 分日用事: [{ 天数: 9, 藏干: '辛' }, { 天数: 3, 藏干: '丁' }, { 天数: 18, 藏干: '戊' }] },
        { 月份: '亥月', 节气: '立冬', 分日用事: [{ 天数: 7, 藏干: '戊' }, { 天数: 5, 藏干: '甲' }, { 天数: 18, 藏干: '壬' }] },
        { 月份: '子月', 节气: '大雪', 分日用事: [{ 天数: 10, 藏干: '壬' }, { 天数: 20, 藏干: '癸' }] },
        { 月份: '丑月', 节气: '小寒', 分日用事: [{ 天数: 9, 藏干: '癸' }, { 天数: 3, 藏干: '辛' }, { 天数: 18, 藏干: '己' }] }
    ];

    /**
     * 按 rysl.json 的分日用事天数计算司令分野
     * 算法：前面各段按固定天数累加，最后一段吃掉当月剩余所有天数
     * @param {SolarTime} solarTime
     * @returns {string} 例如 "癸司令（清明第12.3天，距立夏17.8天）"
     */
    function getSiLingFromRysl(solarTime) {
        try {
            const targetJD = solarTime.getJulianDay();
            const y = solarTime.getYear();

            const ryslJieNames = RYSL_DATA.map(x => x.节气);

            // 收集 targetYear ±1 年内所有「节」，带 JulianDay 和 RYSL 索引
            const candidates = [];
            for (let yy = y - 1; yy <= y + 1; yy++) {
                for (let i = 0; i < 24; i++) {
                    try {
                        const term = SolarTerm.fromIndex(yy, i);
                        if (!term.isJie()) continue;
                        const name = term.getName();
                        const idx = ryslJieNames.indexOf(name);
                        if (idx === -1) continue;
                        candidates.push({
                            term: term,
                            jd: term.getJulianDay(),
                            ryslIdx: idx
                        });
                    } catch (e) { }
                }
            }
            candidates.sort((a, b) => a.jd - b.jd);

            // 找到 <= targetJD 的最后一个节（当前月令起始）
            let curIdx = -1;
            for (let i = 0; i < candidates.length; i++) {
                if (candidates[i].jd <= targetJD) curIdx = i;
                else break;
            }
            if (curIdx === -1 || curIdx + 1 >= candidates.length) return '—';

            const curJie = candidates[curIdx];
            const nextJie = candidates[curIdx + 1];
            const monthData = RYSL_DATA[curJie.ryslIdx];

            // 已过天数（0-based 小数：交节时刻=0天）
            const elapsedDays = targetJD - curJie.jd;
            // 距下一节天数
            const remainDays = nextJie.jd - targetJD;

            const jieName = curJie.term.getName();
            const nextJieName = nextJie.term.getName();

            // 分段命中：前面各段按固定天数逐段累加，最后一段吃掉当月剩余所有天数
            // 亥月戊7 + 甲5 + 壬18 → [0,7)戊 / [7,12)甲 / [12,∞)壬
            const segs = monthData.分日用事;
            let hit = segs[segs.length - 1];
            let accEnd = 0;       // 0-based 累加结束点（exclusive）
            for (let i = 0; i < segs.length; i++) {
                accEnd += segs[i].天数;
                if (i === segs.length - 1) {
                    hit = segs[i];
                    break;
                }
                if (elapsedDays < accEnd) {
                    hit = segs[i];
                    break;
                }
            }

            // 保留1位小数
            const fmtDay = (d) => {
                if (d < 0) d = 0;
                return Math.round(d * 10) / 10;
            };

            return `${hit.藏干}司令（${jieName}第${fmtDay(elapsedDays)}天，距${nextJieName}${fmtDay(remainDays)}天）`;
        } catch (e) {
            console.error('getSiLingFromRysl error:', e);
            return '—';
        }
    }

    

    const GanZhiUtil = {
        GANZHI_FLOWER_NAME: {
            '甲子': '屋上之鼠', '乙丑': '海内之牛', '丙寅': '山林之虎', '丁卯': '望月之兔',
            '戊辰': '清温之龙', '己巳': '福气之蛇', '庚午': '堂里之马', '辛未': '得禄之羊',
            '壬申': '清秀之猴', '癸酉': '栖宿之鸡', '甲戌': '守身之狗', '乙亥': '过往之猪',
            '丙子': '田内之鼠', '丁丑': '湖内之牛', '戊寅': '过山之虎', '己卯': '山林之兔',
            '庚辰': '恕性之龙', '辛巳': '冬藏之蛇', '壬午': '军中之马', '癸未': '群内之羊',
            '甲申': '过树之猴', '乙酉': '唱午之鸡', '丙戌': '自眠之狗', '丁亥': '过山之猪',
            '戊子': '仓内之鼠', '己丑': '栏内之牛', '庚寅': '出山之虎', '辛卯': '蟾窟之兔',
            '壬辰': '行雨之龙', '癸巳': '草中之蛇', '甲午': '云中之马', '乙未': '敬重之羊',
            '丙申': '山上之猴', '丁酉': '独立之鸡', '戊戌': '进山之狗', '己亥': '道院之猪',
            '庚子': '梁上之鼠', '辛丑': '路途之牛', '壬寅': '过林之虎', '癸卯': '山林之兔',
            '甲辰': '伏潭之龙', '乙巳': '出穴之蛇', '丙午': '行路之马', '丁未': '失群之羊',
            '戊申': '独立之猴', '己酉': '报晓之鸡', '庚戌': '江湖之狗', '辛亥': '圈里之猪',
            '壬子': '山上之鼠', '癸丑': '栏内之牛', '甲寅': '立定之虎', '乙卯': '得道之兔',
            '丙辰': '天上之龙', '丁巳': '塘内之蛇', '戊午': '厩内之马', '己未': '草野之羊',
            '庚申': '食果之猴', '辛酉': '笼藏之鸡', '壬戌': '顾家之狗', '癸亥': '林下之猪'
        },

        getLunarGanZhi(year) {
            try {
                const lunarYearNum = this.getLunarYearNum(year);
                return LunarYear.fromYear(lunarYearNum).getSixtyCycle().getName();
            } catch (e) {
                return '—';
            }
        },

        getLunarYearNum(year) {
            const solarDay = SolarDay.fromYmd(year, 6, 1);
            return solarDay.getLunarDay().getLunarMonth().getLunarYear().getYear();
        },

        getZodiacByGanZhi(ganZhi) {
            if (!ganZhi || ganZhi === '—' || ganZhi.length < 2) return '—';
            try {
                const sc = SixtyCycle.fromName(ganZhi);
                return sc.getEarthBranch().getZodiac().getName();
            } catch (e) {
                return '—';
            }
        },

        getGanZhiFlowerName(ganZhi) {
            return this.GANZHI_FLOWER_NAME[ganZhi] || '—';
        },

        isLeapYear(year) {
            return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        },

        getShiChen(hour) {
            if (hour >= 23) return '夜子时';
            const names = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
            const idx = Math.floor((hour + 1) / 2);
            return names[idx] + '时';
        }
    };

    /**
     * 输入一个阳历日期时间（精确到分钟），返回该时刻对应的农历年干支
     * @param {number} year   公历年（如 2024）
     * @param {number} month  公历月（1-12）
     * @param {number} day    公历日（1-31）
     * @param {number} [hour=0]    公历时（0-23）
     * @param {number} [minute=0]  公历分（0-59）
     * @returns {Object}
     *   yearGanZhi:   农历年干支（如 "甲辰"）
     *   monthGanZhi:  农历月干支（如 "丙寅"）
     *   dayGanZhi:    农历日干支（如 "庚子"）
     *   hourGanZhi:   农历时干支（如 "丙子"）
     *   lunarYearNum: 农历数字年（如 2024）
     *   lunarYearName:农历年名（如 "甲辰年"）
     */
    function getLunarYearGanZhiFromSolar(year, month, day, hour = 0, minute = 0) {
        const solarTime = SolarTime.fromYmdHms(year, month, day, hour, minute, 0);
        const lunarHour = solarTime.getLunarHour();
        const lunarDay = lunarHour.getLunarDay();
        const lunarMonth = lunarDay.getLunarMonth();
        const lunarYear = lunarMonth.getLunarYear();

        return {
            yearGanZhi: lunarYear.getSixtyCycle().getName(),
            monthGanZhi: lunarMonth.getSixtyCycle().getName(),
            dayGanZhi: lunarDay.getSixtyCycle().getName(),
            hourGanZhi: lunarHour.getSixtyCycle().getName(),
            lunarYearNum: lunarYear.getYear(),
            lunarYearName: lunarYear.getSixtyCycle().getName() + '年'
        };
    }

    function getAllSolarTerms(year) {
        const terms = [];
        for (let y = year - 1; y <= year + 1; y++) {
            for (let i = 0; i < 24; i++) {
                try {
                    const term = SolarTerm.fromIndex(y, i);
                    const solarTime = term.getJulianDay().getSolarTime();
                    const solarDay = term.getSolarDay();
                    terms.push({
                        name: term.getName(),
                        year: solarDay.getYear(),
                        month: solarDay.getMonth(),
                        day: solarDay.getDay(),
                        hour: solarTime.getHour(),
                        minute: solarTime.getMinute(),
                        lunarDay: solarDay.getLunarDay()
                    });
                } catch (e) { }
            }
        }
        return terms;
    }

    const YearGrid = {
        init() {
            let html = '';
            for (let y = CONFIG.MIN_YEAR; y <= CONFIG.MAX_YEAR; y++) {
                const ganZhi = GanZhiUtil.getLunarGanZhi(y);
                html += `<div class="year-cell ${y === currentYear ? 'selected' : ''}" data-year="${y}">
                    <span class="year-num">${y}</span>
                    <span class="year-ganzhi">${ganZhi}</span>
                </div>`;
            }
            DOM.yearGrid.innerHTML = html;

            DOM.yearGrid.querySelectorAll('.year-cell').forEach(cell => {
                cell.addEventListener('click', () => {
                    const y = parseInt(cell.dataset.year, 10);
                    YearGrid.select(y);
                });
            });
        },

        select(year) {
            if (year < CONFIG.MIN_YEAR || year > CONFIG.MAX_YEAR) return;
            currentYear = year;

            DOM.yearGrid.querySelectorAll('.year-cell').forEach(cell => {
                cell.classList.toggle('selected', parseInt(cell.dataset.year, 10) === currentYear);
            });

            YearInfo.update();
            YearGrid.scrollToSelected();
        },

        scrollToSelected() {
            const selected = DOM.yearGrid.querySelector('.year-cell.selected');
            if (selected) {
                selected.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        goToPrevYear() {
            if (currentYear > CONFIG.MIN_YEAR) {
                this.select(currentYear - 1);
            }
        },

        goToNextYear() {
            if (currentYear < CONFIG.MAX_YEAR) {
                this.select(currentYear + 1);
            }
        },

        toggle() {
            const isCollapsed = DOM.yearGrid.classList.contains('collapsed');
            if (isCollapsed) {
                DOM.yearGrid.classList.remove('collapsed');
                DOM.toggleGridBtn.textContent = '收起 ↓';
                DOM.toggleGridBtn.title = '收起年份列表';
            } else {
                DOM.yearGrid.classList.add('collapsed');
                DOM.toggleGridBtn.textContent = '展开 ↑';
                DOM.toggleGridBtn.title = '展开年份列表';
            }
        }
    };

    const YearInfo = {
        update() {
            DOM.currentYearText.textContent = currentYear;

            try {
                const ganZhi = GanZhiUtil.getLunarGanZhi(currentYear);
                const zodiac = GanZhiUtil.getZodiacByGanZhi(ganZhi);
                const flowerName = GanZhiUtil.getGanZhiFlowerName(ganZhi);

                DOM.ganZhiSpan.textContent = `${ganZhi} · ${zodiac}`;

                const lunarYearNum = GanZhiUtil.getLunarYearNum(currentYear);
                const lunarYear = LunarYear.fromYear(lunarYearNum);
                const isLeap = lunarYear.getLeapMonth() > 0;
                const months = lunarYear.getMonths();

                const colCount = 1 + months.length * 2;

                let cells = [];

                cells.push('<div class="calendar-cell label">月别</div>');
                months.forEach(m => {
                    const size = m.getDayCount() === 30 ? '大' : '小';
                    cells.push(`<div class="calendar-cell span-2">${m.getName()}${size}</div>`);
                });

                cells.push('<div class="calendar-cell label">干支</div>');
                months.forEach(m => {
                    cells.push(`<div class="calendar-cell span-2">${m.getSixtyCycle().getName()}</div>`);
                });

                const allTerms = getAllSolarTerms(currentYear);

                cells.push('<div class="calendar-cell label">节气</div>');
                months.forEach(m => {
                    const dayCount = m.getDayCount();
                    const firstDay = m.getFirstDay();
                    const firstSolar = firstDay.getSolarDay();
                    const startTs = new Date(firstSolar.getYear(), firstSolar.getMonth() - 1, firstSolar.getDay()).getTime();
                    const endTs = startTs + dayCount * 86400000;

                    const matched = [];
                    for (let i = 0; i < allTerms.length; i++) {
                        const t = allTerms[i];
                        const ts = new Date(t.year, t.month - 1, t.day).getTime();
                        if (ts >= startTs && ts < endTs) {
                            const hh = String(t.hour).padStart(2, '0');
                            const mm = String(t.minute).padStart(2, '0');
                            const shiChen = GanZhiUtil.getShiChen(t.hour);
                            matched.push({
                                name: t.name,
                                time: `${t.lunarDay.getName()} ${hh}:${mm} ${shiChen}`,
                                ts: ts
                            });
                        }
                    }
                    matched.sort((a, b) => a.ts - b.ts);

                    if (matched.length === 1) {
                        const parts = matched[0].time.split(' ');
                        cells.push(`<div class="calendar-cell jieqi-cell span-2">
                            <div class="jieqi-name">${matched[0].name}</div>
                            <div class="jieqi-time">${parts[0]}</div>
                            <div class="jieqi-time">${parts[1]}</div>
                            <div class="jieqi-time">${parts[2]}</div>
                        </div>`);
                    } else {
                        for (let i = 0; i < 2; i++) {
                            if (matched[i]) {
                                const parts = matched[i].time.split(' ');
                                cells.push(`<div class="calendar-cell jieqi-cell">
                                    <div class="jieqi-name">${matched[i].name}</div>
                                    <div class="jieqi-time">${parts[0]}</div>
                                    <div class="jieqi-time">${parts[1]}</div>
                                    <div class="jieqi-time">${parts[2]}</div>
                                </div>`);
                            } else {
                                cells.push('<div class="calendar-cell"></div>');
                            }
                        }
                    }
                });

                cells.push('<div class="calendar-cell label">农历</div>');
                months.forEach(() => {
                    cells.push('<div class="calendar-cell">公历</div>');
                    cells.push('<div class="calendar-cell">干支</div>');
                });

                const maxDays = Math.max(...months.map(m => m.getDayCount()));
                const dayNames = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
                for (let dayIdx = 1; dayIdx <= maxDays; dayIdx++) {
                    cells.push(`<div class="calendar-cell label day-cell">${dayIdx <= 30 ? dayNames[dayIdx - 1] : ''}</div>`);

                    months.forEach(m => {
                        if (dayIdx <= m.getDayCount()) {
                            const lunarMonthWithLeap = m.getMonthWithLeap();
                            const lunarDay = LunarDay.fromYmd(m.getLunarYear().getYear(), lunarMonthWithLeap, dayIdx);
                            const solarDay = lunarDay.getSolarDay();
                            const ganZhi = lunarDay.getSixtyCycle().getName();
                            const dateKey = `${solarDay.getYear()}-${solarDay.getMonth()}-${solarDay.getDay()}`;
                            const cellId = `${dateKey}-${lunarMonthWithLeap}-${dayIdx}`;
                            const lunarTip = `农历${m.getName()}${dayNames[dayIdx - 1]}（${ganZhi}）`;
                            cells.push(`<div class="calendar-cell day-cell clickable" data-cell="${cellId}" data-date="${dateKey}" data-lunar="${lunarMonthWithLeap}-${dayIdx}" title="${lunarTip}">${solarDay.getMonth()}月${solarDay.getDay()}日</div>`);
                            cells.push(`<div class="calendar-cell day-cell clickable" data-cell="${cellId}" data-date="${dateKey}" data-lunar="${lunarMonthWithLeap}-${dayIdx}" title="${lunarTip}">${ganZhi}</div>`);
                        } else {
                            cells.push('<div class="calendar-cell day-cell"></div>');
                            cells.push('<div class="calendar-cell day-cell"></div>');
                        }
                    });
                }

                const monthsHtml = `<div class="calendar-grid" style="grid-template-columns: repeat(${colCount}, auto);">${cells.join('')}</div>`;

                const leapMonth = lunarYear.getLeapMonth();
                const leapInfo = isLeap ? `闰${['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'][leapMonth - 1]}月` : '无';
                const yearDays = lunarYear.getDayCount();

                DOM.yearInfoDiv.innerHTML = `
                    <div class="info-list">
                        <div class="info-item"><span class="value">${currentYear} 年</span></div>
                        <div class="info-item"><span class="value">${ganZhi}</span></div>
                        <div class="info-item"><span class="value">${isLeap ? `是（闰年，${yearDays} 天，${leapInfo}）` : `否（平年，${yearDays} 天）`}</span></div>
                        <div class="info-item"><span class="value">${flowerName}</span></div>
                    </div>
                    ${monthsHtml}
                `;
                showTimeInput();
            } catch (err) {
                DOM.yearInfoDiv.innerHTML = `<p style="color:red;">信息获取失败：${err.message}</p>`;
                console.error(err);
            }
        }
    };

    const EventHandler = {
        bind() {
            DOM.prevYearBtn.addEventListener('click', YearGrid.goToPrevYear.bind(YearGrid));
            DOM.nextYearBtn.addEventListener('click', YearGrid.goToNextYear.bind(YearGrid));
            DOM.toggleGridBtn.addEventListener('click', YearGrid.toggle.bind(YearGrid));

            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
                if (e.key === 'ArrowLeft') YearGrid.goToPrevYear();
                if (e.key === 'ArrowRight') YearGrid.goToNextYear();
            });

            document.addEventListener('click', (e) => {
                const target = e.target;
                if (target.classList.contains('clickable')) {
                    const cellId = target.dataset.cell;
                    const dateKey = target.dataset.date;
                    const isSelected = target.classList.contains('selected');
                    document.querySelectorAll('.clickable').forEach(cell => {
                        cell.classList.remove('selected');
                    });
                    if (!isSelected) {
                        document.querySelectorAll('.clickable[data-cell="' + cellId + '"]').forEach(cell => {
                            cell.classList.add('selected');
                        });
                        showTimeInput(dateKey);
                    } else {
                        showTimeInput();
                    }
                }
            });

            document.addEventListener('mouseover', (e) => {
                const target = e.target;
                if (target.classList.contains('clickable')) {
                    const cellId = target.dataset.cell;
                    document.querySelectorAll('.clickable[data-cell="' + cellId + '"]').forEach(cell => {
                        cell.classList.add('hover');
                    });
                }
            });

            document.addEventListener('mouseout', (e) => {
                const target = e.target;
                if (target.classList.contains('clickable')) {
                    const cellId = target.dataset.cell;
                    document.querySelectorAll('.clickable[data-cell="' + cellId + '"]').forEach(cell => {
                        cell.classList.remove('hover');
                    });
                }
            });
        }
    };

    function init() {
        DOM.yearGrid = document.getElementById('yearGrid');
        DOM.prevYearBtn = document.getElementById('prevYear');
        DOM.nextYearBtn = document.getElementById('nextYear');
        DOM.currentYearText = document.getElementById('currentYearText');
        DOM.ganZhiSpan = document.getElementById('ganZhi');
        DOM.yearInfoDiv = document.getElementById('yearInfo');
        DOM.toggleGridBtn = document.getElementById('toggleGrid');

        // 检查 URL 参数，自动加载八字
        const params = new URLSearchParams(window.location.search);
        const y = params.get('y');
        const m = params.get('m');
        const d = params.get('d');
        const h = params.get('h');
        const min = params.get('min');
        const g = params.get('g');

        if (y) {
            currentYear = parseInt(y, 10);
        }

        if (currentYear < CONFIG.MIN_YEAR) currentYear = CONFIG.MIN_YEAR;
        if (currentYear > CONFIG.MAX_YEAR) currentYear = CONFIG.MAX_YEAR;

        YearGrid.init();
        YearInfo.update();
        EventHandler.bind();

        // 如果有完整参数，自动计算八字
        if (y && m && d && h !== null && min !== null) {
            const dateKey = `${y}-${parseInt(m, 10)}-${parseInt(d, 10)}`;
            const hour = parseInt(h, 10);
            const minute = parseInt(min, 10);
            const gender = g === 'female' ? 'female' : 'male';

            // 显示时间输入区域并自动触发计算
            showTimeInput(dateKey);
            const timeInput = document.getElementById('timeInput');
            const confirmBtn = document.getElementById('confirmBtn');
            if (timeInput) {
                timeInput.value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                // 更新时辰显示
                const shiChenDisplay = document.getElementById('shiChenDisplay');
                if (shiChenDisplay) {
                    shiChenDisplay.textContent = `时辰: ${GanZhiUtil.getShiChen(hour)}`;
                }
            }
            if (g === 'female') {
                const femaleRadio = document.querySelector('input[name="gender"][value="female"]');
                if (femaleRadio) femaleRadio.checked = true;
            }
            // 自动计算
            const baZi = calculateBaZi(dateKey, hour, minute, gender);
            showBaZi(baZi);

            // 自动滚动到八字结果区域
            setTimeout(function () {
                var baZiArea = document.getElementById('baZiArea');
                if (baZiArea) {
                    baZiArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);

            // 自动选中日历表格中对应日期的单元格
            const clickableCells = document.querySelectorAll('.clickable[data-date="' + dateKey + '"]');
            clickableCells.forEach(cell => cell.classList.add('selected'));
        }
    }

    function showTimeInput(dateKey) {
        let html = '';

        if (!dateKey) {
            html = `
                <div id="timeInputArea" class="time-input-area">
                    <div class="time-info">
                        <span style="color:#999;">请先选择日期</span>
                    </div>
                    <div class="time-select">
                        <label>性别：</label>
                        <label><input type="radio" name="gender" value="male" disabled>男</label>
                        <label><input type="radio" name="gender" value="female" disabled>女</label>
                        <label>时分：</label>
                        <input type="time" id="timeInput" value="08:00" disabled>
                        <span id="shiChenDisplay" class="shiChen-display" style="color:#999;">时辰: —</span>
                    </div>
                    <div class="time-actions">
                        <button id="confirmBtn" disabled>确定</button>
                    </div>
                </div>
            `;
        } else {
            const [year, month, day] = dateKey.split('-').map(Number);
            const solarDay = SolarDay.fromYmd(year, month, day);
            const lunarDay = solarDay.getLunarDay();

            html = `
                <div id="timeInputArea" class="time-input-area">
                    <div class="time-info">
                        <span>公历：${year}年${month}月${day}日</span>
                        <span>农历：${lunarDay.getLunarMonth().getName()}${lunarDay.getName()}</span>
                    </div>
                    <div class="time-select">
                        <label>性别：</label>
                        <label><input type="radio" name="gender" value="male" checked>男</label>
                        <label><input type="radio" name="gender" value="female">女</label>
                        <label>时分：</label>
                        <input type="time" id="timeInput" value="08:00">
                        <span id="shiChenDisplay" class="shiChen-display">时辰: 午时</span>
                    </div>
                    <div class="time-actions">
                        <button id="confirmBtn">确定</button>
                    </div>
                </div>
            `;
        }

        let existing = document.getElementById('timeInputArea');
        if (existing) {
            existing.remove();
        }
        DOM.yearInfoDiv.insertAdjacentHTML('afterend', html);

        if (dateKey) {
            const timeInput = document.getElementById('timeInput');
            const shiChenDisplay = document.getElementById('shiChenDisplay');
            const confirmBtn = document.getElementById('confirmBtn');

            function updateShiChen() {
                const time = timeInput.value;
                if (!time) return;
                const [hour, minute] = time.split(':').map(Number);
                const shiChen = GanZhiUtil.getShiChen(hour);
                shiChenDisplay.textContent = `时辰: ${shiChen}`;
            }

            updateShiChen();
            timeInput.addEventListener('change', updateShiChen);
            timeInput.addEventListener('input', updateShiChen);

            confirmBtn.addEventListener('click', () => {
                const time = timeInput.value;
                const [hour, minute] = time.split(':').map(Number);
                const gender = document.querySelector('input[name="gender"]:checked').value;
                const baZi = calculateBaZi(dateKey, hour, minute, gender);
                showBaZi(baZi);

            });
        }
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
        // 获取司令分野（按 rysl.json 藏干天数分配）
        const siLing = getSiLingFromRysl(solarTime);

        // 起运信息
        const genderCode = gender === 'male' ? 1 : 0;
        const childLimit = ChildLimit.fromSolarTime(solarTime, genderCode);

        dayun.startTime = childLimit.info.startTime;
        dayun.endTime = childLimit.info.endTime;
        //交运
        let jiaoYun = null;
        let qishi = null;
        // 用童限结束时间计算交运时间
        if (dayun && dayun.endTime) {
            const et = dayun.endTime;
            jiaoYun = BaZiCalc.getLastJieQiDiff({
                year: et.getYear(),
                month: et.getMonth(),
                day: et.getDay(),
                hour: et.getHour(),
                minute: et.getMinute(),
                second: et.getSecond()
            });
            const st = dayun.startTime;
            qishi = BaZiCalc.getLastJieQiDiff({
                year: st.getYear(),
                month: st.getMonth(),
                day: st.getDay(),
                hour: st.getHour(),
                minute: st.getMinute(),
                second: st.getSecond()
            })
        }



        // console.log(lunarYear.year, eightChar.getMonth().getName(), jiaoYun.yearGan);
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
            taiYuan: eightChar.getFetalOrigin().getName(),
            yearlyFortunes: yearlyFortunes,
            childLimit: childLimit,
            dayun: dayun,
            birthYear: lunarYearNum,
            birthDate: `${year}年${month}月${day}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            solarDate: `${year}年${month}月${day}日`,
            lunarDate: `${lunarHour.getLunarDay().getLunarMonth().getName()}${lunarHour.getLunarDay().getName()}`,
            shiChen: GanZhiUtil.getShiChen(hour),
            inputParams: { year, month, day, hour, minute, gender },
            jiaoYun: jiaoYun,
            qishi: qishi
        };
    }

    function showBaZi(baZi) {
        currentBaZi = baZi;
        let existing = document.getElementById('baZiArea');
        if (existing) {
            existing.remove();
        }

        let daYunHtml = '';
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
                ganCells += `<td class="dayun-cell" data-dayun-index="${colIdx}">${item.dayunganzhi}</td>`;
            });

            daYunHtml = `
                <div >
                    <table class="dayun-table" id="dayunTable">
                        <tr>${yearCells}</tr>
                        <tr>${ageCells}</tr>
                        <tr>${ganCells}</tr>
                    </table>
                    <div id="liuNianArea"></div>
                </div>
            `;
        }





        const html = `
            <div id="baZiArea" class="bazi-area">
                <div class="bazi-layout">
                    <table class="bazi-table">
                        <tr>
                            <th>${baZi.qianKun}</th>
                            <th>年</th>
                            <th>月</th>
                            <th>日</th>
                            <th>时</th>
                        </tr>
                        <tr>
                            <th>干</th>
                            <td>${baZi.year.charAt(0)}</td>
                            <td>${baZi.month.charAt(0)}</td>
                            <td>${baZi.day.charAt(0)}</td>
                            <td>${baZi.hour.charAt(0)}</td>
                        </tr>
                        <tr>
                            <th>支</th>
                            <td>${baZi.year.charAt(1)}</td>
                            <td>${baZi.month.charAt(1)}</td>
                            <td>${baZi.day.charAt(1)}</td>
                            <td>${baZi.hour.charAt(1)}</td>
                        </tr>
                    </table>
                    <div class="siling-box">
                        <div class="siling-title">司令分野</div>
                        <div class="siling-content">${baZi.siLing}</div>
                    </div>
                    <div class="siling-box">
                        <div class="siling-title">胎元</div>
                        <div class="siling-content">${baZi.taiYuan}</div>
                    </div>
                    <div class="siling-box">
                        <div class="siling-title">交运时间</div>
                        <div class="siling-content">
                            ${baZi.jiaoYun ? `
                                ${baZi.jiaoYun.jieQi}后${baZi.jiaoYun.days}天${baZi.jiaoYun.hours}小时
                                <br>
                                (${baZi.jiaoYun.jiaoYunGan})
                            ` : '—'}
                        </div>
                    </div>
                </div>
                ${daYunHtml}
                <div style="margin-top: 12px; display: flex; gap: 10px; align-items: center;">
                    <button id="exportBtn" class="export-btn">复制八字</button>
                    <button id="saveBtn" class="export-btn">保存</button>
                </div>
            </div>
        `;

        const timeInputArea = document.getElementById('timeInputArea');
        timeInputArea.insertAdjacentHTML('afterend', html);

        bindDayunEvents();
        bindExportEvent();
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

        var overlay = document.createElement('div');
        overlay.id = 'saveDialog';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:9999;display:flex;justify-content:center;align-items:center;';

        var box = document.createElement('div');
        box.style.cssText = 'background:#fff;border:1px solid #000;padding:25px;width:360px;';
        box.innerHTML =
            '<h3 style="margin-bottom:15px;font-size:16px;font-weight:normal;text-align:center;">保存案例</h3>' +
            '<label style="display:block;margin-bottom:5px;font-size:13px;">案例名称</label>' +
            '<input type="text" id="saveNameInput" style="width:100%;padding:8px;border:1px solid #000;font-size:14px;margin-bottom:15px;box-sizing:border-box;" placeholder="如：张三" autofocus />' +
            '<label style="display:block;margin-bottom:5px;font-size:13px;">描述（选填）</label>' +
            '<textarea id="saveDescInput" rows="3" style="width:100%;padding:8px;border:1px solid #000;font-size:14px;margin-bottom:15px;box-sizing:border-box;resize:vertical;font-family:inherit;" placeholder="可填写备注信息，也可留空"></textarea>' +
            '<div style="display:flex;gap:10px;justify-content:center;">' +
            '<button id="saveCancelBtn" style="border:1px solid #000;background:#fff;color:#000;padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;">取消</button>' +
            '<button id="saveConfirmBtn" style="border:1px solid #000;background:#000;color:#fff;padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;">确认</button>' +
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

    // 【GitHub Push Protection 要求：不再在源码中硬编码 Gitee TOKEN】
    function _getGiteeTokenForSaveCurrent() {
        if (typeof window.GiteeStorage !== 'undefined' && window.GiteeStorage.CONFIG && window.GiteeStorage.CONFIG.TOKEN) {
            return window.GiteeStorage.CONFIG.TOKEN;
        }
        var tk = '';
        try { tk = (window.localStorage && window.localStorage.getItem('gitee_token')) || ''; } catch (e) { tk = ''; }
        if (!tk && typeof window !== 'undefined' && typeof window.prompt === 'function') {
            var input = window.prompt(
                '请输入你的 Gitee 私人令牌（只在第一次访问时需要，之后会保存在本机浏览器）：\n\n' +
                '生成方法：Gitee 头像 -> 设置 -> 私人令牌 -> 生成新令牌 -> 勾选 projects 权限'
            );
            if (input && (input = input.trim())) {
                tk = input;
                try { window.localStorage.setItem('gitee_token', tk); } catch (e) {}
            }
        }
        return tk;
    }


    function saveCurrentToGitee(caseName, desc) {
        var bz = currentBaZi;
        if (!bz || !bz.inputParams) return;

        var p = bz.inputParams;
        // 【精简保存体积】大运、12步大运数组、70年流年 yearlyFortunes 一律不保存！
        // 详情页打开时用下方 inputParams 调用项目原有 calculateBaZi 现场重新生成，完全等价
        // 仅保留 复制八字按钮所需的小字段（字符串）+ 重算必需的种子信息
        var fullBazi = {
            qianKun: bz.qianKun,
            year: bz.year,
            month: bz.month,
            day: bz.day,
            hour: bz.hour,
            siLing: bz.siLing,
            taiYuan: bz.taiYuan,
            birthYear: bz.birthYear,
            birthDate: bz.birthDate,
            solarDate: bz.solarDate,
            lunarDate: bz.lunarDate,
            shiChen: bz.shiChen,
            inputParams: bz.inputParams,   // ★重算大运流年流月的唯一入口（年月日时分性别）
            jiaoYun: bz.jiaoYun || null,   // 小字段，仅用于详情快速展示
            qishi: bz.qishi || null        // 小字段，仅用于童限分段
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
        var tk = _getGiteeTokenForSaveCurrent();
        if (!tk) { alert('未提供 Gitee 私人令牌，已取消保存'); return; }


        var btn = document.getElementById('exportBtn');
        var origText = btn ? btn.textContent : '';
        if (btn) btn.textContent = '保存中...';

        fetch('https://gitee.com/api/v5/repos/a-treasure-trove-of-wisdom/bazi-data/contents/data/records.json?access_token=' + encodeURIComponent(tk))
            .then(function (r) { return r.json(); })
            .then(function (file) {
                var text = atob(file.content.replace(/\n/g, ''));
                var decoded = decodeURIComponent(escape(text));
                var data = JSON.parse(decoded);
                data.records.push(newRecord);
                var content = JSON.stringify(data, null, 2);
                var b64 = btoa(unescape(encodeURIComponent(content)));
                return fetch('https://gitee.com/api/v5/repos/a-treasure-trove-of-wisdom/bazi-data/contents/data/records.json', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: tk,
                        message: 'save bazi record via app',
                        content: b64,
                        sha: file.sha,
                        branch: 'master'
                    })
                });
            })
            .then(function (r) { return r.json(); })
            .then(function () {
                if (btn) { btn.textContent = '已保存'; setTimeout(function () { btn.textContent = origText; }, 1500); }
                if (window.LunarList && window.LunarList.refresh) {
                    window.LunarList.refresh();
                }
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
    //大运添加点击事件
    function bindDayunEvents() {
        const table = document.getElementById('dayunTable');
        if (!table) return;

        table.addEventListener('click', (e) => {

            const cell = e.target.closest('.dayun-cell');
            if (!cell) return;

            const idx = cell.dataset.dayunIndex;
            document.querySelectorAll('.dayun-cell').forEach(c => {
                c.classList.remove('selected');
            });
            document.querySelectorAll(`.dayun-cell[data-dayun-index="${idx}"]`).forEach(c => {
                c.classList.add('selected');
            });
            //生成流年流月
            renderLiuNian(idx);
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
            const idx = cell.dataset.liunianIndex;

            document.querySelectorAll('.liunian-cell').forEach(c => {
                c.classList.remove('selected');
            });
            document.querySelectorAll(`.liunian-cell[data-liunian-index="${idx}"]`).forEach(c => {
                c.classList.add('selected');
            });

            renderLiuYue(idx);
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
    function renderLiuNian(dayunIndex) {

        const area = document.getElementById('liuNianArea');
        if (!area || !currentBaZi) return;


        let filtered = [];
        let title = '流年';

        if (dayunIndex === 'pre') {
            title = '起运前流年';
        } else {
            const idx = parseInt(dayunIndex, 10) - 1;
            const dayuns = currentBaZi.dayun.dayuns.slice(0, 12);
            const selected = dayuns[idx];
            title = `${selected.dayunganzhi}大运·流年`;
        }
        let genderCode = currentBaZi.qianKun === "乾" ? 1 : 0; // 1为男 0为女
        // 出生日期
      
        if (dayunIndex == 'pre') {

            filtered = BaZiCalc.getYearRange(BaZiCalc.dateZhuanhuan(currentBaZi.birthDate), genderCode);

        } else {
            filtered = BaZiCalc.generateLunarMonths(BaZiCalc.dateZhuanhuan(currentBaZi.birthDate), genderCode,dayunIndex - 1);
        }
        currentBaZi.liunians = filtered;

        if (filtered.length === 0) {
            area.innerHTML = '<div class="liunian-empty">该阶段暂无流年数据</div>';
            return;
        }

        let yearCells = `<th class="liunian-title">${title}</th>`;
        let ageCells = `<th></th>`;
        let ganCells = `<th></th>`;

        filtered.forEach((item, ids) => {
            const colIdx = ids;
            yearCells += `<td class="liunian-cell" data-liunian-index="${colIdx}">${item.year}</td>`;
            ageCells += `<td class="liunian-cell" data-liunian-index="${colIdx}">${item.nianling}岁</td>`;
            ganCells += `<td class="liunian-cell" data-liunian-index="${colIdx}">${item.yearGanZhi}</td>`;
        });

        area.innerHTML = `
            <table class="liunian-table" id="liuNianTable">
                <tr>${yearCells}</tr>
                <tr>${ageCells}</tr>
                <tr>${ganCells}</tr>
            </table>
            <div id="liuYueArea"></div>
        `;
        bindLiuNianEvent();
    }

    function renderLiuYue(liuNianIndex) {
        const area = document.getElementById('liuYueArea');
        if (!area || !currentBaZi) return;

        let filtered = [];
        let title = '流月';
        filtered = currentBaZi.liunians[liuNianIndex].months;
        let jieQiCells = `<th class="liunian-title">${title}</th>`;
        let timeCells = `<th></th>`;
        let ganzhiCells = `<th></th>`;

        filtered.forEach((item, ids) => {

            jieQiCells += `<td class="" >${item.JieQi}</td>`;
            timeCells += `<td class="" >${item.solarDate.month}/${item.solarDate.day}</td>`;
            ganzhiCells += `<td class="" >${item.ganZhi}</td>`;
        })
        area.innerHTML = `
            <table class="liuyue-table" >
                <tr>${jieQiCells}</tr>
                <tr>${timeCells}</tr>
                <tr>${ganzhiCells}</tr>
            </table>
            
        `;

    }

 

   

    return {
        init, config: CONFIG, ganZhiUtil: GanZhiUtil, yearGrid: YearGrid, yearInfo: YearInfo,
        // 仅用于调试，外部可访问
        __dbg: {
            calculateBaZi: calculateBaZi,
     
            
            getLunarYearGanZhiFromSolar: getLunarYearGanZhiFromSolar,
            getSiLingFromRysl: getSiLingFromRysl,
           
            serializeMonths: serializeMonths,
            RYSL_DATA: RYSL_DATA,
            GAN_HE_MAP: GAN_HE_MAP
        }
    };
})();

document.addEventListener('DOMContentLoaded', LunarCalendar.init);

// ====== 入口：统一接口暴露 ======
(function(global) {
    function _viewRecord(id) {
        var cached = global.RecordCache.getRecords();
        var r = cached.find(function (x) { return x.id === id; });
        if (!r) return;
        var g = (r.gender === '女') ? 'female' : 'male';
        var params = '?y=' + r.year + '&m=' + r.month + '&d=' + r.day + '&h=' + (r.hour || 0) + '&min=' + (r.minute || 0) + '&g=' + g;
        window.location.href = window.location.pathname + params;
    }

    function _detailRecord(id) {
        var cached = global.RecordCache.getRecords();
        var r = cached.find(function (x) { return x.id === id; });
        if (!r) {
            global.UI.showToast('未找到该记录');
            return;
        }
        global.DetailDialog.showDetailDialog(r);
    }

    global.LunarList = {
        viewRecord: _viewRecord,
        detailRecord: _detailRecord,
        showNotesRecord: global.NotesSystem.showNotesRecord,
        deleteRecord: global.RecordList.deleteRecord,
        refresh: global.RecordList.loadAndRenderList
    };

    // 初始化导航绑定
    global.Navigation.init();
})(window);