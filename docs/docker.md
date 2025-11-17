# Build

- docker build -t food-waste-tracking .

# Host network:

## Create schema:

- docker run --network=host --rm -e DATABASE_URL="mysql://root:<password>@127.0.0.1:3306/food_waste_tracking" food-waste-tracking npx prisma db push

## Seed data:

- docker run --network=host --rm -e DATABASE_URL="mysql://root:<password>@127.0.0.1:3306/food_waste_tracking" food-waste-tracking npx prisma db seed

## Start app:

- docker run --network=host -e DATABASE_URL="mysql://root:<password>@127.0.0.1:3306/food_waste_tracking" -p 3000:3000 food-waste-tracking
