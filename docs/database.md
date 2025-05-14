# Database Configuration

This project supports both SQLite and PostgreSQL databases through a modular database architecture. The database type is determined by the `DB_TYPE` environment variable.

## Environment Variables

-   `DB_TYPE`: Specifies the database type.
    -   Set to `sqlite` for SQLite (default, no additional setup required).
    -   Set to `postgresql` for PostgreSQL.

### SQLite Configuration

-   `SQLITE_DB_PATH`: (Optional) Path to the SQLite database file. If not set, an in-memory database (`:memory:`) is used for development or a file in the project directory for production.
    -   Example: `SQLITE_DB_PATH=./data/database.sqlite`

### PostgreSQL Configuration

-   `DATABASE_URL`: **Required** when `DB_TYPE=postgresql`. The full connection string.
    -   Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME`
    -   Example: `DATABASE_URL=postgresql://postgres:password@localhost:5432/openbadges`

-   `PG_HOST`: Alternative to DATABASE_URL - PostgreSQL host
-   `PG_PORT`: Alternative to DATABASE_URL - PostgreSQL port (default: 5432)
-   `PG_USER`: Alternative to DATABASE_URL - PostgreSQL username
-   `PG_PASSWORD`: Alternative to DATABASE_URL - PostgreSQL password
-   `PG_DATABASE`: Alternative to DATABASE_URL - PostgreSQL database name
### Optional Settings

-   `DB_QUERY_LOGGING`: (Optional) Enable (`true`) or disable (`false`) logging of database queries. Defaults to `true`.
-   `DB_SLOW_QUERY_THRESHOLD`: (Optional) Set the threshold in milliseconds for logging slow queries. Defaults to `100`.
-   `DB_MAX_QUERY_LOGS`: (Optional) Maximum number of query logs to retain in memory. Defaults to `1000`.

## Setup and Migrations

Refer to the scripts defined in `package.json` for database-specific tasks:

-   **Generate Migrations:**
    -   SQLite (default): `bun run db:generate`
    -   PostgreSQL: `DB_TYPE=postgresql bun run db:generate`
-   **Apply Migrations:**
    -   SQLite (default): `bun run db:migrate`
    -   PostgreSQL: `DB_TYPE=postgresql bun run db:migrate`
-   **Drizzle Studio (Database Browser):**
    -   SQLite (default): `bun run db:studio`
    -   PostgreSQL: `DB_TYPE=postgresql bun run db:studio`

Ensure the correct environment variables (`DB_TYPE`, `DATABASE_URL` or `SQLITE_FILE`) are set before running these commands.
