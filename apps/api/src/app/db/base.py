from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.modules.chop_it.infrastructure import models as chop_it_models  # noqa: E402, F401
