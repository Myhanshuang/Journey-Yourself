import inspect
import unittest

from fastapi.routing import APIRoute


def _route_signatures(router) -> set[tuple[str, tuple[str, ...]]]:
    signatures: set[tuple[str, tuple[str, ...]]] = set()
    for route in router.routes:
        if not isinstance(route, APIRoute):
            continue
        methods = tuple(sorted(method for method in route.methods if method not in {"HEAD", "OPTIONS"}))
        signatures.add((route.path, methods))
    return signatures


class AppQueryRouterTest(unittest.TestCase):
    def test_app_query_router_exposes_home_and_timeline(self) -> None:
        from app.api.app.router import router

        routes = _route_signatures(router)
        self.assertIn(("/api/app/home", ("GET",)), routes)
        self.assertIn(("/api/app/timeline", ("GET",)), routes)
        self.assertIn(("/api/app/entries/{entry_id}", ("GET",)), routes)
        self.assertIn(("/api/app/notebooks/{notebook_id}", ("GET",)), routes)
        self.assertIn(("/api/app/search/entries", ("GET",)), routes)
        self.assertIn(("/api/app/search/bookmarks", ("GET",)), routes)
        self.assertIn(("/api/app/stats", ("GET",)), routes)
        self.assertIn(("/api/app/public/shares/{token}", ("GET",)), routes)
        self.assertIn(("/api/app/notebooks/{notebook_id}/entries", ("GET",)), routes)
        self.assertIn(("/api/app/public/shares/{token}/entries", ("GET",)), routes)

    def test_timeline_route_accepts_notebook_filter(self) -> None:
        from app.api.app.timeline_router import get_timeline_payload

        self.assertIn("notebook_id", inspect.signature(get_timeline_payload).parameters)


if __name__ == "__main__":
    unittest.main()
