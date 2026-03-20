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


class JournalingTagsRouterCompatibilityTest(unittest.TestCase):
    def test_journaling_tags_router_keeps_legacy_tags_surface(self) -> None:
        from app.modules.journaling.tags_router import router as module_tags_router

        self.assertEqual(_route_signatures(module_tags_router), {("/api/tags/", ("GET",))})


if __name__ == "__main__":
    unittest.main()
