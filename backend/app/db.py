import time

from sqlalchemy import Float, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class Dataset(Base):
    __tablename__ = "datasets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    kind: Mapped[str] = mapped_column(String(16))
    created: Mapped[float] = mapped_column(Float, default=time.time, index=True)
    checksum: Mapped[str] = mapped_column(String(64))
    details: Mapped[str] = mapped_column(Text)


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    dataset_id: Mapped[str] = mapped_column(String(36), index=True)
    status: Mapped[str] = mapped_column(String(16), index=True)
    created: Mapped[float] = mapped_column(Float, default=time.time, index=True)
    result: Mapped[str] = mapped_column(Text, default="{}")
    key: Mapped[str] = mapped_column(String(80), unique=True)


class SessionToken(Base):
    __tablename__ = "sessions"
    digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    expires: Mapped[float] = mapped_column(Float, index=True)


class Audit(Base):
    __tablename__ = "audit"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created: Mapped[float] = mapped_column(Float, default=time.time)
    action: Mapped[str] = mapped_column(String(40))
    resource: Mapped[str] = mapped_column(String(36))


def connect(url):
    engine = create_engine(
        url,
        connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
        pool_pre_ping=True,
    )
    return engine, sessionmaker(engine, expire_on_commit=False)
