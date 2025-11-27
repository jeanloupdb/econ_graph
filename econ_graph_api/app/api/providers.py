from fastapi import APIRouter
from pydantic import BaseModel, Field
import httpx
from typing import Any, Optional
import time

router = APIRouter(prefix="/providers", tags=["providers"])


class ProviderTestIn(BaseModel):
    url: str
    json_path: Optional[str] = Field(default=None, description="Dot path to extract numeric value")
    timeout: float = Field(default=5.0, ge=0.1, le=30.0)


class ProviderTestOut(BaseModel):
    ok: bool
    value: Optional[float] = None
    raw: Any = None
    error: Optional[str] = None


def _extract_dot_path(data: Any, path: Optional[str]) -> Any:
    if not path:
        return data
    cur = data
    for part in path.split('.'):
        if part == '':
            continue
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        elif isinstance(cur, list) and part.isdigit():
            idx = int(part)
            try:
                cur = cur[idx]
            except Exception:
                raise KeyError(f"JSON path index out of range: {part} (len={len(cur)})")
        else:
            # enrich error with available keys to help users
            avail = list(cur.keys()) if isinstance(cur, dict) else (f"list(len={len(cur)})" if isinstance(cur, list) else type(cur).__name__)
            raise KeyError(f"JSON path not found: {part} (available: {avail})")
    return cur


@router.post("/test", response_model=ProviderTestOut)
def test_provider(payload: ProviderTestIn) -> ProviderTestOut:
    try:
        # small retry loop to make tests resilient to slow public APIs
        def _fetch_with_retries(u: str, t: float, retries: int = 2) -> Any:
            attempt = 0
            backoff = 0.6
            last_err: Optional[Exception] = None
            while attempt <= retries:
                try:
                    with httpx.Client(timeout=t) as client:
                        resp = client.get(u)
                        resp.raise_for_status()
                        return resp.json()
                except (httpx.TimeoutException, httpx.TransportError) as e:
                    last_err = e
                    if attempt == retries:
                        break
                    time.sleep(backoff)
                    backoff *= 2
                    attempt += 1
                except Exception as e:
                    # propagate non-timeout errors
                    raise e
            assert last_err is not None
            raise last_err

        data = _fetch_with_retries(payload.url, payload.timeout)
        extracted = _extract_dot_path(data, payload.json_path)
        try:
            fval = float(extracted)
        except Exception:
            return ProviderTestOut(ok=False, raw=data, error=f"Extracted value is not numeric: {extracted}")
        return ProviderTestOut(ok=True, value=fval, raw=data)
    except Exception as e:
        return ProviderTestOut(ok=False, raw=None, error=f"{type(e).__name__}: {e}")
