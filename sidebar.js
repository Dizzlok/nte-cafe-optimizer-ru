// sidebar.js - Логика сворачиваемой боковой панели
(function() {
    'use strict';

    const STORAGE_KEY = 'sidebarCollapsed';

    function initSidebar() {
        const toggleBtn = document.getElementById('toggleBtn');
        const sideNav = document.getElementById('sideNav');
        const mainWrapper = document.getElementById('mainWrapper');

        if (!toggleBtn || !sideNav) {
            console.warn('sidebar.js: Элементы боковой панели не найдены');
            return;
        }

        // Восстанавливаем сохраненное состояние
        const isCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
        if (isCollapsed) {
            sideNav.classList.add('collapsed');
            toggleBtn.classList.add('collapsed');
            if (mainWrapper) mainWrapper.classList.add('expanded');
        }

        // Обработчик клика
        toggleBtn.addEventListener('click', () => {
            sideNav.classList.toggle('collapsed');
            toggleBtn.classList.toggle('collapsed');
            if (mainWrapper) mainWrapper.classList.toggle('expanded');

            // Сохраняем состояние
            const nowCollapsed = sideNav.classList.contains('collapsed');
            localStorage.setItem(STORAGE_KEY, nowCollapsed);
        });
    }

    // Запуск после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }
})();