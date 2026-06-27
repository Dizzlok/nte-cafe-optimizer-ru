import os

def load_descriptions(desc_file_path):
    """Загружает словарь комментариев, где ключ — это относительный путь."""
    descriptions = {}
    if os.path.exists(desc_file_path):
        with open(desc_file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and "=" in line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    clean_key = key.strip().replace("\\", "/").rstrip("/")
                    descriptions[clean_key] = value.strip()
    return descriptions

def generate_tree(dir_path, root_dir, exclude_names, descriptions, prefix=""):
    lines = []
    
    try:
        items = [f for f in os.listdir(dir_path) if f not in exclude_names]
    except PermissionError:
        return lines
        
    for i, item in enumerate(items):
        path = os.path.join(dir_path, item)
        is_last = (i == len(items) - 1)
        
        # Получаем относительный путь от корня проекта
        rel_path = os.path.relpath(path, root_dir).replace("\\", "/")
        
        # Строим ветку дерева
        tree_branch = f"{prefix}{'└── ' if is_last else '├── '}{item}"
        
        # Ищем комментарий
        comment = descriptions.get(rel_path) or descriptions.get(item, "")
        
        if comment:
            full_line = f"{tree_branch}\t\t({comment})"
        else:
            full_line = tree_branch
            
        lines.append(full_line)
        
        # Рекурсивный обход
        if os.path.isdir(path):
            lines.extend(generate_tree(path, root_dir, exclude_names, descriptions, prefix + ("    " if is_last else "│   ")))
            
    return lines

# 1. Настройка путей
script_dir = os.path.dirname(os.path.abspath(__file__))
script_folder_name = os.path.basename(script_dir)
root_dir = os.path.abspath(os.path.join(script_dir, ".."))
root_name = os.path.basename(root_dir)

desc_path = os.path.join(script_dir, "descriptions.txt")
file_descriptions = load_descriptions(desc_path)

# 2. Список исключений для корня сайта + игнорирование медиа-папок
exclude = [
    script_folder_name,
    "make_tree.py",
    "make_tree_no_images.py",    # Сам скрипт
    "tree.txt",
    "run_tree.bat",
    "update.bat",
    ".git",
    ".github",
    ".repomix",
    ".gitignore",
    "README.md",
    "repomix.config.json",
    "repomix-output.xml",
    "favicon",                   # Игнорируем папку фавиконок
    "images"                     # Игнорируем всю папку с картинками
]

# 3. Инструкция для ИИ
ai_instructions = """================================================================================
ИНСТРУКЦИЯ ДЛЯ ИИ ПО МОДУЛЬНОСТИ И СТРУКТУРЕ ПРОЕКТА
================================================================================
1. Соблюдай строгую модульность. Если для новой страницы или раздела создаются уникальные 
   стили, скрипты или HTML-файлы, они должны группироваться в изолированные папки разделов в корне.
   Пример для страницы калькулятора:
   - /calculator/index.html — страница калькулятора.
   - /calculator/css/ — уникальные стили только для этой страницы.
   - /calculator/js/ — уникальные скрипты интерфейса только для этой страницы.

2. Если CSS-стили являются общими для всего сайта, они располагаются в глобальной папке 
   стилей в корне по следующим примерам:
   - /css/base.css — базовые стили проекта.
   - /css/header.css — шапка сайта.
   - /css/sidebar.css — боковая панель.

3. Если CSS-стили отвечают за конкретные компоненты внутри изолированной страницы, 
   они создаются строго внутри папки этой страницы. Пример:
   - /calculator/css/character-cards-new.css
   - /calculator/css/tables.css

4. Общие скрипты, логика расчетов, локализация и глобальные базы данных, которые работают 
   по всему сайту или используются несколькими страницами одновременно, располагаются 
   в корневой папке скриптов по примерам:
   - /js/common/app.js — главный файл инициализации.
   - /js/common/data.js — движок расчетов калькулятора (общий).
   - /js/common/state.js — глобальное состояние сайта.
   - /js/common_database/character-data.js — общая база данных персонажей.

5. Если твои решения или новые фичи требуют создания новой папки, скрипта или файла стилей, 
   ВСЕГДА сначала предлагай мне структуру их размещения, чтобы модульность и чистота 
   проекта сохранялись. Не смешивай код разных страниц в одном файле.

================================================================================
ТЕКУЩЕЕ АКТУАЛЬНОЕ ДЕРЕВО ПРОЕКТА (Картинки скрыты для экономии контекста)
================================================================================
"""

# 4. Генерация дерева проекта
tree_content = [f"{root_name}/"] + generate_tree(root_dir, root_dir, exclude, file_descriptions)

# 5. Сборка финального файла: Инструкция + Дерево
final_output = ai_instructions + "\n".join(tree_content) + "\n"

# 6. Сохранение результата в корень проекта
output_path = os.path.join(root_dir, "tree.txt")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(final_output)

print(f"Файл tree.txt успешно сгенерирован (БЕЗ картинок) в корень проекта.")