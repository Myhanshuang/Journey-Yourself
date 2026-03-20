import unittest


class JournalingHelpersTest(unittest.TestCase):
    def test_walk_content_counts_words_and_images(self) -> None:
        from app.modules.journaling.helpers.content_stats import walk_content

        content = {
            "type": "doc",
            "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "Hello 世界"}]},
                {"type": "image", "attrs": {"src": "/uploads/a.png"}},
                {
                    "type": "blockquote",
                    "content": [
                        {"type": "paragraph", "content": [{"type": "text", "text": "Second line"}]},
                        {"type": "image", "attrs": {"src": "/uploads/b.png"}},
                    ],
                },
            ],
        }

        self.assertEqual(walk_content(content), (17, 2))


if __name__ == "__main__":
    unittest.main()
