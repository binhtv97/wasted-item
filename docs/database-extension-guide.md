# Database Extension Guide — Prisma & MySQL

## 1. Inspect the Current Database

### 1.1 Check the Database File (SQLite only)
```bash
# Check if the local SQLite database file exists
ls -la prisma/dev.db

# Check the file size
du -h prisma/dev.db
```

### 1.2 Inspect Schema with Prisma
```bash
# View the current database schema
npx prisma db pull

# Open Prisma Studio to view and edit data
npx prisma studio
```

### 1.3 Inspect Data in the Database (SQLite example)
```bash
# Query directly with SQLite (if using SQLite)
sqlite3 prisma/dev.db ".tables"
sqlite3 prisma/dev.db "SELECT * FROM users;"
sqlite3 prisma/dev.db "SELECT * FROM contacts;"
```

## 2. Add a New Table — Step by Step

### 2.1 Example: Add a Categories table

**Step 1: Update Schema**
```prisma
// Add to prisma/schema.prisma

model Category {
  id          Int        @id @default(autoincrement())
  name        String     @unique
  description String?
  color       String?    // Color code for the category
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")
  contacts    Contact[]  // Relationship to Contact

  @@map("categories")
}

// Update Contact model to add the relationship
model Contact {
  // ... existing fields ...
  categoryId  Int?       @map("category_id")
  category    Category?  @relation(fields: [categoryId], references: [id])
  
  @@index([categoryId])
}
```

**Step 2: Create a Migration**
```bash
# Create a new migration
npx prisma migrate dev --name add_categories

# Or use db push for development
npx prisma db push
```

**Step 3: Generate Prisma Client**
```bash
# Regenerate the client with the new schema
npx prisma generate
```

### 2.2 Example: Add Tags (Many-to-Many)

**Tags schema:**
```prisma
model Tag {
  id          Int        @id @default(autoincrement())
  name        String     @unique
  color       String?
  createdAt   DateTime   @default(now()) @map("created_at")
  contacts    ContactTag[]

  @@map("tags")
}

model ContactTag {
  contactId   Int
  tagId       Int
  contact     Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)
  tag         Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@id([contactId, tagId])
  @@map("contact_tags")
}

// Update Contact model
model Contact {
  // ... existing fields ...
  tags        ContactTag[]
}
```

## 3. Best Practices for Database Design

### 3.1 Naming Conventions
```prisma
// Tốt
model UserProfile {
  id          Int      @id @default(autoincrement())
  userId      Int      @unique @map("user_id")
  bio         String?  @db.Text
  avatarUrl   String?  @map("avatar_url")
  
  @@map("user_profiles")
}

// Không nên
model userprofile {
  id          Int
  user_id     Int
}
```

### 3.2 Indexes Strategy
```prisma
model Product {
  id          Int      @id @default(autoincrement())
  name        String
  sku         String   @unique
  categoryId  Int      @map("category_id")
  price       Decimal  @db.Decimal(10, 2)
  status      String   @default("active")
  createdAt   DateTime @default(now())

  // Indexes cho performance
  @@index([categoryId])
  @@index([status])
  @@index([createdAt])
  @@index([categoryId, status]) // Composite index
}
```

### 3.3 Data Validation
```prisma
model User {
  email String @unique @db.VarChar(255)
  age   Int    @db.SmallInt
  
  // Validation với check constraints (MySQL 8.0+)
  @@index([email])
}
```

## 4. Migration Strategies

### 4.1 Development Workflow
```bash
# 1. Update schema
# 2. Tạo migration
npx prisma migrate dev --name descriptive_name

# 3. Kiểm tra migration
npx prisma migrate status

# 4. Nếu cần rollback
npx prisma migrate resolve --rolled-back migration_name
```

### 4.2 Production Workflow
```bash
# 1. Tạo migration trong development
npx prisma migrate dev --name feature_name

# 2. Deploy migration trong production
npx prisma migrate deploy

# 3. Kiểm tra status
npx prisma migrate status
```

### 4.3 Data Seeding
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed categories
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: 'Friends', color: '#3B82F6' }
    }),
    prisma.category.create({
      data: { name: 'Work', color: '#10B981' }
    }),
    prisma.category.create({
      data: { name: 'Family', color: '#F59E0B' }
    })
  ])

  console.log('Categories seeded:', categories)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## 5. Performance Monitoring

### 5.1 Query Logging
```typescript
// Enable query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})
```

### 5.2 Database Size Monitoring
```sql
-- MySQL: Check table sizes
SELECT 
  table_name AS 'Table',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'your_database_name'
ORDER BY (data_length + index_length) DESC;
```

## 6. Backup & Recovery

### 6.1 MySQL Backup
```bash
# Backup database
mysqldump -u username -p database_name > backup.sql

# Restore database
mysql -u username -p database_name < backup.sql
```

### 6.2 SQLite Backup
```bash
# Backup SQLite database
cp prisma/dev.db prisma/dev.db.backup
```

## 7. Common Issues & Solutions

### 7.1 Migration Failures
```bash
# Kiểm tra migration history
npx prisma migrate resolve --status

# Reset database (development only)
npx prisma migrate reset
```

### 7.2 Schema Conflicts
```bash
# Pull schema từ database
npx prisma db pull

# Compare với local schema
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma
```

## 8. Extension Examples

### 8.1 Audit Trail
```prisma
model AuditLog {
  id          Int      @id @default(autoincrement())
  tableName   String   @map("table_name")
  recordId    Int      @map("record_id")
  action      String   // CREATE, UPDATE, DELETE
  oldValues   Json?    @map("old_values")
  newValues   Json?    @map("new_values")
  userId      Int      @map("user_id")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([tableName, recordId])
  @@map("audit_logs")
}
```

### 8.2 File Uploads
```prisma
model FileUpload {
  id          Int      @id @default(autoincrement())
  filename    String
  originalName String  @map("original_name")
  mimeType    String   @map("mime_type")
  size        Int
  path        String
  uploadedBy  Int      @map("uploaded_by")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([uploadedBy])
  @@map("file_uploads")
}
```

## 9. Commands Quick Reference

```bash
# Database operations
npx prisma studio          # Mở GUI quản lý database
npx prisma db push          # Push schema changes (dev only)
npx prisma db pull          # Pull schema từ database
npx prisma generate         # Generate Prisma Client

# Migration operations
npx prisma migrate dev      # Tạo và apply migration
npx prisma migrate deploy   # Apply migrations trong production
npx prisma migrate status   # Kiểm tra migration status
npx prisma migrate reset    # Reset database (dev only)

# Utility commands
npx prisma format           # Format schema file
npx prisma validate        # Validate schema
```

## 10. Next Steps

1. **Setup Monitoring**: Thêm logging và monitoring cho database queries
2. **Performance Optimization**: Analyze slow queries và thêm indexes phù hợp
3. **Security**: Implement row-level security và data encryption
4. **Scaling**: Chuẩn bị cho horizontal scaling với read replicas