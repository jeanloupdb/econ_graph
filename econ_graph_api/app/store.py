from __future__ import annotations
from typing import Dict, Iterable
from .models import Node

class NodeStore:
    def __init__(self) -> None:
        self._nodes: Dict[str, Node] = {}

    def all(self) -> Iterable[Node]:
        return list(self._nodes.values())

    def get(self, id: str) -> Node | None:
        return self._nodes.get(id)

    def upsert(self, node: Node) -> Node:
        self._nodes[node.id] = node
        return node

    def delete(self, id: str) -> bool:
        return self._nodes.pop(id, None) is not None

store = NodeStore()
