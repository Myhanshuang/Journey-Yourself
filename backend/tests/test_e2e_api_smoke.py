import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


class ApiSmokeE2ETest(unittest.TestCase):
    def test_core_api_smoke_flow(self) -> None:
        with tempfile.TemporaryDirectory(prefix="journey-e2e-") as temp_dir:
            db_path = Path(temp_dir) / "journey.db"
            env = os.environ.copy()
            for key in ("ALL_PROXY", "HTTPS_PROXY", "HTTP_PROXY", "all_proxy", "https_proxy", "http_proxy"):
                env.pop(key, None)

            env.update(
                {
                    "DATABASE_URL": f"sqlite:///{db_path}",
                    "FIRST_ADMIN_USER": "",
                    "FIRST_ADMIN_PASSWORD": "",
                    "SECRET_KEY": "test-secret-key",
                    "ENCRYPTION_KEY": "test-encryption-key",
                    "PYTHONPATH": str(Path(__file__).resolve().parents[1]),
                }
            )

            result = subprocess.run(
                [sys.executable, "tests/scripts/api_smoke_runner.py"],
                cwd=Path(__file__).resolve().parents[1],
                env=env,
                capture_output=True,
                text=True,
            )

            self.assertEqual(
                result.returncode,
                0,
                msg=f"runner failed\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}",
            )


if __name__ == "__main__":
    unittest.main()
