-- Make checkout RPC resilient when store_items does not have a stock_qty column.

create or replace function public.place_checkout_order(
  p_order_details jsonb,
  p_line_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_total_amount numeric(10,2) := 0;
  v_line jsonb;
  v_item_id uuid;
  v_item_name text;
  v_item_price numeric(10,2);
  v_customer_name text;
  v_customer_email text;
  v_customer_phone text;
  v_address_line1 text;
  v_address_line2 text;
  v_city text;
  v_state text;
  v_postal_code text;
  v_country text;
  v_notes text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  v_customer_name := nullif(trim(coalesce(p_order_details->>'fullName', '')), '');
  v_customer_email := nullif(trim(coalesce(p_order_details->>'email', '')), '');
  v_customer_phone := nullif(trim(coalesce(p_order_details->>'phone', '')), '');
  v_address_line1 := nullif(trim(coalesce(p_order_details->>'addressLine1', '')), '');
  v_address_line2 := nullif(trim(coalesce(p_order_details->>'addressLine2', '')), '');
  v_city := nullif(trim(coalesce(p_order_details->>'city', '')), '');
  v_state := nullif(trim(coalesce(p_order_details->>'state', '')), '');
  v_postal_code := nullif(trim(coalesce(p_order_details->>'postalCode', '')), '');
  v_country := nullif(trim(coalesce(p_order_details->>'country', '')), '');
  v_notes := nullif(trim(coalesce(p_order_details->>'notes', '')), '');

  if v_customer_name is null
     or v_customer_email is null
     or v_customer_phone is null
     or v_address_line1 is null
     or v_city is null
     or v_postal_code is null
     or v_country is null then
    raise exception 'missing checkout details';
  end if;

  select coalesce(sum(
    ((line ->> 'unitPrice')::numeric(10,2) * (line ->> 'quantity')::integer)
  ), 0)
  into v_total_amount
  from jsonb_array_elements(coalesce(p_line_items, '[]'::jsonb)) as line;

  insert into public.orders (
    user_id,
    total_amount,
    status,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_postal_code,
    shipping_country,
    order_notes
  ) values (
    v_user_id,
    round(v_total_amount, 2),
    'pending',
    v_customer_name,
    v_customer_email,
    v_customer_phone,
    v_address_line1,
    v_address_line2,
    v_city,
    v_state,
    v_postal_code,
    v_country,
    v_notes
  ) returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(coalesce(p_line_items, '[]'::jsonb)) loop
    v_item_name := nullif(trim(coalesce(v_line->>'name', '')), '');
    v_item_price := (v_line->>'unitPrice')::numeric(10,2);

    if v_item_name is null then
      raise exception 'invalid line item name';
    end if;

    select id
      into v_item_id
      from public.store_items
      where name = v_item_name
        and price = v_item_price
      limit 1;

    if v_item_id is null then
      insert into public.store_items (name, price)
      values (
        v_item_name,
        v_item_price
      )
      returning id into v_item_id;
    end if;

    insert into public.order_items (
      order_id,
      item_id,
      quantity,
      unit_price
    ) values (
      v_order_id,
      v_item_id,
      greatest((v_line->>'quantity')::integer, 1),
      (v_line->>'unitPrice')::numeric(10,2)
    );
  end loop;

  return v_order_id;
end;
$$;

grant execute on function public.place_checkout_order(jsonb, jsonb) to authenticated;
