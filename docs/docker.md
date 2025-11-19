# Run the project with Docker (step-by-step)

## Requirements

- MySQL 8 running (via Docker or on host)
- Email environment variables for sending CSV reports:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Optional: `IS_REQUIRED_LOGIN=true` to require login first, `NUMBER_OF_PIN="4" | "6"`

---

## Option 1 (Recommended): Docker Compose (app + worker as separate processes)

1. Create a `.env` next to `docker-compose.yml` (or export variables in your shell)

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_pass
SMTP_FROM=Food Waste Tracker <noreply@example.com>
IS_REQUIRED_LOGIN=true
NUMBER_OF_PIN=4
```

2. Start the stack

```
docker compose up -d
```

- `mysql` service creates the `food_waste_tracking` database
- `app` service runs `npx prisma db push` then starts the web server
- `worker` service continuously runs `node scripts/report-worker.js` to send CSV reports

3. Seed dummy data (optional, generates a month of WasteEntry)

```
docker compose exec app node /app/seed.cjs
```

4. Access the application

- Web: `http://localhost:3000`
- Portal: `http://localhost:3000/portal`
- Login PIN: `http://localhost:3000/login-pin`

5. Test CSV email

- Create a `ReportRecipient` in the Portal (`WEEKLY` or `DAILY`, set `sendTimeMin` to current minute)
- View worker logs: `docker compose logs -f worker`

---

## Option 2: Manual Docker with Host Network (Linux)

1. Build the image

```
docker build -t food-waste-tracking .
```

2. Create schema in the host DB (MySQL must listen at `127.0.0.1:3306`)

```
docker run --network=host --rm \
  -e DATABASE_URL="mysql://root:secret@127.0.0.1:3306/food_waste_tracking" \
  food-waste-tracking npx prisma db push
```

3. Seed data (users, outlet, items, and monthly WasteEntry dummy data)

```
docker run --network=host --rm \
  -e DATABASE_URL="mysql://root:<password>@127.0.0.1:3306/food_waste_tracking" \
  food-waste-tracking node /app/seed.cjs
```

4. Run the app (host network on Linux, no port mapping needed)

```
docker run --network=host \
  -e DATABASE_URL="mysql://root:<password>@127.0.0.1:3306/food_waste_tracking" \
  -e IS_REQUIRED_LOGIN="true" \
  -e SMTP_HOST="smtp.example.com" -e SMTP_PORT="587" -e SMTP_USER="binhtvse97@gmail.com" -e SMTP_PASS="tmwr ghtt doav kdwf" -e SMTP_FROM="Food Waste Tracker <noreply@example.com>" \
  food-waste-tracking
```

- Access: `http://localhost:3000`

5. Run the worker continuously (optional, separate from app)

```
docker run --network=host \
  -e DATABASE_URL="mysql://root:<password>@127.0.0.1:3306/food_waste_tracking" \
  -e SMTP_HOST="smtp.example.com" -e SMTP_PORT="587" -e SMTP_USER="your_user" -e SMTP_PASS="your_pass" -e SMTP_FROM="Food Waste Tracker <noreply@example.com>" \
  food-waste-tracking node /app/scripts/report-worker.js
```

---

## Operations Notes

- The `postbuild` script in `package.json` only performs verification (export CSV daily + run worker once). For continuous operation, use the `worker` service (Compose) or the `report:worker:run` script.
- On Linux, if not using host network, you can map `host.docker.internal` with `--add-host=host.docker.internal:host-gateway` and ensure MySQL listens on `0.0.0.0`.
- Default seed credentials:
  - Admin: `username = testadmin`, `PIN = 1111`
  - User: `username = testuser`, `PIN = 1234`
- If login fails:
  - Ensure you ran the seed against the same DB as the app (`DATABASE_URL` identical).
  - Check `users` table with `npx prisma studio` to confirm credentials exist.
  - Re-run seed or adjust pins if you modified seed logic.

LINUX:

Step 1: docker compose --env-file .env build --no-cache
Step 2: docker compose --env-file .env up -d
Step 3: docker compose --env-file .env exec app node /app/seed.cjs
