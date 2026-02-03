-- Migration 1: Add new role enum values only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'account_lead';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery_lead';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'consultant';