import re
import os

def sanitize_sql(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix scientific notation like '4,517E+11'
    # Pattern: 'digit,digitsE+digits'
    def replace_sci(match):
        val_str = match.group(1).replace(',', '.')
        exponent = int(match.group(2))
        val = float(val_str) * (10 ** exponent)
        # Convert to int then string to avoid decimal point if it's a whole number
        # Actually account numbers should be strings, so we keep it as a clean string of digits
        new_val = "{:.0f}".format(val)
        return f"'{new_val}'"

    # Search for scientific notation inside single quotes
    content = re.sub(r"'(\d+,\d+)E\+(\d+)'", replace_sci, content)
    
    # Fix 'NULL' or 'Null' inside quotes (specifically for fields that should be NULL)
    # Based on previous batches, it seems 'NULL' strings should be replaced by the SQL NULL keyword
    content = re.sub(r"'NULL'", "NULL", content, flags=re.IGNORECASE)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

base_path = r"c:\Users\YEISON\Proyectos AI\krh-recursoshumanos"
for i in range(12, 19):
    file_name = f"import_batch_v2_{i}.sql"
    file_path = os.path.join(base_path, file_name)
    if os.path.exists(file_path):
        print(f"Sanitizing {file_name}...")
        sanitize_sql(file_path)
    else:
        print(f"File {file_name} not found.")
