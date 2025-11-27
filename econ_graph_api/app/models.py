from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Tuple

Status = str  # "unknown" | "observed" | "imposed" | "implied" | "invalid"

@dataclass
class Node:
    id: str
    label: str
    value: Optional[float] = None
    unit: Optional[str] = None
    plausible_range: Optional[Tuple[float, float]] = None
    status: Status = "unknown"
    confidence: float = 1.0

    def is_within_range(self) -> Optional[bool]:
        if self.value is None or self.plausible_range is None:
            return None
        lo, hi = self.plausible_range
        return lo <= float(self.value) <= hi
