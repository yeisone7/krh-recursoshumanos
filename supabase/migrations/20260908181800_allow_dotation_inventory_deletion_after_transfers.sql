alter table public.dotation_inventory_transfers
  drop constraint if exists dotation_inventory_transfers_source_inventory_id_fkey;

alter table public.dotation_inventory_transfers
  add constraint dotation_inventory_transfers_source_inventory_id_fkey
  foreign key (source_inventory_id)
  references public.dotation_inventory(id)
  on delete cascade;

alter table public.dotation_inventory_transfers
  drop constraint if exists dotation_inventory_transfers_destination_inventory_id_fkey;

alter table public.dotation_inventory_transfers
  add constraint dotation_inventory_transfers_destination_inventory_id_fkey
  foreign key (destination_inventory_id)
  references public.dotation_inventory(id)
  on delete cascade;
