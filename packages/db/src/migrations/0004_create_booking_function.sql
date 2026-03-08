-- Atomic booking creation function
-- Runs in a SERIALIZABLE transaction to prevent double-booking.
-- The EXCLUDE USING gist constraint (from 0001) provides the database-level guard;
-- this function wraps the INSERT so callers get clean error semantics.
--
-- On overlap, Postgres raises SQLSTATE 23P01 (exclusion_violation).
-- On serialization contention, Postgres raises SQLSTATE 40001.
-- The application-level `withSerializableRetry()` handles 40001 retries.

CREATE OR REPLACE FUNCTION create_booking(
  p_provider_id   UUID,
  p_event_type_id UUID,
  p_starts_at     TIMESTAMPTZ,
  p_ends_at       TIMESTAMPTZ,
  p_customer_email TEXT,
  p_customer_name  TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_metadata       JSONB DEFAULT '{}'::jsonb
)
RETURNS bookings
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_requires_confirmation BOOLEAN;
  v_initial_status booking_status;
BEGIN
  -- Look up whether this event type requires manual confirmation
  SELECT requires_confirmation INTO v_requires_confirmation
    FROM event_types
   WHERE id = p_event_type_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event type % not found', p_event_type_id
      USING ERRCODE = 'P0002'; -- no_data_found
  END IF;

  -- Determine initial booking status
  IF v_requires_confirmation THEN
    v_initial_status := 'pending';
  ELSE
    v_initial_status := 'confirmed';
  END IF;

  -- Insert the booking. The EXCLUDE constraint (bookings_no_overlap)
  -- will raise SQLSTATE 23P01 if the slot overlaps an existing
  -- non-cancelled/non-rejected booking for this provider.
  INSERT INTO bookings (
    provider_id,
    event_type_id,
    starts_at,
    ends_at,
    customer_email,
    customer_name,
    customer_phone,
    status,
    metadata
  ) VALUES (
    p_provider_id,
    p_event_type_id,
    p_starts_at,
    p_ends_at,
    p_customer_email,
    p_customer_name,
    p_customer_phone,
    v_initial_status,
    p_metadata
  )
  RETURNING * INTO v_booking;

  -- The audit trigger (0002) automatically logs the 'created' event
  -- to booking_events, so we don't need to do it here.

  RETURN v_booking;
END;
$$;
