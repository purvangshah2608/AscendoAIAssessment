from sqlalchemy import String, Text, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class Card(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "cards"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[str] = mapped_column(String(50), index=True)  # Lexorank
    list_id: Mapped[int] = mapped_column(ForeignKey("lists.id"))

    # Optimistic locking version
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    list: Mapped["List"] = relationship("List", back_populates="cards")