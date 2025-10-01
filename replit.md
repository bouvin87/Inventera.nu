# Overview

This is a warehouse inventory management application built with React, Express, and PostgreSQL. The system enables warehouse workers to perform inventory counts, track order lines, and manage warehouse operations. It features a multi-user interface where workers can log in, count inventory, mark discrepancies, and administrators can import/export data via Excel files. Real-time updates are pushed to all connected clients through WebSocket connections.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Library**: shadcn/ui components built on Radix UI primitives, styled with TailwindCSS

**State Management**: TanStack Query (React Query) for server state management with aggressive caching (staleTime: Infinity)

**Routing**: Single-page application with conditional rendering - users select their identity on a welcome screen, then access the main application

**Real-time Updates**: WebSocket hook (`useWebSocket`) that listens for server events and invalidates relevant React Query cache entries to trigger UI updates

**Design Pattern**: Component-based architecture with separation between presentational components (`/components/ui`) and feature components (`/components`). Pages are organized in `/pages` directory.

## Backend Architecture

**Framework**: Express.js running on Node.js with TypeScript

**Data Layer**: In-memory storage implementation (`MemStorage` class) that simulates database operations. The interface (`IStorage`) is designed to be swappable with a real database implementation.

**API Design**: RESTful endpoints under `/api` prefix for CRUD operations on users, articles, inventory counts, and order lines
- Inventory count endpoints: GET/POST/PATCH/DELETE on `/api/articles/:articleId/inventory` and `/api/inventory-counts/:id`
- Full CRUD support with Zod validation on request bodies

**Real-time Communication**: WebSocket server on `/ws` path that broadcasts updates to all connected clients when data mutations occur

**File Processing**: Multer middleware for handling Excel file uploads, with XLSX library for parsing spreadsheet data

**Development Setup**: Vite middleware integration for hot module replacement in development mode, with production serving static built files

## Data Models

**Users**: Warehouse workers with roles (Lagerarbetare/Lagerchef), activity tracking
- Fields: id, name, role, email, isActive, lastActive

**Articles**: Inventory items that can be counted
- Fields: id, articleNumber, description, length, location, inventoryCount, notes, isInventoried, lastInventoriedBy, lastInventoriedAt
- **Note**: inventoryCount, notes, isInventoried, lastInventoriedBy, lastInventoriedAt are deprecated in favor of separate InventoryCount records

**InventoryCounts**: Individual inventory counts performed by users (multiple counts per article)
- Fields: id, articleId (foreign key), userId, count, notes, createdAt
- Each article can have multiple inventory counts from different users
- Supports expandable rows in UI showing all counts with user information and totals

**Order Lines**: Items from orders that need to be picked and verified
- Fields: id, orderNumber, articleNumber, description, length, quantity, pickStatus, isInventoried, inventoriedBy, inventoriedAt

**Schema Definition**: Drizzle ORM schemas in `/shared/schema.ts` with Zod validation schemas for input validation

## External Dependencies

**Database**: PostgreSQL configured through Drizzle ORM
- Connection via `@neondatabase/serverless` driver
- Migrations stored in `/migrations` directory
- Schema uses UUID primary keys with `gen_random_uuid()`

**UI Components**: Extensive use of Radix UI primitives (@radix-ui/react-*) for accessible, unstyled components

**Styling**: TailwindCSS with custom design tokens defined in CSS variables (neutral base color, New York style from shadcn/ui)

**Data Processing**: 
- XLSX (SheetJS) for Excel file import/export
- Zod for runtime validation
- date-fns for date formatting

**Session Management**: connect-pg-simple for PostgreSQL-backed session storage (though authentication flow not fully implemented in current codebase)

**Development Tools**:
- Replit-specific plugins for Vite (cartographer, dev-banner, runtime-error-modal)
- ESBuild for server bundling in production

**WebSocket**: ws library for WebSocket server implementation

## Key Architectural Decisions

**Separation of Concerns**: Clear separation between client (`/client`), server (`/server`), and shared code (`/shared`) directories

**Type Safety**: Shared TypeScript types between frontend and backend via `/shared/schema.ts`

**Optimistic UI**: React Query's mutation system with cache invalidation for responsive user experience

**Import/Export**: Excel-based data exchange for bulk operations, allowing warehouse managers to prepare data offline
- **Export format**: One row per inventory count (not per article) with columns: Artikelnummer, Beskrivning, Längd, Lagerplats, Inventerat antal, Användare, Datum, Anteckningar
- Inventory export includes all counts with user and timestamp information
- Discrepancy export filters to only counts with notes

**Activity Tracking**: Last active timestamps on users to monitor who's currently working

**Inventory Workflow**: Two-tab system - one for inventory counting (articles) and one for order verification (order lines), with separate admin panel for data management

**Broadcast Pattern**: All mutations trigger WebSocket broadcasts to keep all connected clients synchronized in real-time