import re
import os

company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304'

# Operation centers from the database output (partial)
db_centers = [
    "0de35144-c08c-4161-9058-4860e2402a7d", "148e2e4c-cc2e-4d60-851e-e13b25c409b3", 
    "a4b679c5-6fd4-4449-9ff6-af9addcd4b43", "e371ac6e-8e1f-473a-a5ce-9782dfa981eb",
    "2ccdf659-6afc-4722-ada8-2d71be343b68", "57e5be5e-f320-47d4-9013-3de14957a674",
    "f0e66122-d89d-4717-be05-abcdf35032b4", "c663c459-1004-4f1f-b3db-fd4cdcb201a8",
    "9f3779fd-6ba2-4772-b7e8-ba0b9799a5f7", "a91ebed5-c3f9-4e00-ae2d-6470214c618a",
    "6dc89fe7-64bb-448a-ba9e-60a2fcb4b136", "d0f92db8-21e0-413b-b438-ef577a30b18b",
    "e3cb9da7-59be-4093-8af2-83ade11fcb79", "5128e819-5c0f-425e-9948-80c3310133b1",
    "8751491a-ab04-4287-9953-db03e09e9733", "551086a9-eafc-42ea-b721-dd20a4fac39d",
    "52d98b41-c040-4018-9ab0-3958a19f02ad", "d3f08ee4-36bc-4dea-88b6-d6c9ae3ca6b8",
    "6e910fe8-1c74-4283-820f-118a7caf24a2", "7aab8f17-febd-46df-bb42-2e3a39fc012d",
    "fe6f8e2d-725e-45e7-9527-427421929058", "eef493ee-ebc3-43ff-9975-cd030c21a47a",
    "868a7d45-7f42-4d8a-85da-98b9122e2ec0", "1d8eb310-fd06-4b0b-ad86-f1ccb6f05559",
    "814a0d60-dd94-4712-bbe8-fa45625d72a4", "c8e74a0f-7a8c-4993-ab05-9f563305b14e",
    "fd28c9df-6d50-46fc-8dd5-5b6eff640470", "ab09784f-cb9b-4ab4-b66b-c5e1447629cb",
    "532c0df2-2880-4556-bab3-154305463d8f", "b45212de-c602-4ea1-9a04-7a230bb6972b",
    "e633e9ba-9892-465e-a342-094392012912", "ce3e5c61-6717-4bd9-99fd-2e645744f2b2",
    "a7e5ef32-a680-496c-b582-f0edeb8735b3", "09b54945-700f-41c6-8c44-caed54c8f874",
    "927d5e0c-4f6a-4a83-a452-f4c95483a3ef", "122aca18-d298-4688-9797-f572b7ff51e1",
    "df103be7-a604-410b-a141-373d8c0ba235", "8dc0459a-ae94-4ad2-8c65-5b500b4fb769",
    "ba3e5550-6a5b-44df-afde-ffb038c75b39", "ddb0e5c8-6e23-4068-bb1d-7c939eb945c9",
    "ceb18149-ab28-4ec5-a771-b1be6748dca5", "fdb5771c-77ef-4ae7-8c05-98eb2938d268",
    "21f4fa84-b848-4ea5-8450-736a0562bf1a", "88fcc5b4-33a5-43c5-b2f7-bf0a6bc4e23c",
    "423108da-c727-4130-871b-ecec115ce237", "ed126c70-b373-44b0-80a3-2a72e1fb0a58",
    "ea07a2e3-a67b-4a6e-ad08-f6bd8133da9a", "8a010063-0fd2-489e-9e95-491a28a5c21f",
    "0d639586-6d87-4d24-a913-214545decd0c", "ec3737a6-0d59-4568-aad0-adb743dd047e",
    "352df2d8-a7df-43ad-a489-ab86c99ac60a", "cdaec433-6ec3-4b0c-9637-ae160c044c44",
    "a13ffb14-5797-4536-9aec-d82793ef03f0", "e98928b1-7260-4340-b2b4-1c0beaa8c593",
    "0c7ea053-77f9-475d-a61b-9c2697dea6ee", "6cdf94b9-5f0d-4f2f-8e51-64c2bfad4dde",
    "7f9ae3de-f225-4f95-a205-53af275948b9", "7ee13ee1-adbc-4ab6-9cc9-e96bf4311313",
    "e2b683e4-3488-4fd1-b6e7-f34d5ee1302c", "5c3639eb-35c8-4720-9da2-2b66f272a853" # Added Coveñas
]

all_uuids = set()
for part in [17, 18]:
    file_path = f"combined_batches/part_{part}.sql"
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Extract operation_center_id values
            matches = re.findall(r"operation_center_id, area_id, position_id, position_name, hire_date, is_current\)\s+VALUES\s+\(emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '([0-9a-f-]+)'", content)
            all_uuids.update(matches)

missing = [u for u in all_uuids if u not in db_centers]
print("Missing UUIDs:")
for m in missing:
    print(m)
