from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NEUROMAP_", env_file=".env", extra="ignore")
    password: str = ""
    data_dir: Path = Path("data")
    database_url: str = "sqlite:///./data/neuromap.db"
    origins: list[str] = ["http://localhost:5173", "http://localhost:4173"]
    upload_bytes: int = 16 * 1024 * 1024
    decoded_bytes: int = 64 * 1024 * 1024
    max_voxels: int = 4_000_000

    def prepare(self):
        if len(self.password) < 12 or self.password == "replace-with-a-unique-long-password":
            raise RuntimeError(
                "Set NEUROMAP_PASSWORD to a unique password of at least 12 characters"
            )
        self.data_dir.mkdir(parents=True, exist_ok=True)
