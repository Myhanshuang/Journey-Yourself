import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


class CoverImageHelperTest(unittest.TestCase):
    def test_extracts_first_local_image_path(self) -> None:
        from app.modules.journaling.helpers.cover_image import extract_first_image_src

        content = {
            "type": "doc",
            "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "hello"}]},
                {"type": "image", "attrs": {"src": "/uploads/example.jpg"}},
            ],
        }

        self.assertEqual(extract_first_image_src(content), "/uploads/example.jpg")

    def test_caches_remote_image_and_returns_local_cover_path(self) -> None:
        from app.modules.journaling.helpers.cover_image import cache_remote_cover_image

        class FakeResponse:
            status_code = 200
            headers = {"content-type": "image/png"}
            content = b"png-bytes"

            def raise_for_status(self) -> None:
                return None

        with tempfile.TemporaryDirectory() as temp_dir:
            cache_dir = Path(temp_dir)
            with patch("app.modules.journaling.helpers.cover_image.httpx.get", return_value=FakeResponse()) as get_mock:
                result = cache_remote_cover_image("https://example.com/cover.png", cache_dir=cache_dir)

            self.assertIsNotNone(result)
            self.assertTrue(result.startswith("/cover_cache/"))
            local_file = cache_dir / result.removeprefix("/cover_cache/")
            self.assertTrue(local_file.exists())
            self.assertEqual(local_file.read_bytes(), b"png-bytes")
            get_mock.assert_called_once()

    def test_entry_card_schema_includes_cover_image_url(self) -> None:
        from app.api.app.schemas import EntryCard

        self.assertIn("cover_image_url", EntryCard.model_fields)


if __name__ == "__main__":
    unittest.main()
