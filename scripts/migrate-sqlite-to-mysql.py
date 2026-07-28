import os
import sqlite3
from datetime import datetime, timezone
from urllib.parse import unquote, urlparse

import pymysql


TABLES = [
    "Department",
    "User",
    "FundSource",
    "ActivityRequest",
    "RequestAttachment",
    "RequestApproval",
    "AuditLog",
    "FundLedgerEntry",
]

DATETIME_COLUMNS = {
    "User": {"birthdate", "createdAt"},
    "ActivityRequest": {"date", "createdAt", "updatedAt"},
    "FundLedgerEntry": {"transactionDate", "createdAt"},
    "RequestAttachment": {"createdAt"},
    "RequestApproval": {"createdAt"},
    "AuditLog": {"createdAt"},
}


def mysql_connection():
    parsed = urlparse(os.environ["MYSQL_DATABASE_URL"])
    if parsed.scheme != "mysql":
        raise RuntimeError("MYSQL_DATABASE_URL must use the mysql:// scheme.")

    return pymysql.connect(
        host=parsed.hostname or "127.0.0.1",
        port=parsed.port or 3306,
        user=unquote(parsed.username or ""),
        password=unquote(parsed.password or ""),
        database=parsed.path.lstrip("/"),
        charset="utf8mb4",
        autocommit=False,
    )


def convert_value(table, column, value):
    if value is None or column not in DATETIME_COLUMNS.get(table, set()):
        return value

    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000, tz=timezone.utc).replace(tzinfo=None)

    return value


def main():
    sqlite_path = os.environ["SQLITE_DATABASE_PATH"]
    source = sqlite3.connect(f"file:{sqlite_path}?mode=ro", uri=True)
    destination = mysql_connection()

    try:
        source.execute("PRAGMA foreign_keys = ON")
        integrity = source.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"SQLite integrity check failed: {integrity}")

        with destination.cursor() as cursor:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")

            for table in TABLES:
                cursor.execute(f"SELECT COUNT(*) FROM `{table}`")
                existing_count = cursor.fetchone()[0]
                if existing_count:
                    raise RuntimeError(
                        f"Destination table {table} is not empty ({existing_count} rows)."
                    )

                columns = [
                    row[1]
                    for row in source.execute(f'PRAGMA table_info("{table}")').fetchall()
                ]
                rows = source.execute(f'SELECT * FROM "{table}"').fetchall()

                if rows:
                    quoted_columns = ", ".join(f"`{column}`" for column in columns)
                    placeholders = ", ".join(["%s"] * len(columns))
                    values = [
                        tuple(
                            convert_value(table, column, value)
                            for column, value in zip(columns, row)
                        )
                        for row in rows
                    ]
                    cursor.executemany(
                        f"INSERT INTO `{table}` ({quoted_columns}) VALUES ({placeholders})",
                        values,
                    )

                print(f"{table}: copied {len(rows)} row(s)")

            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")

        destination.commit()

        with destination.cursor() as cursor:
            for table in TABLES:
                source_count = source.execute(
                    f'SELECT COUNT(*) FROM "{table}"'
                ).fetchone()[0]
                cursor.execute(f"SELECT COUNT(*) FROM `{table}`")
                destination_count = cursor.fetchone()[0]
                if source_count != destination_count:
                    raise RuntimeError(
                        f"Count mismatch for {table}: SQLite={source_count}, "
                        f"MySQL={destination_count}"
                    )
                print(f"{table}: validated {destination_count} row(s)")

        print("Migration validation completed successfully.")
    except Exception:
        destination.rollback()
        raise
    finally:
        source.close()
        destination.close()


if __name__ == "__main__":
    main()
