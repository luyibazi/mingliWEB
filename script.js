// 万年历 - 使用 tyme4ts 库：https://github.com/6tail/tyme4ts
// tyme4ts.mjs 以普通脚本加载，类已挂载到全局作用域

const LunarCalendar = (function () {
    const CONFIG = {
        MIN_YEAR: 1000,
        MAX_YEAR: 2050
    };

    const DOM = {
        yearGrid: null,
        prevYearBtn: null,
        nextYearBtn: null,
        blockRangeText: null,
        ganZhiSpan: null,
        yearInfoDiv: null,
        toggleGridBtn: null
    };

    let currentYear = new Date().getFullYear();
    // 天干五合映射
    const GAN_HE_MAP = {
        '甲': '己', '己': '甲',
        '乙': '庚', '庚': '乙',
        '丙': '辛', '辛': '丙',
        '丁': '壬', '壬': '丁',
        '戊': '癸', '癸': '戊'
    };

    // 司令分野查询已封装到 dayunliunianliuyue.js（BaZiCalc.getSiLingFromRysl / BaZiCalc.RYSL_DATA）

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
        // 当前分块（一甲子）的起始年份
        blockStart: 0,

        init() {
            // 事件委托：分块重绘后无需重复绑定
            DOM.yearGrid.addEventListener('click', (e) => {
                const cell = e.target.closest('.year-cell');
                if (!cell) return;
                YearGrid.select(parseInt(cell.dataset.year, 10));
            });

            this.blockStart = this.getBlockStart(currentYear);
            this.renderBlock();
        },

        // 分块起点按甲子对齐（(y-4)%60===0 的年份为甲子年），
        // 首块从最小年份起（不齐则截短），尾块到最大年份止
        getBlockStart(year) {
            if (year <= CONFIG.MIN_YEAR) return CONFIG.MIN_YEAR;
            const s = 4 + 60 * Math.floor((year - 4) / 60);
            return Math.max(s, CONFIG.MIN_YEAR);
        },

        // 当前分块的下一个分块起点；返回 null 表示已是最后一块
        getNextBlockStart() {
            let next;
            if (this.blockStart === CONFIG.MIN_YEAR && (CONFIG.MIN_YEAR - 4) % 60 !== 0) {
                next = 4 + 60 * (Math.floor((CONFIG.MIN_YEAR - 4) / 60) + 1);
            } else {
                next = this.blockStart + 60;
            }
            return next > CONFIG.MAX_YEAR ? null : next;
        },

        getBlockEnd(start) {
            let next = (start === CONFIG.MIN_YEAR && (CONFIG.MIN_YEAR - 4) % 60 !== 0)
                ? 4 + 60 * (Math.floor((CONFIG.MIN_YEAR - 4) / 60) + 1)
                : start + 60;
            return Math.min(next - 1, CONFIG.MAX_YEAR);
        },

        // 只渲染当前分块（60 年）的年份格子
        renderBlock() {
            const end = this.getBlockEnd(this.blockStart);
            let html = '';
            for (let y = this.blockStart; y <= end; y++) {
                const ganZhi = GanZhiUtil.getLunarGanZhi(y);
                html += `<div class="year-cell ${y === currentYear ? 'selected' : ''}" data-year="${y}">
                    <span class="year-num">${y}</span>
                    <span class="year-ganzhi">${ganZhi}</span>
                </div>`;
            }
            DOM.yearGrid.innerHTML = html;

            if (DOM.blockRangeText) {
                DOM.blockRangeText.textContent = `${this.blockStart}-${end}`;
            }
        },

        select(year) {
            if (year < CONFIG.MIN_YEAR || year > CONFIG.MAX_YEAR) return;
            currentYear = year;

            const bs = this.getBlockStart(year);
            if (bs !== this.blockStart) {
                this.blockStart = bs;
                this.renderBlock();
            } else {
                DOM.yearGrid.querySelectorAll('.year-cell').forEach(cell => {
                    cell.classList.toggle('selected', parseInt(cell.dataset.year, 10) === currentYear);
                });
            }

            YearInfo.update();
        },

        // < > 按钮：整块切换（60年），只翻页不改变选中年份
        goToPrevBlock() {
            if (this.blockStart <= CONFIG.MIN_YEAR) return;
            this.blockStart = this.getBlockStart(this.blockStart - 1);
            this.renderBlock();
        },

        goToNextBlock() {
            const next = this.getNextBlockStart();
            if (next === null) return;
            this.blockStart = next;
            this.renderBlock();
        },

        // 键盘左右键：仍按年步进，跨块时自动切块
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
            try {
                const ganZhi = GanZhiUtil.getLunarGanZhi(currentYear);
                const zodiac = GanZhiUtil.getZodiacByGanZhi(ganZhi);
                const flowerName = GanZhiUtil.getGanZhiFlowerName(ganZhi);

                DOM.ganZhiSpan.textContent = `${currentYear}年 ${ganZhi} · ${zodiac}`;

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
            // < > 按钮：切换上一/下一甲子（60年分块）
            DOM.prevYearBtn.addEventListener('click', YearGrid.goToPrevBlock.bind(YearGrid));
            DOM.nextYearBtn.addEventListener('click', YearGrid.goToNextBlock.bind(YearGrid));
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
        DOM.blockRangeText = document.getElementById('blockRangeText');
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
            // 自动调用八字结果页
            showBaZiPage(dateKey, hour, minute, gender);

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
                // 八字结果封装为独立页面 bazi.html，这里只负责调用
                showBaZiPage(dateKey, hour, minute, gender);
            });
        }
    }
    // ====== 八字结果页调用（结果区封装在 bazi.html + bazi.js）======
    // 点击"确定"后不再本页计算渲染，而是内嵌 iframe 调用独立页面 bazi.html
    function showBaZiPage(dateKey, hour, minute, gender) {
        const [year, month, day] = dateKey.split('-').map(Number);

        let existing = document.getElementById('baZiArea');
        if (existing) {
            existing.remove();
        }

        const src = 'bazi.html?y=' + year + '&m=' + month + '&d=' + day +
            '&h=' + hour + '&min=' + minute + '&g=' + gender;

        const frame = document.createElement('iframe');
        frame.id = 'baZiArea';
        frame.className = 'bazi-frame';
        frame.src = src;
        frame.title = '八字排盘结果';
        frame.style.cssText = 'width:100%;border:none;min-height:300px;display:block;margin-top:12px;';

        const timeInputArea = document.getElementById('timeInputArea');
        timeInputArea.insertAdjacentElement('afterend', frame);
    }

    // 接收 bazi.html 子页面的高度上报，让 iframe 自适应内容高度
    // 守卫：高度没有实质变化时不更新，避免 iframe 增高 → 子页 resize → 再上报的循环
    window.addEventListener('message', (e) => {
        const d = e.data;
        if (d && d.type === 'baziHeight' && d.height) {
            const frame = document.getElementById('baZiArea');
            if (frame) {
                const h = Math.ceil(d.height) + 4;
                if (Math.abs(frame.getBoundingClientRect().height - h) > 2) {
                    frame.style.height = h + 'px';
                }
            }
        }
    });

    return {
        init, config: CONFIG, ganZhiUtil: GanZhiUtil, yearGrid: YearGrid, yearInfo: YearInfo,
        // 仅用于调试，外部可访问（八字计算/渲染已迁移至 bazi.html + bazi.js）
        __dbg: {
            getLunarYearGanZhiFromSolar: getLunarYearGanZhiFromSolar,
            getSiLingFromRysl: (window.BaZiCalc && window.BaZiCalc.getSiLingFromRysl) || null,
            RYSL_DATA: (window.BaZiCalc && window.BaZiCalc.RYSL_DATA) || null,
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
        deleteRecord: global.RecordList.deleteRecord,
        refresh: global.RecordList.loadAndRenderList
    };

    // 初始化导航绑定
    global.Navigation.init();
})(window);