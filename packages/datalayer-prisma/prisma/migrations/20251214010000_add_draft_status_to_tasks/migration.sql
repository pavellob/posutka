-- AlterEnum
DO $$ BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_enum WHERE enumlabel = 'DRAFT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TaskStatus')
 ) THEN
   ALTER TYPE "TaskStatus" ADD VALUE 'DRAFT';
 END IF;
END $$;

