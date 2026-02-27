from app.database import engine
from app.models import SQLModel
SQLModel.metadata.create_all(engine)
print("Tables created.")
