-- New status "Delayed" (listed after "Facility Received"). Like "On Hold", it
-- does not move the package on the map.
alter table public.shipments drop constraint if exists shipments_status_check;
alter table public.shipments add constraint shipments_status_check
  check (status in ('Label Created', 'Facility Received', 'Delayed', 'In Transit', 'Out for Delivery', 'Delivered', 'On Hold', 'Cancelled'));
alter table public.shipment_events drop constraint if exists shipment_events_status_check;
alter table public.shipment_events add constraint shipment_events_status_check
  check (status in ('Label Created', 'Facility Received', 'Delayed', 'In Transit', 'Out for Delivery', 'Delivered', 'On Hold', 'Cancelled'));
