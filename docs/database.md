# Database Configuration

This project supports both SQLite and PostgreSQL databases. The selection is determined by the `DB_TYPE` environment variable.

## Environment Variables

-   `DB_TYPE`: Specifies the database dialect.
    -   Set to `sqlite` for SQLite (default).
    -   Set to `postgresql` for PostgreSQL.

### SQLite

-   `SQLITE_FILE`: (Optional) Path to the SQLite database file. If not set, an in-memory database (`:memory:`) is used.
    -   Example: `SQLITE_FILE=./local_database.sqlite`

### PostgreSQL

-   `DATABASE_URL`: **Required** when `DB_TYPE=postgresql`. The full connection string.
    -   Format: `postgres://USER:PASSWORD@HOST:PORT/DATABASE_NAME`
    -   Example: `DATABASE_URL=postgres://admin:secret@localhost:5432/openbadges_dev`

For detailed PostgreSQL configuration, see [PostgreSQL Configuration Guide](./postgresql-configuration.md).
### Optional Settings

-   `DB_QUERY_LOGGING`: (Optional) Enable (`true`) or disable (`false`) logging of database queries. Defaults to `true`.
-   `DB_SLOW_QUERY_THRESHOLD`: (Optional) Set the threshold in milliseconds for logging slow queries. Defaults to `100`.
-   `DB_MAX_QUERY_LOGS`: (Optional) Maximum number of query logs to retain in memory. Defaults to `1000`.

## Setup and Migrations

Refer to the `npm` scripts defined in `package.json` for database-specific tasks:

-   **Generate Migrations:**
    -   PostgreSQL: `npm run db:generate:pg`
    -   SQLite: `npm run db:generate:sqlite`
-   **Apply Migrations:**
    -   PostgreSQL: `npm run db:migrate:pg`
    -   SQLite: `npm run db:migrate:sqlite`
-   **Drizzle Studio (Database Browser):**
    -   PostgreSQL: `npm run db:studio:pg`
    -   SQLite: `npm run db:studio:sqlite`

Ensure the correct environment variables (`DB_TYPE`, `DATABASE_URL` or `SQLITE_FILE`) are set before running these commands.
