from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class List(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "lists"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    position: Mapped[str] = mapped_column(String(50), index=True)  # Lexorank
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id"))

    # Relationships
    board: Mapped["Board"] = relationship("Board", back_populates="lists")
    cards: Mapped[list["Card"]] = relationship(
        "Card",
        back_populates="list",
        lazy="selectin",
        order_by="Card.position"
    )