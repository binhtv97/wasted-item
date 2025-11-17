# Getting Started: Project and Database

This guide helps you start the project, initialize the MySQL database, understand data location, and verify connectivity.

## System Requirements

- Node.js `>=20`
- MySQL Server running on `localhost:3306`

## Environment Configuration

- Edit `.env` and set MySQL connection variables:
  - `DATABASE_URL="mysql://root@localhost:3306/food_waste_tracking"`
  - `JWT_SECRET="your-secret-key-change-in-production"`

## Initialize the Database

1. Create the database (if not exists):
   - `mysql -u root -e "CREATE DATABASE IF NOT EXISTS food_waste_tracking CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"`
2. Push Prisma schema to MySQL (development):
   - `npx prisma db push`
3. Generate Prisma Client:
   - `npx prisma generate`
4. (Optional) Seed sample data:
   - `npx prisma db seed`

## Data Location

- With MySQL: data lives in your MySQL Server’s data directory, not in the project repo.
- Previously with SQLite, the DB file was at `prisma/dev.db`. After switching to MySQL, there is no local DB file in the project.

## Connectivity Checks

- Prisma Studio (GUI):
  - `npx prisma studio` then open `http://localhost:5555/`
- MySQL CLI:
  - `mysql -u root food_waste_tracking -e "SHOW TABLES;"`
  - `mysql -u root food_waste_tracking -e "SELECT COUNT(*) FROM users;"`

## Run the Project

- Development: `npm run dev`
- Build: `npm run build`
- Production serve: `npm start`

## Notes

- Prisma is configured for MySQL in `prisma/schema.prisma` with `provider = "mysql"` and `url = env("DATABASE_URL")`.
- Prisma loads environment variables via `prisma.config.ts` and `.env`.

# TO BUILD DOCKER

docker run -e DATABASE_URL="mysql://root@host.docker.internal:3306/food_waste_tracking" -e IS_REQUIRED_LOGIN="true" -e SMTP_HOST="..." -e SMTP_PORT="587" -e SMTP_USER="..." -e SMTP_PASS="..." -e SMTP_FROM="..." -p 3000:3000 food-waste-tracking
