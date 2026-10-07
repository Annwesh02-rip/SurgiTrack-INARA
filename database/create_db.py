from pathlib import Path

from app.database import Base
from app.database import engine
from app.database import DATABASE_PATH

# IMPORTANT:
# Import models so SQLAlchemy knows about the tables.
from app import models


print()
print("=" * 60)
print("             SURGITRACK DATABASE")
print("=" * 60)

print()
print("Database location:")
print(DATABASE_PATH)

print()
print("Creating database tables...")

try:

    Base.metadata.create_all(bind=engine)

    print()
    print("SUCCESS!")
    print("Database and tables created successfully.")

except Exception as e:

    print()
    print("DATABASE CREATION FAILED")
    print()
    print("Error:")
    print(e)

    raise

print()
print("Database exists:")
print(DATABASE_PATH.exists())

print()
print("Database size:")

if DATABASE_PATH.exists():
    print(f"{DATABASE_PATH.stat().st_size} bytes")

print()
print("=" * 60)