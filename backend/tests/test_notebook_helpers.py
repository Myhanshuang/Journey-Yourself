import unittest


class NotebookHelpersTest(unittest.TestCase):
    def test_build_default_cover_uses_name_seed(self) -> None:
        from app.modules.notebooks.helpers.default_cover import build_default_cover

        self.assertEqual(
            build_default_cover("My Notebook"),
            "https://picsum.photos/seed/My Notebook/800/1000",
        )

    def test_update_stats_snapshot_applies_word_and_entry_deltas(self) -> None:
        from app.modules.notebooks.helpers.stats_snapshot import update_stats_snapshot

        snapshot = {"total_words": 10, "total_entries": 3}
        self.assertEqual(
            update_stats_snapshot(snapshot, words_delta=5, entries_delta=-1),
            {"total_words": 15, "total_entries": 2},
        )
        self.assertEqual(
            update_stats_snapshot(snapshot, words_delta=-50, entries_delta=-10),
            {"total_words": 0, "total_entries": 0},
        )


if __name__ == "__main__":
    unittest.main()
