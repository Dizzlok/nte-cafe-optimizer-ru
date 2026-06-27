batch

    @echo off
    chcp 65001 > nul
    
    :: Переходим в папку, где лежит сам батник
    cd /d "%~dp0"
    
    echo Генерация дерева без картинок...
    python make_tree_no_images.py
    
    echo.
    echo Процесс завершен!
    timeout /t 3 > nul
    

Используйте код с осторожностью.