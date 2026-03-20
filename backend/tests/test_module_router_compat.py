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


class ModuleRouterCompatibilityTest(unittest.TestCase):
    ROUTER_MAPPINGS = [
    ]

    def test_module_router_matches_legacy_surface(self) -> None:
        for key in ("ALL_PROXY", "HTTPS_PROXY", "HTTP_PROXY", "all_proxy", "https_proxy", "http_proxy"):
            os.environ.pop(key, None)

        for module_path, legacy_path in self.ROUTER_MAPPINGS:
            with self.subTest(module_path=module_path):
                module_router = import_module(module_path).router
                legacy_router = import_module(legacy_path).router
                self.assertEqual(_route_signatures(module_router), _route_signatures(legacy_router))

    def test_discovery_stats_router_keeps_legacy_stats_route(self) -> None:
        module_router = import_module("app.modules.discovery.stats_router").router
        self.assertEqual(_route_signatures(module_router), {("/api/stats/", ("GET",))})

    def test_discovery_search_router_keeps_legacy_search_route(self) -> None:
        module_router = import_module("app.modules.discovery.search_router").router
        self.assertEqual(_route_signatures(module_router), {("/api/search/unified", ("GET",))})

    def test_discovery_timeline_router_keeps_legacy_timeline_route(self) -> None:
        module_router = import_module("app.modules.discovery.timeline_router").router
        self.assertEqual(_route_signatures(module_router), {("/api/timeline/", ("GET",))})

    def test_notebooks_router_keeps_legacy_notebook_routes(self) -> None:
        module_router = import_module("app.modules.notebooks.notebooks_router").router
        self.assertEqual(
            _route_signatures(module_router),
            {
                ("/api/notebooks/", ("GET",)),
                ("/api/notebooks/", ("POST",)),
                ("/api/notebooks/{notebook_id}", ("GET",)),
                ("/api/notebooks/{notebook_id}", ("PUT",)),
                ("/api/notebooks/{notebook_id}", ("DELETE",)),
                ("/api/notebooks/drafts/ensure", ("GET",)),
            },
        )

    def test_sharing_router_keeps_legacy_share_routes(self) -> None:
        module_router = import_module("app.modules.sharing.share_router").router
        self.assertEqual(
            _route_signatures(module_router),
            {
                ("/api/share/", ("GET",)),
                ("/api/share/", ("POST",)),
                ("/api/share/{share_id}", ("PATCH",)),
                ("/api/share/{share_id}", ("DELETE",)),
                ("/api/share/{token}", ("GET",)),
            },
        )

    def test_integrations_proxy_router_keeps_legacy_proxy_routes(self) -> None:
        module_router = import_module("app.modules.integrations.proxy_router").router
        self.assertEqual(
            _route_signatures(module_router),
            {
                ("/api/proxy/immich/assets", ("GET",)),
                ("/api/proxy/immich/albums", ("GET",)),
                ("/api/proxy/immich/album/{album_id}/assets", ("GET",)),
                ("/api/proxy/immich/import", ("POST",)),
                ("/api/proxy/immich/asset/{asset_id}", ("GET",)),
                ("/api/proxy/immich/info/{asset_id}", ("GET",)),
                ("/api/proxy/immich/original/{asset_id}", ("GET",)),
                ("/api/proxy/immich/video/{asset_id}", ("GET",)),
            },
        )

    def test_integrations_assets_router_keeps_legacy_asset_routes(self) -> None:
        module_router = import_module("app.modules.integrations.assets_router").router
        self.assertEqual(
            _route_signatures(module_router),
            {
                ("/api/assets/upload-cover", ("POST",)),
                ("/api/assets/upload-video", ("POST",)),
                ("/api/assets/upload-audio", ("POST",)),
                ("/api/assets/upload-media", ("POST",)),
            },
        )

    def test_integrations_amap_router_keeps_legacy_amap_routes(self) -> None:
        module_router = import_module("app.modules.integrations.amap_router").router
        self.assertEqual(
            _route_signatures(module_router),
            {
                ("/api/proxy/amap/regeo", ("GET",)),
                ("/api/proxy/amap/search", ("GET",)),
                ("/api/proxy/amap/weather", ("GET",)),
            },
        )

    def test_integrations_karakeep_router_keeps_legacy_karakeep_routes(self) -> None:
        module_router = import_module("app.modules.integrations.karakeep_router").router
        self.assertEqual(_route_signatures(module_router), {("/api/proxy/karakeep/bookmarks", ("GET",))})

    def test_journaling_diaries_router_keeps_legacy_diary_routes(self) -> None:
        module_router = import_module("app.modules.journaling.diaries_router").router
        self.assertEqual(
            _route_signatures(module_router),
            {
                ("/api/diaries/", ("POST",)),
                ("/api/diaries/recent", ("GET",)),
                ("/api/diaries/pinned", ("GET",)),
                ("/api/diaries/last-year-today", ("GET",)),
                ("/api/diaries/notebook/{notebook_id}", ("GET",)),
                ("/api/diaries/{diary_id}", ("GET",)),
                ("/api/diaries/{diary_id}", ("PUT",)),
                ("/api/diaries/{diary_id}", ("DELETE",)),
                ("/api/diaries/{diary_id}/toggle-pin", ("POST",)),
            },
        )

    def test_automation_tasks_router_keeps_legacy_task_routes(self) -> None:
        module_router = import_module("app.modules.automation.tasks_router").router
        self.assertEqual(
            _route_signatures(module_router),
            {
                ("/api/tasks/trigger-daily-summary", ("POST",)),
                ("/api/tasks/", ("GET",)),
                ("/api/tasks/{task_name}", ("PATCH",)),
                ("/api/tasks/{task_name}/toggle", ("PATCH",)),
            },
        )

    def test_integrations_notion_router_keeps_legacy_notion_routes(self) -> None:
        module_router = import_module("app.modules.integrations.notion_router").router
        self.assertEqual(
            _route_signatures(module_router),
            {
                ("/api/proxy/notion/search", ("GET",)),
                ("/api/proxy/notion/page/{page_id}", ("GET",)),
                ("/api/proxy/notion/block/{block_id}/children", ("GET",)),
            },
        )

    def test_integrations_media_crawler_router_keeps_legacy_crawler_routes(self) -> None:
        for key in ("ALL_PROXY", "HTTPS_PROXY", "HTTP_PROXY", "all_proxy", "https_proxy", "http_proxy"):
            os.environ.pop(key, None)
        module_router = import_module("app.modules.integrations.media_crawler_router").router
        self.assertEqual(
            _route_signatures(module_router),
            {
                ("/api/crawler/check", ("GET",)),
                ("/api/crawler/status", ("GET",)),
                ("/api/crawler/xhs", ("POST",)),
                ("/api/crawler/xhs/{note_id}", ("GET",)),
                ("/api/crawler/bili", ("POST",)),
                ("/api/crawler/bili/{video_id}", ("GET",)),
            },
        )


if __name__ == "__main__":
    unittest.main()
