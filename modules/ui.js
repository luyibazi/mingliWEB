// UI - 通用界面工具
(function(global) {
    function showToast(msg) {
        var t = document.getElementById('toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'toast';
            t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#000;color:#fff;padding:10px 20px;font-size:14px;z-index:10000;border:1px solid #000;';
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
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:9999;display:flex;justify-content:center;align-items:center;';

        var box = document.createElement('div');
        box.style.cssText = 'background:#fff;border:1px solid #000;padding:25px;width:360px;text-align:center;';
        box.innerHTML =
            '<h3 style="margin-bottom:10px;font-size:16px;font-weight:normal;color:#c00;">确认删除</h3>' +
            '<p style="margin-bottom:8px;font-size:13px;color:#666;">请输入下方数字以确认删除操作</p>' +
            '<div style="font-size:28px;font-weight:bold;letter-spacing:6px;margin-bottom:15px;color:#000;user-select:none;">' + randNum + '</div>' +
            '<input type="text" id="deleteNumInput" style="width:100%;padding:8px;border:1px solid #000;font-size:14px;margin-bottom:8px;box-sizing:border-box;text-align:center;letter-spacing:4px;" placeholder="输入上方数字" autofocus />' +
            '<p id="deleteHint" style="color:#c00;font-size:12px;height:18px;margin-bottom:10px;"></p>' +
            '<div style="display:flex;gap:10px;justify-content:center;">' +
            '<button id="deleteCancelBtn" style="border:1px solid #000;background:#fff;color:#000;padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;">取消</button>' +
            '<button id="deleteConfirmBtn" style="border:1px solid #c00;background:#c00;color:#fff;padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;">删除</button>' +
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