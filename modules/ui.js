// UI - 通用界面工具
(function(global) {
    // 公共弹窗/提示的样式：注入一次（内联 style 写不了 hover/focus 伪类）
    var styleId = 'uiCommonStyle';
    if (!document.getElementById(styleId)) {
        var s = document.createElement('style');
        s.id = styleId;
        s.textContent =
            '#toast { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);' +
            'background:rgba(26,26,26,0.92); color:#fff; padding:10px 22px; font-size:13px;' +
            'z-index:10000; border-radius:10px; box-shadow:0 8px 32px rgba(31,35,41,0.3);' +
            'letter-spacing:1px; backdrop-filter:blur(4px); }\n' +
            '#deleteDialog .del-box h3    { margin-bottom:10px; font-size:16px; font-weight:bold; color:#c62828; letter-spacing:1px; }\n' +
            '#deleteDialog .del-box p      { margin-bottom:8px; font-size:13px; color:#646a73; }\n' +
            '#deleteDialog .del-num        { font-size:28px; font-weight:bold; letter-spacing:6px; margin-bottom:16px; color:#1f2329; user-select:none; background:#fafafb; border:1px dashed #d8d8dc; border-radius:8px; padding:8px 0; }\n' +
            '#deleteDialog .del-box input  { width:100%; padding:9px; border:1px solid #d8d8dc; border-radius:8px; font-size:14px; margin-bottom:8px; box-sizing:border-box; text-align:center; letter-spacing:4px; outline:none; font-family:inherit; transition:border-color .15s, box-shadow .15s; }\n' +
            '#deleteDialog .del-box input:focus { border-color:#1a1a1a; box-shadow:0 0 0 3px rgba(26,26,26,0.08); }\n' +
            '#deleteDialog #deleteCancelBtn { border:1px solid #d8d8dc; background:#fff; color:#1f2329; border-radius:8px; transition:all .15s; }\n' +
            '#deleteDialog #deleteCancelBtn:hover { background:#f2f3f5; border-color:#c2c7ce; }\n' +
            '#deleteDialog #deleteConfirmBtn { border:1px solid #c62828; background:#c62828; color:#fff; border-radius:8px; transition:background .15s; }\n' +
            '#deleteDialog #deleteConfirmBtn:hover { background:#a91f1f; border-color:#a91f1f; }\n';
        document.head.appendChild(s);
    }

    function showToast(msg) {
        var t = document.getElementById('toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.display = 'block';
        clearTimeout(t._timer);
        t._timer = setTimeout(function () { t.style.display = 'none'; }, 2000);
    }

    function showDeleteDialog(randNum, onConfirm) {
        var existing = document.getElementById('deleteDialog');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'deleteDialog';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(31,35,41,0.4);z-index:9999;display:flex;justify-content:center;align-items:center;';

        var box = document.createElement('div');
        box.className = 'del-box';
        box.style.cssText = 'background:#fff;border:1px solid #e8e8ec;border-radius:14px;box-shadow:0 12px 48px rgba(31,35,41,0.2);padding:24px 26px;width:360px;text-align:center;';
        box.innerHTML =
            '<h3>确认删除</h3>' +
            '<p>请输入下方数字以确认删除操作</p>' +
            '<div class="del-num">' + randNum + '</div>' +
            '<input type="text" id="deleteNumInput" placeholder="输入上方数字" autofocus />' +
            '<p id="deleteHint" style="color:#c62828;font-size:12px;height:18px;margin-bottom:10px;"></p>' +
            '<div style="display:flex;gap:10px;justify-content:center;">' +
            '<button id="deleteCancelBtn" style="padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;">取消</button>' +
            '<button id="deleteConfirmBtn" style="padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;">删除</button>' +
            '</div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        var input = document.getElementById('deleteNumInput');
        var hint = document.getElementById('deleteHint');
        input.focus();

        function close() { overlay.remove(); }

        function confirmDel() {
            if (input.value.trim() === randNum) {
                close();
                onConfirm();
            } else {
                hint.textContent = '数字不匹配，请重新输入';
                input.value = '';
                input.focus();
            }
        }

        document.getElementById('deleteCancelBtn').addEventListener('click', close);
        document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDel);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') confirmDel();
            if (e.key === 'Escape') close();
        });
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });
    }

    global.UI = { showToast, showDeleteDialog };
})(window);
