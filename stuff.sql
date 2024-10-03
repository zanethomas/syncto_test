-- drop table if exists syncto_list;
drop table if exists syncto_list;

CREATE TABLE syncto_list (
	id uuid default gen_random_uuid () PRIMARY KEY NOT NULL,
	text text not null,
	sync_to uuid [] not null,
	created_at timestamp with time zone not null
);

alter publication powersync
add
	table public.syncto_list;

-- insert 10000 items
DO $ $ DECLARE i INT;

page INT := 1;

current_timestamp TIMESTAMP := NOW();

BEGIN FOR i IN 1..10000 LOOP
INSERT INTO
	syncto_list (text, sync_to, created_at)
VALUES
	(
		'item ' || i,
		ARRAY [] :: UUID [],
		current_timestamp + (i || ' milliseconds') :: INTERVAL
	);

IF i % 100 = 0 THEN page := page + 1;

END IF;

END LOOP;

END $ $;

-- create function to update sync_to for a range of rows
CREATE
OR REPLACE FUNCTION update_sync_to(start_value INT, end_value INT, user_uuid UUID) RETURNS VOID AS $ $ BEGIN -- Add the UUID to sync_to for the specified range of rows
WITH ranked_rows AS (
	SELECT
		id,
		ROW_NUMBER() OVER (
			ORDER BY
				created_at ASC
		) AS row_num
	FROM
		syncto_list
)
UPDATE
	syncto_list
SET
	sync_to = CASE
		WHEN sync_to IS NULL THEN ARRAY [user_uuid]
		ELSE array_append(sync_to, user_uuid)
	END
FROM
	ranked_rows
WHERE
	syncto_list.id = ranked_rows.id
	AND ranked_rows.row_num BETWEEN start_value
	AND end_value;

END;

$ $ LANGUAGE plpgsql;

-- update all items to have sync_to = []
UPDATE
	syncto_list
SET
	sync_to = ARRAY [] :: uuid [];