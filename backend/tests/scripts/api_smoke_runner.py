from fastapi.testclient import TestClient

from app.main import app


def main() -> None:
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200, health.text
        assert health.json()["status"] == "ok"

        register_response = client.post(
            "/api/auth/register",
            json={"username": "smoke-user", "password": "smoke-pass"},
        )
        assert register_response.status_code in {200, 400}, register_response.text

        login_response = client.post(
            "/api/auth/login",
            data={"username": "smoke-user", "password": "smoke-pass"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert login_response.status_code == 200, login_response.text
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        notebook_response = client.post(
            "/api/notebooks/",
            headers=headers,
            json={"name": "Smoke Notebook", "description": "E2E notebook", "cover_url": None},
        )
        assert notebook_response.status_code == 200, notebook_response.text
        notebook = notebook_response.json()

        diary_payload = {
            "title": "Smoke Entry",
            "content": {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Hello smoke test"}]}
                ],
            },
            "notebook_id": notebook["id"],
            "tags": ["smoke"],
            "stats": {"weather": {"weather": "☀️", "temperature": 26}},
            "mood": {"emoji": "🙂", "label": "Happy"},
            "location": {"name": "Test Place"},
        }
        diary_response = client.post("/api/diaries/", headers=headers, json=diary_payload)
        assert diary_response.status_code == 200, diary_response.text
        diary = diary_response.json()

        second_diary_response = client.post(
            "/api/diaries/",
            headers=headers,
            json={
                "title": "Second Entry",
                "content": {
                    "type": "doc",
                    "content": [
                        {"type": "paragraph", "content": [{"type": "text", "text": "Another entry"}]}
                    ],
                },
                "notebook_id": notebook["id"],
                "tags": ["other"],
                "stats": {"weather": {"weather": "🌧️", "temperature": 18}},
                "mood": {"emoji": "🙁", "label": "Sad"},
                "location": {"name": "Other Place"},
            },
        )
        assert second_diary_response.status_code == 200, second_diary_response.text

        home = client.get("/api/app/home", headers=headers)
        assert home.status_code == 200, home.text
        assert any(item["id"] == diary["id"] for item in home.json()["recent"])

        timeline = client.get("/api/app/timeline", headers=headers)
        assert timeline.status_code == 200, timeline.text
        assert any(item["id"] == diary["id"] for item in timeline.json()["items"])

        detail = client.get(f"/api/app/entries/{diary['id']}", headers=headers)
        assert detail.status_code == 200, detail.text
        assert detail.json()["id"] == diary["id"]

        notebook_detail = client.get(f"/api/app/notebooks/{notebook['id']}", headers=headers)
        assert notebook_detail.status_code == 200, notebook_detail.text
        assert notebook_detail.json()["id"] == notebook["id"]

        notebook_entries = client.get(f"/api/app/notebooks/{notebook['id']}/entries", headers=headers)
        assert notebook_entries.status_code == 200, notebook_entries.text
        assert any(item["id"] == diary["id"] for item in notebook_entries.json()["items"])

        search_by_mood = client.get("/api/app/search/entries", headers=headers, params={"mood": "Happy"})
        assert search_by_mood.status_code == 200, search_by_mood.text
        assert [item["id"] for item in search_by_mood.json()] == [diary["id"]]

        search_by_weather = client.get("/api/app/search/entries", headers=headers, params={"weather": "☀️"})
        assert search_by_weather.status_code == 200, search_by_weather.text
        assert [item["id"] for item in search_by_weather.json()] == [diary["id"]]

        share_create = client.post(
            "/api/share/",
            headers=headers,
            json={"notebook_id": notebook["id"], "expires_in_days": 7},
        )
        assert share_create.status_code == 200, share_create.text
        share_token = share_create.json()["token"]

        public_share = client.get(f"/api/app/public/shares/{share_token}")
        assert public_share.status_code == 200, public_share.text
        assert public_share.json()["share_type"] == "notebook"

        public_entries = client.get(f"/api/app/public/shares/{share_token}/entries")
        assert public_entries.status_code == 200, public_entries.text
        assert any(item["id"] == diary["id"] for item in public_entries.json()["items"])


if __name__ == "__main__":
    main()
