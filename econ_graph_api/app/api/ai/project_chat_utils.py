def proto_to_dict(obj):
    """Recursively convert protobuf RepeatedComposite/MapComposite to native types."""
    if hasattr(obj, "items"):  # MapComposite
        return {k: proto_to_dict(v) for k, v in obj.items()}
    if hasattr(obj, "__iter__") and not isinstance(obj, (str, bytes)):  # RepeatedComposite
        return [proto_to_dict(v) for v in obj]
    return obj
