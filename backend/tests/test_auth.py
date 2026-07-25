"""
HabitFlow Pro – Authentication Endpoint Tests.

Covers:
    - Signup (success, duplicate, weak password)
    - Login  (success, wrong password, non-existent user)
    - Refresh (success, invalid token)
    - Logout (success, idempotent)
    - GET /me (authenticated, unauthenticated)
    - Health check
"""

from tests.conftest import VALID_USER, VALID_USER_2


# ═══════════════════════════════════════════════════════════════
# Health
# ═══════════════════════════════════════════════════════════════

class TestHealth:
    """Tests for GET /api/v1/health."""

    def test_health_returns_200(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "healthy"
        assert "version" in body
        assert "environment" in body
        assert "timestamp" in body


# ═══════════════════════════════════════════════════════════════
# Signup
# ═══════════════════════════════════════════════════════════════

class TestSignup:
    """Tests for POST /api/v1/auth/signup."""

    def test_signup_success(self, client):
        response = client.post("/api/v1/auth/signup", json=VALID_USER)
        assert response.status_code == 201
        body = response.json()
        assert body["success"] is True
        assert body["data"]["user"]["email"] == VALID_USER["email"]
        assert "access_token" in body["data"]["tokens"]
        assert "refresh_token" in body["data"]["tokens"]

    def test_signup_duplicate_email(self, client):
        client.post("/api/v1/auth/signup", json=VALID_USER)
        response = client.post("/api/v1/auth/signup", json=VALID_USER)
        assert response.status_code == 409
        body = response.json()
        assert body["success"] is False

    def test_signup_weak_password(self, client):
        weak = {**VALID_USER, "password": "weakpass"}
        response = client.post("/api/v1/auth/signup", json=weak)
        assert response.status_code == 422

    def test_signup_missing_fields(self, client):
        response = client.post("/api/v1/auth/signup", json={})
        assert response.status_code == 422

    def test_signup_invalid_email(self, client):
        invalid = {**VALID_USER, "email": "not-an-email"}
        response = client.post("/api/v1/auth/signup", json=invalid)
        assert response.status_code == 422


# ═══════════════════════════════════════════════════════════════
# Login
# ═══════════════════════════════════════════════════════════════

class TestLogin:
    """Tests for POST /api/v1/auth/login."""

    def test_login_success(self, client):
        client.post("/api/v1/auth/signup", json=VALID_USER)
        response = client.post(
            "/api/v1/auth/login",
            json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert "access_token" in body["data"]["tokens"]

    def test_login_wrong_password(self, client):
        client.post("/api/v1/auth/signup", json=VALID_USER)
        response = client.post(
            "/api/v1/auth/login",
            json={"email": VALID_USER["email"], "password": "Wr0ngP@ss"},
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "ghost@example.com", "password": "N0tReal!"},
        )
        assert response.status_code == 401


# ═══════════════════════════════════════════════════════════════
# Token Refresh
# ═══════════════════════════════════════════════════════════════

class TestRefresh:
    """Tests for POST /api/v1/auth/refresh."""

    def test_refresh_success(self, client):
        signup_resp = client.post("/api/v1/auth/signup", json=VALID_USER)
        tokens = signup_resp.json()["data"]["tokens"]

        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        new_tokens = body["data"]["tokens"]
        assert new_tokens["access_token"] != tokens["access_token"]

    def test_refresh_invalid_token(self, client):
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.jwt.string"},
        )
        assert response.status_code == 401

    def test_refresh_reuse_revoked_token(self, client):
        """After refresh, the old token should be revoked."""
        signup_resp = client.post("/api/v1/auth/signup", json=VALID_USER)
        old_refresh = signup_resp.json()["data"]["tokens"]["refresh_token"]

        # First refresh – should succeed.
        client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})

        # Second refresh with the same old token – should fail.
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": old_refresh},
        )
        assert response.status_code == 401


# ═══════════════════════════════════════════════════════════════
# Logout
# ═══════════════════════════════════════════════════════════════

class TestLogout:
    """Tests for POST /api/v1/auth/logout."""

    def test_logout_success(self, client):
        signup_resp = client.post("/api/v1/auth/signup", json=VALID_USER)
        tokens = signup_resp.json()["data"]["tokens"]

        response = client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_logout_idempotent(self, client):
        """Logging out with an already-revoked token should still return 200."""
        response = client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": "nonexistent.token.here"},
        )
        assert response.status_code == 200


# ═══════════════════════════════════════════════════════════════
# GET /me
# ═══════════════════════════════════════════════════════════════

class TestMe:
    """Tests for GET /api/v1/auth/me."""

    def test_me_authenticated(self, client):
        signup_resp = client.post("/api/v1/auth/signup", json=VALID_USER)
        access = signup_resp.json()["data"]["tokens"]["access_token"]

        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["data"]["user"]["email"] == VALID_USER["email"]

    def test_me_unauthenticated(self, client):
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_me_invalid_token(self, client):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code == 401
