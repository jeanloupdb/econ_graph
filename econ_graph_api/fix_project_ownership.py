
import sys
import os

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Override DATABASE_URL to use localhost
os.environ["DATABASE_URL"] = "postgresql+psycopg://econ_user:econ_pass@localhost:5432/econ"

from app.core.db import SessionLocal
from app.models.project import Project
from app.models.user import User

def fix_ownership():
    db = SessionLocal()
    try:
        # List all users
        users = db.query(User).all()
        print("\nUsers in database:")
        for u in users:
            print(f"- {u.username} ({u.id}): Active={u.is_active}, Superuser={u.is_superuser}")

        # Get the admin user
        user = db.query(User).filter(User.username == "admin").first()
        if not user:
            print("User 'admin' not found. Falling back to first user.")
            user = db.query(User).first()
        
        if not user:
            print("No user found in database.")
            return

        print(f"Found user: {user.username} ({user.id})")

        # Find all projects and assign to admin
        projects = db.query(Project).all()
        print(f"Found {len(projects)} projects.")

        for p in projects:
            if p.user_id != user.id:
                print(f"Re-assigning project '{p.name}' ({p.id}) from {p.user_id} to {user.username}")
                p.user_id = user.id
        
        db.commit()
        print("Done.")
        
        # Also list all projects and their owners for verification
        all_projects = db.query(Project).all()
        print("\nProject Ownership Status:")
        for p in all_projects:
            owner = db.query(User).filter(User.id == p.user_id).first()
            owner_name = owner.username if owner else "None"
            print(f"- {p.name} ({p.id}): Owner = {owner_name}")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_ownership()
