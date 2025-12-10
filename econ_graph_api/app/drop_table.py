from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.db_url)
with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS project_collaborator"))
    conn.commit()
    print("Dropped project_collaborator table")
