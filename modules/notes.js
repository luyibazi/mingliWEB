// NotesSystem - 事件记录时间线展示
(function(global) {
    function normalizeGender(g) {
        if (g === 'male' || g === 'female') return g;
        if (g === '男' || g === '乾') return 'male';
        if (g === '女' || g === '坤') return 'female';
        return '';
    }
    function buildAllDayunsAndLiunians(r) {
        try {
            var fb = r.fullBazi || null;
            var p = null;
            if (fb && fb.inputParams && fb.inputParams.year != null && fb.inputParams.month != null && fb.inputParams.day != null) {
                p = {
                    year: Number(fb.inputParams.year),
                    month: Number(fb.inputParams.month),
                    day: Number(fb.inputParams.day),
                    hour: Number(fb.inputParams.hour) || 12,
                    minute: Number(fb.inputParams.minute != null ? fb.inputParams.minute : 0),
                    gender: normalizeGender(fb.inputParams.gender)
                };
            } else if (r.year != null && r.month != null && r.day != null) {
                p = {
                    year: Number(r.year),
                    month: Number(r.month),
                    day: Number(r.day),
                    hour: Number(r.hour) || 12,
                    minute: Number(r.minute) || 0,
                    gender: normalizeGender(r.gender || (fb && fb.qianKun))
                };
            }
            if (!p) return null;
            if (!p.gender) p.gender = 'male';
            var _dtGender = (p.gender === 'male') ? 1 : 0;
            var _yearGanIdx = (p.year - 4) % 10;
            var _yearGanIsYang = (_yearGanIdx % 2 === 0);
            var _dtShunNi = ((_dtGender === 1 && _yearGanIsYang) || (_dtGender === 0 && !_yearGanIsYang)) ? 1 : 0;
            var _dt0 = (function (s, pp) {
                var m1 = /^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/.exec(s || '');
                if (m1) return { year: +m1[1], month: +m1[2], day: +m1[3], hour: +m1[4], minute: +m1[5] };
                var m2 = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(s || '');
                if (m2) return {
                    year: +m2[1], month: +m2[2], day: +m2[3],
                    hour: (m2[4] != null) ? +m2[4] : ((pp && pp.hour) || 0),
                    minute: (m2[5] != null) ? +m2[5] : ((pp && pp.minute) || 0)
                };
                return {
                    year: pp ? pp.year : 0, month: pp ? pp.month : 1, day: pp ? pp.day : 1,
                    hour: pp ? (pp.hour || 0) : 0, minute: pp ? (pp.minute || 0) : 0
                };
            })(r.solar, p);
            var allPhase = null;
            var prePhase = null;
            if (fb && fb.allDayuns && fb.allDayuns.length > 0) {
                allPhase = fb.allDayuns.map(function (x, i) {
                    return Object.assign({}, x, { phaseKey: String(i + 1) });
                });
            } else {
                var dayunData = global.BaZiCalc.findYearsByGanZhi(
                    _dt0,
                    (r.fullBazi && r.fullBazi.jiaoYun ? r.fullBazi.jiaoYun.yearGan : undefined),
                    (r.bazi ? r.bazi.month : undefined),
                    _dtShunNi,
                    _dtGender
                );
                if (dayunData && dayunData.length > 0) {
                    allPhase = dayunData.map(function (x, i) {
                        return Object.assign({}, x, { phaseKey: String(i + 1) });
                    });
                }
            }
            if (allPhase) {
                for (var i = 0; i < allPhase.length; i++) {
                    if (!allPhase[i].title && allPhase[i].dayunganzhi) allPhase[i].title = allPhase[i].dayunganzhi + '大运·流年';
                }
                var _firstAge = allPhase[0] ? (allPhase[0].startAge || 0) : 0;
                prePhase = {
                    phaseKey: 'pre',
                    phaseName: '童限/小运',
                    labelYear: p.year,
                    labelAge: (_firstAge > 1) ? ('1-' + (_firstAge - 1)) : '',
                    liunians: []
                };
            }
            return { allPhase: allPhase, prePhase: prePhase, seed: p, dt0: _dt0, dtGender: _dtGender };
        } catch (e) {
            return null;
        }
    }
    function lookupDayunMeta(ctx, dayunKey, fallbackMeta) {
        var ret = { year: fallbackMeta.year, ganzhi: fallbackMeta.ganzhi, age: fallbackMeta.age };
        if (!ctx) return ret;
        if (dayunKey === 'pre') {
            if (ctx.prePhase) {
                if (!ret.year) ret.year = ctx.prePhase.labelYear || '';
                if (!ret.ganzhi) ret.ganzhi = '小运';
                if ((ret.age === '' || ret.age == null) && ctx.prePhase.labelAge) ret.age = ctx.prePhase.labelAge;
            }
        } else if (ctx.allPhase) {
            for (var i = 0; i < ctx.allPhase.length; i++) {
                if (String(ctx.allPhase[i].phaseKey) === String(dayunKey)) {
                    var ph = ctx.allPhase[i];
                    if (!ret.year) ret.year = ph.starYear || '';
                    if (!ret.ganzhi) ret.ganzhi = ph.dayunganzhi || '';
                    if ((ret.age === '' || ret.age == null) && ph.startAge != null) ret.age = ph.startAge;
                    break;
                }
            }
        }
        return ret;
    }
    function lookupLiunianMeta(ctx, dayunKey, lnIdx, fallbackMeta) {
        var ret = { year: fallbackMeta.year, ganzhi: fallbackMeta.ganzhi, age: fallbackMeta.age };
        if (!ctx) return ret;
        var liunians = null;
        try {
            if (dayunKey === 'pre') {
                liunians = global.BaZiCalc.getYearRange(ctx.dt0, ctx.dtGender);
            } else {
                var dayunIdxForCalc = Number(dayunKey) - 1;
                if (dayunIdxForCalc >= 0 && dayunIdxForCalc <= 11) {
                    liunians = global.BaZiCalc.generateLunarMonths(ctx.dt0, ctx.dtGender, dayunIdxForCalc);
                }
            }
        } catch (e) { liunians = null; }
        if (!Array.isArray(liunians)) return ret;
        var ln = liunians[Number(lnIdx)];
        if (ln) {
            if (!ret.year) ret.year = ln.year || '';
            if (!ret.ganzhi) ret.ganzhi = ln.yearGanZhi || '';
            if ((ret.age === '' || ret.age == null) && ln.nianling != null) ret.age = ln.nianling;
        }
        // 顺便挂在 ctx 上供流月使用
        if (!ctx._liunianCache) ctx._liunianCache = {};
        ctx._liunianCache[dayunKey + ':' + lnIdx] = { ln: ln, liunians: liunians };
        return ret;
    }
    function lookupLiuyueMd(ctx, dayunKey, lnIdx, lyIdx, fallbackMd) {
        if (fallbackMd) return fallbackMd;
        if (!ctx || !ctx._liunianCache) return '';
        var entry = ctx._liunianCache[dayunKey + ':' + lnIdx];
        if (!entry || !entry.ln || !entry.ln.months) return '';
        var ly = entry.ln.months[Number(lyIdx)];
        if (ly && ly.solarDate && ly.solarDate.month != null && ly.solarDate.day != null) {
            return ly.solarDate.month + '/' + ly.solarDate.day;
        }
        return '';
    }

    function showNotesRecord(id) {
        var cached = global.RecordCache.getRecords();
        var r = cached.find(function (x) { return x.id === id; });
        if (!r) { global.UI.showToast('未找到该记录'); return; }

        var existing = document.getElementById('notesListDialog');
        if (existing) existing.remove();

        var notes = (r.notes && typeof r.notes === 'object') ? r.notes : {};
        var ctx = buildAllDayunsAndLiunians(r);

        function esc(s) {
            return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        }
        function nt(val) {
            if (!val) return '';
            if (typeof val === 'string') return val;
            if (typeof val === 'object') return val.text || '';
            return '';
        }
        function nm(val) {
            if (!val || typeof val !== 'object') return { year: '', ganzhi: '', age: '', md: '' };
            return {
                year: val.year || '',
                ganzhi: val.ganzhi || '',
                age: val.age != null ? val.age : '',
                md: val.md || ''
            };
        }

        var keys = Object.keys(notes).filter(function (k) { return nt(notes[k]); });

        var groups = {};
        keys.forEach(function (k) {
            var parts = k.split(':');
            if (parts[0] === 'dayun') {
                var dk = parts[1];
                if (!groups[dk]) groups[dk] = { dayunNote: null, liunians: {} };
                groups[dk].dayunNote = notes[k];
            } else if (parts[0] === 'liunian') {
                var dk2 = parts[1], lnIdx = parts[2];
                if (!groups[dk2]) groups[dk2] = { dayunNote: null, liunians: {} };
                if (!groups[dk2].liunians[lnIdx]) groups[dk2].liunians[lnIdx] = { note: null, liuyues: {} };
                groups[dk2].liunians[lnIdx].note = notes[k];
            } else if (parts[0] === 'liuyue') {
                var dk3 = parts[1], lnIdx2 = parts[2], lyIdx = parts[3];
                if (!groups[dk3]) groups[dk3] = { dayunNote: null, liunians: {} };
                if (!groups[dk3].liunians[lnIdx2]) groups[dk3].liunians[lnIdx2] = { note: null, liuyues: {} };
                groups[dk3].liunians[lnIdx2].liuyues[lyIdx] = notes[k];
            }
        });

        var sortedKeys = Object.keys(groups).sort(function (a, b) {
            if (a === 'pre') return -1;
            if (b === 'pre') return 1;
            return Number(a) - Number(b);
        });

        var notesHtml = '';
        if (sortedKeys.length === 0) {
            notesHtml = '<div style="text-align:center;color:#999;padding:40px 0;">暂无事件记录</div>';
        } else {
            notesHtml += '<div style="position:relative;padding-left:18px;">';
            notesHtml += '<div style="position:absolute;left:4px;top:0;bottom:0;width:2px;background:#000;"></div>';

            sortedKeys.forEach(function (dk) {
                var g = groups[dk];

                notesHtml += '<div style="position:relative;padding-bottom:14px;">';
                notesHtml += '<div style="position:absolute;left:-19px;top:2px;width:12px;height:12px;background:#000;"></div>';

                var dm = lookupDayunMeta(ctx, dk, nm(g.dayunNote));
                var dParts = ['【大运】'];
                if (dm.year) dParts.push(dm.year);
                if (dm.ganzhi) dParts.push(dm.ganzhi);
                if (dm.age !== '' && dm.age != null) dParts.push(dm.age + '岁');
                if (nt(g.dayunNote) || Object.keys(g.liunians).length > 0) {
                    notesHtml += '<div style="font-size:12px;font-weight:bold;margin-bottom:3px;color:#000;line-height:1.5;">' + esc(dParts.join(' ')) + '</div>';
                    if (nt(g.dayunNote)) {
                        notesHtml += '<div style="font-size:13px;line-height:1.7;color:#333;white-space:pre-wrap;word-break:break-word;padding-left:0;">' + esc(nt(g.dayunNote)) + '</div>';
                    }
                }

                var lnKeys = Object.keys(g.liunians).sort(function (a, b) { return Number(a) - Number(b); });
                lnKeys.forEach(function (lnIdx) {
                    var ln = g.liunians[lnIdx];
                    notesHtml += '<div style="position:relative;margin-left:16px;padding-left:14px;padding-bottom:14px;border-left:1px solid #aaa;">';
                    notesHtml += '<div style="position:absolute;left:-17px;top:3px;width:8px;height:8px;background:#555;"></div>';

                    var lm = lookupLiunianMeta(ctx, dk, lnIdx, nm(ln.note));
                    // 与详情页 detail.js renderNotes L734 格式严格对齐：【流年】年 干支 · X岁
                    var lnMain = '';
                    if (lm.year) lnMain += lm.year;
                    if (lm.ganzhi) lnMain += (lnMain ? ' ' : '') + lm.ganzhi;
                    var lnAgeStr = '';
                    if (lm.age !== '' && lm.age != null) lnAgeStr = ' · ' + lm.age + '岁';
                    var lnTitle = '【流年】' + lnMain + lnAgeStr;
                    notesHtml += '<div style="font-size:12px;font-weight:bold;margin-bottom:3px;color:#000;line-height:1.5;">' + esc(lnTitle) + '</div>';
                    if (nt(ln.note)) {
                        notesHtml += '<div style="font-size:13px;line-height:1.7;color:#333;white-space:pre-wrap;word-break:break-word;padding-left:0;">' + esc(nt(ln.note)) + '</div>';
                    }

                    var lyKeys = Object.keys(ln.liuyues).sort(function (a, b) { return Number(a) - Number(b); });
                    lyKeys.forEach(function (lyIdx) {
                        notesHtml += '<div style="position:relative;margin-left:16px;padding-left:14px;padding-bottom:14px;border-left:1px dashed #ccc;">';
                        notesHtml += '<div style="position:absolute;left:-16px;top:4px;width:6px;height:6px;background:#999;border-radius:50%;"></div>';
                        var lym = nm(ln.liuyues[lyIdx]);
                        // 与详情页 detail.js renderNotes L705-L708 严格对齐：M/D 优先，空则「第N」兜底，yueStr 必显示
                        var lyMd = lookupLiuyueMd(ctx, dk, lnIdx, lyIdx, lym.md);
                        var yueStr = lyMd ? lyMd : ('第' + (Number(lyIdx) + 1));
                        var lyParts = ['【流月】', yueStr];
                        if (lym.ganzhi) lyParts.push(lym.ganzhi);
                        notesHtml += '<div style="font-size:12px;font-weight:bold;margin-bottom:3px;color:#000;line-height:1.5;">' + esc(lyParts.join(' ')) + '</div>';
                        notesHtml += '<div style="font-size:13px;line-height:1.7;color:#333;white-space:pre-wrap;word-break:break-word;padding-left:0;">' + esc(nt(ln.liuyues[lyIdx])) + '</div>';
                        notesHtml += '</div>';
                    });

                    notesHtml += '</div>';
                });

                notesHtml += '</div>';
            });

            notesHtml += '</div>';
        }

        var baziStr = '';
        var b = r.bazi || {};
        if (b.year) baziStr = [b.year, b.month, b.day, b.hour].filter(Boolean).join('  ');

        var overlay = document.createElement('div');
        overlay.id = 'notesListDialog';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML =
            '<div style="background:#fff;width:600px;max-height:80vh;display:flex;flex-direction:column;border:2px solid #000;">' +
            '<div style="padding:16px 20px;border-bottom:2px solid #000;display:flex;justify-content:space-between;align-items:center;">' +
            '<div>' +
            '<span style="font-size:16px;font-weight:bold;">' + esc(r.name || '未命名') + '</span>' +
            '<span style="margin-left:10px;font-size:12px;border:1px solid #000;padding:1px 8px;">' + esc(r.gender || '') + '</span>' +
            '<span style="margin-left:10px;font-size:12px;color:#666;">' + esc(baziStr) + '</span>' +
            '</div>' +
            '<button style="border:1px solid #000;background:#fff;padding:4px 12px;cursor:pointer;font-size:16px;font-family:inherit;" onclick="this.closest(\'#notesListDialog\').remove()">✕</button>' +
            '</div>' +
            '<div style="padding:16px 20px;overflow-y:auto;flex:1;">' + notesHtml + '</div>' +
            '</div>';

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);
    }

    global.NotesSystem = { showNotesRecord };
})(window);
