import pytest
from app.services.lexorank import get_rank_between, LexorankError


def test_initial_rank():
    assert get_rank_between(None, None) == "n"


def test_rank_before():
    rank1 = get_rank_between(None, None)  # "n"
    rank2 = get_rank_between(None, rank1)
    assert rank2 < rank1


def test_rank_after():
    rank1 = get_rank_between(None, None)  # "n"
    rank2 = get_rank_between(rank1, None)
    assert rank2 > rank1


def test_rank_between():
    rank1 = "a"
    rank3 = "c"
    rank2 = get_rank_between(rank1, rank3)
    assert rank1 < rank2 < rank3


def test_invalid_order_raises_error():
    with pytest.raises(LexorankError):
        get_rank_between("z", "a")