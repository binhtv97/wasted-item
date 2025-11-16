# Technical Architecture — MySQL Integration

## 1. Architecture Overview

```mermaid
graph TD
    A[User Browser] --> B[React Router Frontend]
    B --> C[API Routes]
    C --> D[Backend Services]
    D --> E[MySQL Database]
    
    subgraph "Frontend Layer"
        B
    end
    
    subgraph "Backend Layer"
        C
        D
    end
    
    subgraph "Data Layer"
        E
    end
```

## 2. Technology Stack

- Frontend: React Router v7 + TypeScript
- Backend: Express.js (integrated in React Router)
- Database: MySQL 8.0
- ORM: Prisma
- Environment: Node.js

## 3. Database Structure

### 3.1 Schema Design

```mermaid
erDiagram
    USER ||--o{ CONTACT : creates
    
    USER {
        int id PK
        string email UK
        string password_hash
        string name
        datetime created_at
        datetime updated_at
    }
    
    CONTACT {
        int id PK
        int user_id FK
        string first_name
        string last_name
        string email
        string phone
        string avatar
        string twitter
        string notes
        datetime created_at
        datetime updated_at
    }
```

### 3.2 Table Definitions

**Users table:**
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);
```

**Contacts table:**
```sql
CREATE TABLE contacts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    avatar VARCHAR(500),
    twitter VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_email (email),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 4. Prisma Models

**File: prisma/schema.prisma**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id            Int        @id @default(autoincrement())
  email         String     @unique @db.VarChar(255)
  passwordHash  String     @map("password_hash") @db.VarChar(255)
  name          String     @db.VarChar(100)
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")
  contacts      Contact[]

  @@map("users")
}

model Contact {
  id         Int       @id @default(autoincrement())
  userId     Int       @map("user_id")
  firstName  String    @map("first_name") @db.VarChar(100)
  lastName   String    @map("last_name") @db.VarChar(100)
  email      String?   @db.VarChar(255)
  phone      String?   @db.VarChar(20)
  avatar     String?   @db.VarChar(500)
  twitter    String?   @db.VarChar(100)
  notes      String?   @db.Text
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([email])
  @@map("contacts")
}
```

## 5. API Routes

### 5.1 User Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /api/users/register | POST | Register a new user |
| /api/users/login | POST | Log in |
| /api/users/profile | GET | Get current user profile |
| /api/users/profile | PUT | Update current user profile |

### 5.2 Contact Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /api/contacts | GET | Get the user's contact list |
| /api/contacts | POST | Create a new contact |
| /api/contacts/:id | GET | Get contact details |
| /api/contacts/:id | PUT | Update a contact |
| /api/contacts/:id | DELETE | Delete a contact |

## 6. Setup and Deployment

### 6.1 Install Dependencies
```bash
npm install prisma @prisma/client bcryptjs
npm install -D @types/bcryptjs
```

### 6.2 Environment Variables
**File: .env**
```
DATABASE_URL="mysql://username:password@localhost:3306/react_router_db"
JWT_SECRET="your-secret-key"
```

### 6.3 Initialize Prisma
```bash
npx prisma init
npx prisma db push
npx prisma generate
```

### 6.4 Migration Strategy
```bash
# Create a new migration
npx prisma migrate dev --name init

# Apply migrations in production
npx prisma migrate deploy
```

## 7. Code Samples

### 7.1 User Service
**File: app/services/user.server.ts**
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function createUser(email: string, password: string, name: string) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      name,
    },
  });
}

export async function validateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  
  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? user : null;
}
```

### 7.2 Contact Service
**File: app/services/contact.server.ts**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getContactsByUserId(userId: number) {
  return prisma.contact.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createContact(data: {
  userId: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  twitter?: string;
  notes?: string;
}) {
  return prisma.contact.create({ data });
}
```

## 8. Security Considerations

- Hash passwords with bcrypt
- Validate input before saving to the database
- Use prepared statements (Prisma handles this automatically)
- Implement rate limiting for API endpoints
- Use HTTPS in production
- Configure CORS appropriately

## 9. Testing Strategy

```bash
# Test database connection
npx prisma db pull

# Seed data for development
npx prisma db seed

# Run Prisma Studio to manage data
npx prisma studio
```

## 10. Deployment Checklist

- [ ] Configure DATABASE_URL in production
- [ ] Run migrations before deploying
- [ ] Backup the database regularly
- [ ] Monitor database performance
- [ ] Set up connection pooling if needed