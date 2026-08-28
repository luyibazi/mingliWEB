// Navigation - 视图导航切换
(function(global) {
    function switchView(view) {
        const calBtn = document.getElementById('navCalendar');
        const listBtn = document.getElementById('navList');
        const calView = document.getElementById('calendarView');
        const listEl = document.getElementById('listView');

        if (view === 'list') {
            calView.style.display = 'none';
            listEl.style.display = '';
            calBtn.classList.remove('active');
            listBtn.classList.add('active');
            if (!global.RecordList._isLoaded()) {
                global.RecordList.loadAndRenderList();
            }
        } else {
            calView.style.display = '';
            listEl.style.display = 'none';
            calBtn.classList.add('active');
            listBtn.classList.remove('active');
        }
    }

    function init() {
        document.addEventListener('DOMContentLoaded', function () {
            var calBtn = document.getElementById('navCalendar');
            var listBtn = document.getElementById('navList');
            var refreshBtn = document.getElementById('refreshList');
            if (calBtn) calBtn.addEventListener('click', function () { switchView('calendar'); });
            if (listBtn) listBtn.addEventListener('click', function () { switchView('list'); });
            if (refreshBtn) refreshBtn.addEventListener('click', function () {
                global.RecordList._resetLoaded();
                global.RecordList.loadAndRenderList();
            });
        });
    }

    global.Navigation = { switchView, init };
})(window);