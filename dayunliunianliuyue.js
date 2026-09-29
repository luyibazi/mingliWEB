// dayunliunianliuyue.js
(function () {
    'use strict';

    // 天干五合映射
    const GAN_HE_MAP = {
        '甲': '己', '己': '甲',
        '乙': '庚', '庚': '乙',
        '丙': '辛', '辛': '丙',
        '丁': '壬', '壬': '丁',
        '戊': '癸', '癸': '戊'
    };
    const MONTH_JIE_QI = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];

    //阳历日期转使用的map
    function dateZhuanhuan(birthDate) {
        // 1. 尝试匹配中文格式：2026年4月15日 08:00
        const zhRegex = /^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/;
        let match = birthDate.match(zhRegex);

        // 2. 如果不匹配，尝试匹配数字连字符格式：1998-11-27 08:00
        if (!match) {
            const enRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})$/;
            match = birthDate.match(enRegex);
        }

        // 3. 如果都不匹配，抛出错误
        if (!match) {
            throw new Error('日期格式无效，请使用 "2026年4月15日 08:00" 或 "1998-11-27 08:00" 格式');
        }

        // 4. 提取并转换为数字
        const [, year, month, day, hour, minute] = match.map(Number);

        // 5. 返回统一的对象
        return { year, month, day, hour, minute };
    }

    // 查询出生年份
    function getBirthYear(baziTime) {
        var solarTimeS = SolarTime.fromYmdHms(baziTime.year, baziTime.month, baziTime.day, baziTime.hour, baziTime.minute, 0);
        const lunarHour = solarTimeS.getLunarHour();
        // const eightChar = lunarHour.getEightChar();
        // 1. 一路向上追溯到农历年对象 (LunarYear)
        const lunarYear = lunarHour.getLunarDay().getLunarMonth().getLunarYear();
        // 2. 获取农历年份的数字（例如：2026）
        return lunarYear.getYear();
    }
    //查询童限开始时间-出生时间
    function getKaiShiTime(baziTime, genderCode) {
        var solarTime = SolarTime.fromYmdHms(baziTime.year, baziTime.month, baziTime.day, baziTime.hour, baziTime.minute, 0);
        const childLimit = ChildLimit.fromSolarTime(solarTime, genderCode);
        return childLimit.info.startTime;
    }

    //查询起运时间--童限结束时间
    function getQiYunTime(baziTime, genderCode) {
        var solarTime = SolarTime.fromYmdHms(baziTime.year, baziTime.month, baziTime.day, baziTime.hour, baziTime.minute, 0);
        const childLimit = ChildLimit.fromSolarTime(solarTime, genderCode);
        return childLimit.info.endTime;
    }

    // 获取交运时间
    function getLastJieQiDiff(time) {
        const solarTime = SolarTime.fromYmdHms(
            time.year, time.month, time.day,
            time.hour, time.minute, time.second
        );
        const targetTs = solarTime.getJulianDay();

        const lunarHour = solarTime.getLunarHour();
        const eightChar = lunarHour.getEightChar();
        const yearGan = eightChar.getYear().getName().charAt(0);
        const heGan = GAN_HE_MAP[yearGan] || '';

        let lastTerm = null;
        let lastTs = null;
        for (let y = time.year - 1; y <= time.year + 1; y++) {
            for (let i = 0; i < 24; i++) {
                try {
                    const term = SolarTerm.fromIndex(y, i);
                    if (!term.isJie()) continue;
                    const termTs = term.getJulianDay();
                    if (termTs <= targetTs && (!lastTs || termTs > lastTs)) {
                        lastTs = termTs;
                        lastTerm = term;
                    }
                } catch (e) { }
            }
        }
        if (!lastTerm) return null;

        const totalHours = Math.floor((targetTs - lastTs) * 24);
        return {
            jieQi: lastTerm.getName(),
            days: Math.floor(totalHours / 24),
            hours: totalHours % 24,
            totalHours: totalHours,
            yearGan: yearGan,
            heGan: heGan,
            jiaoYunGan: yearGan + heGan
        };
    }

    // 获取第一步开始的大运
    function getfirstTime(tongxianjiesushijian) {
        let mohuNianFeng = [tongxianjiesushijian.getYear() - 1, tongxianjiesushijian.getYear(), tongxianjiesushijian.getYear() + 1].map((year => {

            return {
                year: year,
                ganzhi: LunarYear.fromYear(year).getSixtyCycle().getName()
            }
        }));

        const solarTime = SolarTime.fromYmdHms(
            tongxianjiesushijian.getYear(),
            tongxianjiesushijian.getMonth(),
            tongxianjiesushijian.getDay(),
            tongxianjiesushijian.getHour(),
            tongxianjiesushijian.getMinute(),
            0
        );
        const ec = solarTime.getLunarHour().getEightChar();

        let jiaoyunganzhi = ec.getYear().getName();
        // 第一步大运的年份
        return mohuNianFeng.find((year) => year.ganzhi == jiaoyunganzhi)
    }


    /**
* 根据数据查出大运的方法
* @param {Map} baziTime 出生时间: {
* year: number, month: number, day: number, hour: number, minute: number}
* @param {string} targetTianGan 每步十年大运，交脱运的天干
* @param {string} yueGZ 四柱中月柱的干支
* @param {number} dir 方向，1 为正推，0 为逆推
* @param {number} gender 性别，1 为男，0 为女
* @returns {Array<{year: number, ganzhi: string, age: number}>} 按年份升序排列的结果数组
*/
    function findYearsByGanZhi(baziTime, targetTianGan, yueGZ, dir, gender) {


        // 2. 获取农历年份的数字（例如：2026）
        const startY = getBirthYear(baziTime);

        let tongxianjiesushijian = getQiYunTime(baziTime, gender);

        // 第一步大运的年份
        let dayunStartYear = getfirstTime(tongxianjiesushijian);
        // console.log(getLunarYearGanZhiFro    mSolar(1987,2,2,12,0));


        const getOffsetGanZhi = (startGanZhi, steps, tianGan, diZhi, dir = 1) => {
            // 1. 找到起始干支在 60 甲子中的序号（0~59）
            const tgIdx = tianGan.indexOf(startGanZhi[0]);
            const dzIdx = diZhi.indexOf(startGanZhi[1]);
            if (tgIdx === -1 || dzIdx === -1) throw new Error('无效的干支');

            let startIndex = -1;
            for (let i = 0; i < 60; i++) {
                if (i % 10 === tgIdx && i % 12 === dzIdx) {
                    startIndex = i;
                    break;
                }
            }

            // 2. 根据 dir 决定方向，计算目标序号
            let targetIndex;
            if (dir === 1) {
                // 正推：0→下一个，1→下下个……
                targetIndex = (startIndex + steps + 1) % 60;
            } else {
                // 倒推：0→上一个，1→上上个……
                targetIndex = (startIndex - (steps + 1) + 60) % 60;
            }

            // 3. 反查天干地支
            const gan = tianGan[targetIndex % 10];
            const zhi = diZhi[targetIndex % 12];
            return gan + zhi;
        };


        const tianGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
        const diZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

        // 1. 确定目标天干的索引
        const targetIdx = tianGan.indexOf(targetTianGan);
        if (targetIdx === -1) {
            throw new Error('无效的天干，请输入：甲、乙、丙、丁、戊、己、庚、辛、壬、癸');
        }

        // 2. 从 startY（出生农历年对应的公历年）开始查找，收集 12 个结果


        let dayunArr = Array.from({ length: 12 }, (_, i) => dayunStartYear.year + i * 10).map((year, index) => {
            return {
                starYear: year,
                dayunganzhi: getOffsetGanZhi(yueGZ, index, tianGan, diZhi, dir),
                startAge: year - startY + 1
            }
        });


        return dayunArr;
    }

    /**生成干支 */
    function getGanZhiByYear(year) {
        const solarDay = SolarDay.fromYmd(year, 6, 1);
        const lunarYear = solarDay.getLunarDay().getLunarMonth().getLunarYear();
        return lunarYear.getSixtyCycle().getName();
    }

    /**查出童限的所有流年和流月
     * @param {number} baziTime 出生时间: {
        * year: number, month: number, day: number, hour: number, minute: number}
        * @param {string} gender 性别，1 为男，0 为女
        * @returns {Array<{year: number, ganzhi: string, age: number}>
     }
     * 
     */

    function getYearRange(baziTime, gender) {
        let startYear = getBirthYear(baziTime);

        let tongxianjiesushijian = getQiYunTime(baziTime, gender);

        let jiaoyun = getLastJieQiDiff(tongxianjiesushijian);

        let qishi = getLastJieQiDiff(getKaiShiTime(baziTime, gender));



        let endYear = getfirstTime(tongxianjiesushijian).year;



        const years = [];

        // 确保 start 总是较小的年份，end 总是较大的年份（防止参数传反）
        const min = Math.min(startYear, endYear);
        const max = Math.max(startYear, endYear);

        // 循环将年份增加到数组中
        for (let i = min; i <= max; i++) {

            years.push({
                nianling: i - startYear + 1,
                year: i,
                yearGanZhi: getGanZhiByYear(i),
                months: MONTH_JIE_QI.filter((jieQiName, index) => {
                    const refIndexStart = MONTH_JIE_QI.indexOf(qishi.jieQi);
                    const refIndexEnd = MONTH_JIE_QI.indexOf(jiaoyun.jieQi);
                    const targetIndex = MONTH_JIE_QI.indexOf(jieQiName);
                    if (i == min) {
                        if (refIndexStart === targetIndex) {
                            return true; // 相同节气
                        }

                        if (targetIndex < refIndexStart) {
                            return false;
                        }
                    }
                    if (i == max) {
                        if (refIndexEnd === targetIndex) {
                            return true; // 相同节气
                        }
                        if (targetIndex > refIndexEnd) {
                            return false;
                        }
                    }
                    return true;
                })
                    .map((jieQiName, index) => {
                        // 1. 初始化一个农历月份（例如：2026年农历正月初一所在的月）
                        const lunarMonth = LunarMonth.fromYm(i, MONTH_JIE_QI.indexOf(jieQiName) + 1);

                        // 2. 获取该农历月在八字命理中对应的干支（月柱）
                        const monthGanZhi = lunarMonth.getSixtyCycle().getName();
                        var solarTime = null;
                        if (jieQiName == "大寒" || jieQiName == "小寒") {
                            const term = SolarTerm.fromName(i + 1, jieQiName);
                            solarTime = term.getJulianDay().getSolarTime();
                        } else {
                            const term = SolarTerm.fromName(i, jieQiName);
                            solarTime = term.getJulianDay().getSolarTime();
                        }
                        return {
                            JieQi: jieQiName,
                            ganZhi: monthGanZhi,
                            solarDate: solarTime,

                        }
                    })
            });
        }
        return years;
    }

    /**
   * 获取起始年起10年的年份及对应天干地支
   * @param {number} startYear - 第一步大运的开始时间
   * @returns {Array} - [{year, ganZhi}, ...]
   */
    function getTenYearsRange(startYear) {
        const years = [];
        for (let i = 0; i <= 10; i++) {
            const year = startYear + i;
            // 用6月1日确定农历年（避免春节前后偏差）
            const lunarYear = SolarDay.fromYmd(year, 6, 1).getLunarDay().getLunarMonth().getLunarYear();
            years.push({
                year: year,
                ganZhi: lunarYear.getSixtyCycle().getName()
            });
        }
        return years;
    }

    /**
 * 根据年份数组，生成每年的农历月份、月干支及节令阳历时间
 * @param {Array} yearsData - [{year, ganZhi}, ...]
 * @returns {Array} - [{year, yearGanZhi, months: [{name, ganZhi, jieQi, solarDate}]}, ...]
 */
    function generateLunarMonths(baziTime, gender, dayunIndex) {
        let birthYear = getBirthYear(baziTime);
        let tongxianjiesushijian = getQiYunTime(baziTime, gender);
        let jiaoyun = getLastJieQiDiff(tongxianjiesushijian);
        let startYear = getfirstTime(tongxianjiesushijian).year;
        startYear = startYear + dayunIndex * 10;

        let yearsData = getTenYearsRange(startYear)
        return yearsData.map((item, index, arr) => {
            const lunarYear = LunarYear.fromYear(item.year);
            const months = lunarYear.getMonths();
            // 判断是否是首尾元素
            const isFirst = index === 0;
            const isLast = index === arr.length - 1;

            // 获取该年所有节令的阳历时间
            const jieQiMap = {};
            MONTH_JIE_QI.forEach((name, i) => {
                const idx = i === 11 ? 1 : 3 + i * 2;
                const term = SolarTerm.fromIndex(item.year, idx);
                const st = term.getJulianDay().getSolarTime();
                jieQiMap[name] = {
                    jieQi: name,
                    solarDate: `${st.getYear()}-${String(st.getMonth()).padStart(2, '0')}-${String(st.getDay()).padStart(2, '0')} ${String(st.getHour()).padStart(2, '0')}:${String(st.getMinute()).padStart(2, '0')}`
                };
            });
            let monthsArr = MONTH_JIE_QI.filter((m, index, arr) => {



                const refIndex = MONTH_JIE_QI.indexOf(jiaoyun.jieQi);
                const targetIndex = MONTH_JIE_QI.indexOf(m);

                if (isFirst) {
                    if (refIndex === targetIndex) {
                        return true; // 相同节气
                    }

                    if (targetIndex < refIndex) {
                        return false;
                    }
                }
                if (isLast) {
                    if (refIndex === targetIndex) {
                        return true; // 相同节气
                    }
                    if (targetIndex > refIndex) {
                        return false;
                    }
                }
                return true;
            }
            ).map((jieQiName, index) => {
                // 1. 初始化一个农历月份（例如：2026年农历正月初一所在的月）
                const lunarMonth = LunarMonth.fromYm(item.year, MONTH_JIE_QI.indexOf(jieQiName) + 1);

                // 2. 获取该农历月在八字命理中对应的干支（月柱）
                const monthGanZhi = lunarMonth.getSixtyCycle().getName();
                var solarTime = null;
                if (jieQiName == "大寒" || jieQiName == "小寒") {
                    const term = SolarTerm.fromName(item.year + 1, jieQiName);
                    solarTime = term.getJulianDay().getSolarTime();
                } else {
                    const term = SolarTerm.fromName(item.year, jieQiName);
                    solarTime = term.getJulianDay().getSolarTime();
                }
                return {

                    JieQi: jieQiName,
                    ganZhi: monthGanZhi,
                    solarDate: solarTime
                }
            })

            return {
                nianling: item.year - birthYear + 1,
                year: item.year,
                yearGanZhi: item.ganZhi,
                months: monthsArr
            };
        });
    }

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

    // 将 tyme4ts 时间对象（SolarTime 等）转为纯字段对象，便于 getLastJieQiDiff 使用
    function toPlainTime(t) {
        return {
            year: t.getYear(),
            month: t.getMonth(),
            day: t.getDay(),
            hour: t.getHour(),
            minute: t.getMinute(),
            second: t.getSecond()
        };
    }

    /**
     * 查询胎元
     * @param {Object} baziTime 出生时间 { year, month, day, hour, minute }
     * @returns {string} 胎元干支（如 "壬午"）
     */
    function getTaiYuan(baziTime) {
        const solarTime = SolarTime.fromYmdHms(
            baziTime.year, baziTime.month, baziTime.day,
            baziTime.hour || 0, baziTime.minute || 0, 0
        );
        const eightChar = solarTime.getLunarHour().getEightChar();
        return eightChar.getFetalOrigin().getName();
    }

    /**
     * 查询交运时间（由童限结束时刻距上一节气的时差推导）
     * @param {Object} baziTime 出生时间 { year, month, day, hour, minute }
     * @param {number} genderCode 性别，1 为男，0 为女
     * @returns {{
     *   jiaoYun: {jieQi, days, hours, totalHours, yearGan, heGan, jiaoYunGan}|null,  // 交运（童限结束时刻）距节气信息
     *   qishi: {jieQi, days, hours, totalHours, yearGan, heGan, jiaoYunGan}|null,    // 起始（童限开始/出生时刻）距节气信息
     *   childLimit: ChildLimit,  // 童限对象（供大运/小运继续计算）
     *   startTime: SolarTime,    // 童限开始时刻
     *   endTime: SolarTime       // 童限结束时刻（起运时刻）
     * }}
     */
    function getJiaoYunInfo(baziTime, genderCode) {
        const solarTime = SolarTime.fromYmdHms(
            baziTime.year, baziTime.month, baziTime.day,
            baziTime.hour || 0, baziTime.minute || 0, 0
        );
        const childLimit = ChildLimit.fromSolarTime(solarTime, genderCode);
        const startTime = childLimit.info.startTime;
        const endTime = childLimit.info.endTime;

        let jiaoYun = null;
        let qishi = null;
        if (endTime) {
            jiaoYun = getLastJieQiDiff(toPlainTime(endTime));
        }
        if (startTime) {
            qishi = getLastJieQiDiff(toPlainTime(startTime));
        }
        return { jiaoYun, qishi, childLimit, startTime, endTime };
    }

    // 关键：挂到 window 全局
    window.BaZiCalc = {
        findYearsByGanZhi: findYearsByGanZhi,
        getYearRange: getYearRange,
        generateLunarMonths: generateLunarMonths,
        getLastJieQiDiff: getLastJieQiDiff,
        dateZhuanhuan: dateZhuanhuan,
        getBirthYear: getBirthYear,
        // 司令分野查询（原 script.js 内的 getSiLingFromRysl，统一封装到本文件）
        getSiLingFromRysl: getSiLingFromRysl,
        RYSL_DATA: RYSL_DATA,
        // 胎元 / 交运时间查询（原 script.js calculateBaZi 内联逻辑，统一封装到本文件）
        getTaiYuan: getTaiYuan,
        getJiaoYunInfo: getJiaoYunInfo
    };
})();