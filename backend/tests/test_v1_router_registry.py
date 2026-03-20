import unittest
import os

from fastapi.routing import APIRoute


def _route_signatures(router) -> set[tuple[str, tuple[str, ...]]]:
    signatures: set[tuple[str, tuple[str, ...]]] = set()
    for route in router.routes:
        if not isinstance(route, APIRoute):
            continue
        methods = tuple(sorted(method for method in route.methods if method not in {"HEAD", "OPTIONS"}))
        signatures.add((route.path, methods))
    return signatures


class V1RouterRegistryTest(unittest.TestCase):
    def test_v1_router_matches_existing_router_surface(self) -> None:
        for key in ("ALL_PROXY", "HTTPS_PROXY", "HTTP_PROXY", "all_proxy", "https_proxy", "http_proxy"):
            os.environ.pop(key, None)

        from app.api.v1.router import router as v1_router
        from app.modules.identity.auth_router import router as auth_router
        from app.modules.integrations.amap_router import router as amap_router
        from app.modules.integrations.assets_router import router as assets_router
        from app.modules.integrations.karakeep_router import router as karakeep_router
        from app.modules.integrations.proxy_router import router as proxy_router
        from app.modules.journaling.diaries_router import router as diaries_router
        from app.api.v1.users_router import router as users_router
        from app.modules.automation.tasks_router import router as tasks_router
        from app.modules.notebooks.notebooks_router import router as notebooks_router
        from app.modules.discovery.stats_router import router as stats_router

        legacy_routers = []
        from app.modules.sharing.share_router import router as share_router
        from app.modules.journaling.tags_router import router as tags_router
        from app.modules.discovery.timeline_router import router as timeline_router
        from app.modules.discovery.search_router import router as search_router
        from app.modules.integrations.notion_router import router as notion_router
        from app.modules.integrations.media_crawler_router import router as media_crawler_router
        legacy_routes = set().union(*(_route_signatures(router) for router in legacy_routers))
        legacy_routes |= _route_signatures(auth_router)
        legacy_routes |= _route_signatures(amap_router)
        legacy_routes |= _route_signatures(assets_router)
        legacy_routes |= _route_signatures(karakeep_router)
        legacy_routes |= _route_signatures(proxy_router)
        legacy_routes |= _route_signatures(diaries_router)
        legacy_routes |= _route_signatures(users_router)
        legacy_routes |= _route_signatures(tasks_router)
        legacy_routes |= _route_signatures(notebooks_router)
        legacy_routes |= _route_signatures(notion_router)
        legacy_routes |= _route_signatures(share_router)
        legacy_routes |= _route_signatures(tags_router)
        legacy_routes |= _route_signatures(timeline_router)
        legacy_routes |= _route_signatures(search_router)
        legacy_routes |= _route_signatures(stats_router)
        legacy_routes |= _route_signatures(media_crawler_router)
        self.assertEqual(_route_signatures(v1_router), legacy_routes)


if __name__ == "__main__":
    unittest.main()
