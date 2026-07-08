from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_hash_and_verify():
    hashed = hash_password("mypassword")
    assert verify_password("mypassword", hashed)
    assert not verify_password("wrong", hashed)


def test_hash_is_deterministic_but_unique():
    h1 = hash_password("test")
    h2 = hash_password("test")
    assert h1 != h2
    assert verify_password("test", h1)
    assert verify_password("test", h2)


def test_access_token_roundtrip():
    token = create_access_token("42", "CLIENT")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["actor_type"] == "CLIENT"
    assert payload["type"] == "access"


def test_refresh_token_roundtrip():
    token = create_refresh_token("7", "STAFF:ADMIN")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "7"
    assert payload["actor_type"] == "STAFF:ADMIN"
    assert payload["type"] == "refresh"


def test_decode_invalid_token():
    assert decode_token("garbage") is None
