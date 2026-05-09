import os
import re

def find_missing_filter_imports():
    root_dir = 'src'
    pattern_use = re.compile(r'<Filter\b')
    pattern_import = re.compile(r'import\s+{[^}]*\bFilter\b[^}]*}\s+from\s+[\'"]lucide-react[\'"]')
    
    missing_files = []
    
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    try:
                        content = f.read()
                        if pattern_use.search(content):
                            if not pattern_import.search(content):
                                missing_files.append(path)
                    except Exception as e:
                        print(f"Error reading {path}: {e}")
    
    return missing_files

if __name__ == "__main__":
    missing = find_missing_filter_imports()
    if missing:
        print("Files with missing Filter import:")
        for f in missing:
            print(f)
    else:
        print("No files with missing Filter import found.")
