-- Migrasi: Tambahkan data Nama Bank dan No. Rekening untuk karyawan yang sudah ada

UPDATE "public"."employees" SET "bankName" = 'Bank BCA', "bankAccount" = '1234567890' WHERE "code" = 'CN-001';
UPDATE "public"."employees" SET "bankName" = 'Bank Mandiri', "bankAccount" = '2345678901' WHERE "code" = 'CN-002';
UPDATE "public"."employees" SET "bankName" = 'Bank BRI', "bankAccount" = '3456789012' WHERE "code" = 'CN-003';
UPDATE "public"."employees" SET "bankName" = 'Bank BNI', "bankAccount" = '4567890123' WHERE "code" = 'CN-004';
UPDATE "public"."employees" SET "bankName" = 'Bank BCA', "bankAccount" = '5678901234' WHERE "code" = 'CN-005';
UPDATE "public"."employees" SET "bankName" = 'Bank Mandiri', "bankAccount" = '6789012345' WHERE "code" = 'CN-006';
UPDATE "public"."employees" SET "bankName" = 'Bank BRI', "bankAccount" = '7890123456' WHERE "code" = 'CN-007';
UPDATE "public"."employees" SET "bankName" = 'Bank BNI', "bankAccount" = '8901234567' WHERE "code" = 'CN-008';
UPDATE "public"."employees" SET "bankName" = 'Bank BCA', "bankAccount" = '9012345678' WHERE "code" = 'CN-009';
UPDATE "public"."employees" SET "bankName" = 'Bank Mandiri', "bankAccount" = '0123456789' WHERE "code" = 'CN-010';
UPDATE "public"."employees" SET "bankName" = 'Bank BCA', "bankAccount" = '1112233445' WHERE "code" = 'JKW-123';
UPDATE "public"."employees" SET "bankName" = 'Bank Mandiri', "bankAccount" = '2223344556' WHERE "code" = 'JKW-124';
UPDATE "public"."employees" SET "bankName" = 'Bank BRI', "bankAccount" = '3334455667' WHERE "code" = 'JKW-125';
UPDATE "public"."employees" SET "bankName" = 'Bank BNI', "bankAccount" = '4445566778' WHERE "code" = 'JKW-126';
UPDATE "public"."employees" SET "bankName" = 'Bank BCA', "bankAccount" = '5556677889' WHERE "code" = 'JKW-127';
