# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Airtable clone built with the T3 Stack, featuring a spreadsheet-like interface with bases, tables, views, and real-time editing capabilities. The application provides virtualized table rendering for performance with large datasets.

## Tech Stack

- **Framework**: Next.js 15 with React 19
- **Database**: PostgreSQL with Prisma ORM
- **API**: tRPC for type-safe APIs
- **Auth**: NextAuth.js v5 beta
- **Styling**: Tailwind CSS with Radix UI components
- **Virtualization**: TanStack Virtual for table performance
- **State Management**: TanStack Query (React Query)

## Development Commands

### Essential Commands
```bash
# Start development server with Turbo
npm run dev

# Database operations
npm run db:generate    # Generate Prisma client and create migration
npm run db:push        # Push schema changes to database
npm run db:studio      # Open Prisma Studio
./start-database.sh    # Start local PostgreSQL container

# Code quality
npm run check          # Run linting and type checking
npm run lint           # ESLint only
npm run lint:fix       # Auto-fix ESLint issues
npm run typecheck      # TypeScript type checking only
npm run format:check   # Check Prettier formatting
npm run format:write   # Auto-format with Prettier

# Build and deployment
npm run build          # Production build
npm run preview        # Build and start production server
```

## Architecture Overview

### Database Schema (Prisma)
- **Base**: Top-level container (workspace equivalent)
- **Table**: Contains columns and rows within a base
- **Column**: Defines field structure with name, type, and order
- **Row**: Table record containing cells
- **Cell**: Individual data values (rowId + columnId + value)
- **View**: Configurable table display with filters, sorts, column order, and search
- **User/Auth**: NextAuth.js integration with Account/Session models

### API Structure (tRPC Routers)
Located in `src/server/api/routers/`:
- `base.ts` - Base CRUD operations
- `table.ts` - Table management
- `column.ts` - Column operations and ordering
- `row.ts` - Row operations with infinite scrolling support
- `cell.ts` - Individual cell updates
- `view.ts` - View configuration and filtering

### Frontend Architecture

#### Key Components
- **EditableTable** (`src/app/_components/table/EditableTable.tsx`): Main virtualized table component using TanStack Table + Virtual
- **VirtualizedTableBody**: Handles cell rendering, editing, and keyboard navigation
- **TableView**: Orchestrates table display with view selector and search
- **useTableData**: Core hook managing table state, infinite scrolling, and mutations

#### Data Flow
1. `useTableData` hook fetches columns, rows, and view config via tRPC
2. Data flows to `EditableTable` which creates virtualized table structure
3. `VirtualizedTableBody` renders visible cells with optimistic updates
4. Cell edits trigger tRPC mutations with optimistic UI updates

#### Virtualization Strategy
- **Row virtualization**: Handles large datasets efficiently
- **Column virtualization**: Supports tables with many columns
- **Infinite scrolling**: Loads more rows as user scrolls
- **Cell navigation**: Arrow key navigation with Excel-like behavior

### View System
Views support:
- Column ordering and hiding
- Filtering (equals, contains operators)
- Sorting (asc/desc)
- Search across all visible columns
- Grid view type (extensible for other view types)

## Development Patterns

### State Management
- Use tRPC mutations with optimistic updates for responsive UI
- Implement proper error handling and rollback for failed mutations
- Leverage TanStack Query's caching and invalidation

### Component Structure
- Components follow React Server Components pattern where possible
- Client components marked with "use client" directive
- Shared UI components in `src/components/ui/` using Radix primitives

### Database Operations
- Always use Prisma client for database operations
- Implement soft deletes with `isDeleted` flags
- Use transactions for multi-table operations
- Handle column ordering with integer `order` field

### Performance Considerations
- Virtualization is critical for large tables - maintain existing patterns
- Use `useMemo` for expensive computations like column/row mappings
- Implement pagination/infinite scrolling for large datasets
- Debounce search inputs to avoid excessive API calls

## Testing and Quality

Run quality checks before committing:
```bash
npm run check  # Runs both linting and type checking
```

The codebase uses:
- ESLint with Next.js and Prettier configs
- TypeScript strict mode
- Prettier for code formatting

## Database Setup

For local development:
1. Ensure Docker is installed
2. Run `./start-database.sh` to start PostgreSQL container
3. Run `npm run db:push` to sync schema
4. Optionally run `npm run db:studio` to inspect data

The script automatically handles container creation and password generation.