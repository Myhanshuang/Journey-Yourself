import os
import unittest
from importlib import import_module

from fastapi.routing import APIRoute


def _route_signatures(router) -> set[tuple[str, tuple[str, ...]]]:
    signatures: set[tuple[str, tuple[str, ...]]] = set()
    for route in router.routes:
        if not isinstance(route, APIRoute):
            continue
        methods = tuple(sorted(method for method in route.methods if method not in {"HEAD", "OPTIONS"}))
        signatures.add((route.path, methods))
    return signatures


class UsersDomainSplitTest(unittest.TestCase):
    def test_identity_integrations_and_system_admin_split_expected_users_paths(self) -> None:
        for key in ("ALL_PROXY", "HTTPS_PROXY", "HTTP_PROXY", "all_proxy", "https_proxy", "http_proxy"):
            os.environ.pop(key, None)

        identity_users_router = import_module("app.modules.identity.users_router").router
        immich_settings_router = import_module("app.modules.integrations.immich_settings_router").router
        karakeep_settings_router = import_module("app.modules.integrations.karakeep_settings_router").router
        ai_settings_router = import_module("app.modules.integrations.ai_settings_router").router
        geo_settings_router = import_module("app.modules.integrations.geo_settings_router").router
        notion_settings_router = import_module("app.modules.integrations.notion_settings_router").router
        system_admin_router = import_module("app.modules.system_admin.router").router

        self.assertEqual(
            _route_signatures(identity_users_router),
            {
                ("/api/users/", ("POST",)),
                ("/api/users/", ("GET",)),
                ("/api/users/{user_id}/role", ("PATCH",)),
                ("/api/users/{user_id}/password", ("PATCH",)),
                ("/api/users/{user_id}", ("DELETE",)),
                ("/api/users/me", ("GET",)),
                ("/api/users/me", ("PATCH",)),
                ("/api/users/me/password", ("PATCH",)),
            },
        )

        self.assertEqual(_route_signatures(immich_settings_router), {("/api/users/me/immich", ("PATCH",))})
        self.assertEqual(_route_signatures(karakeep_settings_router), {("/api/users/me/karakeep", ("PATCH",))})
        self.assertEqual(_route_signatures(ai_settings_router), {("/api/users/me/ai", ("PATCH",))})
        self.assertEqual(_route_signatures(geo_settings_router), {("/api/users/me/geo", ("PATCH",))})
        self.assertEqual(_route_signatures(notion_settings_router), {("/api/users/me/notion", ("PATCH",))})
        self.assertEqual(
            _route_signatures(system_admin_router),
            {
                ("/api/users/system/export", ("GET",)),
                ("/api/users/system/import", ("POST",)),
                ("/api/users/system/orphan-files", ("GET",)),
                ("/api/users/system/orphan-files", ("DELETE",)),
            },
        )


if __name__ == "__main__":
    unittest.main()
