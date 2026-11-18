-- Brand panel → Customer tab: the Client Profile (who the customer is: age,
-- role, situation and what they care about). The tab's other controls reuse
-- existing columns: Desired Emotions → emo (up to 3 tags, comma-separated),
-- Funnel Stage → stage, Customer Language Preference → formality, CTA
-- Strength → cta, Always Mention → must_include, Research Notes →
-- research_notes.

alter table public.brands
  add column if not exists customer_profile text not null default '';
