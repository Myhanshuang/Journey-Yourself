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


class IdentityAuthRouterCompatibilityTest(unittest.TestCase):
    def test_identity_auth_router_keeps_legacy_auth_surface(self) -> None:
        from app.modules.identity.auth_router import router as module_auth_router

        self.assertEqual(
            _route_signatures(module_auth_router),
            {
                ("/api/auth/register", ("POST",)),
                ("/api/auth/login", ("POST",)),
            },
        )


if __name__ == "__main__":
    unittest.main()
