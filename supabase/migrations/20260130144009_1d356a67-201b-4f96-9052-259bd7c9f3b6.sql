-- Add specific email preference for requisition approvals
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS email_requisition_approvals boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.user_preferences.email_requisition_approvals IS 'Receive email notifications for pending requisition approvals';