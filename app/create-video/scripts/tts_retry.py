"""edge-tts 逐次重试助手。

微软 Edge TTS 端点会偶发返回"无音频"（NoAudioReceived）或握手期异常，
而单次异常不足以判死整个 tts 阶段：本模块负责新建连接、指数退避重试，
并在每次失败后删除半成品文件，避免坏产物被后续复用当成有效音频。
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

DEFAULT_ATTEMPTS = int(os.environ.get("EDGE_TTS_MAX_RETRIES", "3"))
DEFAULT_BASE_DELAY = float(os.environ.get("EDGE_TTS_RETRY_BASE_DELAY", "1.0"))


def _discard(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except OSError:
        # 删不掉就让它留在下次尝试里被覆盖；不因此放弃重试
        pass


async def call_with_retry(produce, *, out_path, attempts=DEFAULT_ATTEMPTS,
                          base_delay=DEFAULT_BASE_DELAY, sleep_fn=asyncio.sleep):
    """Repeatedly await ``produce(attempt)`` until it succeeds.

    A fresh connection must be created inside ``produce`` on every call so an
    expired session token cannot be reused across attempts.
    """
    errors = []
    for attempt in range(1, attempts + 1):
        try:
            return await produce(attempt)
        except Exception as exc:  # noqa: BLE001 - 上游异常类型不稳定，统一按可重试处理
            _discard(out_path)
            errors.append(f"第 {attempt} 次 {type(exc).__name__}: {exc}")
            if attempt < attempts:
                await sleep_fn(base_delay * (2 ** (attempt - 1)))
    raise RuntimeError(f"旁白生成失败（共尝试 {attempts} 次）：" + "；".join(errors))


async def _selftest() -> None:
    import tempfile

    with tempfile.TemporaryDirectory() as work:
        target = Path(work) / "a.mp3"
        delays: list[float] = []

        async def record(delay: float) -> None:
            delays.append(delay)

        # 1) 前两次失败、第三次成功：应返回结果、按 1s/2s 退避、失败后不留半成品
        calls = {"n": 0}

        async def flaky(_attempt: int) -> str:
            calls["n"] += 1
            target.write_bytes(b"partial")
            if calls["n"] < 3:
                raise RuntimeError("NoAudioReceived")
            return "ok"

        assert await call_with_retry(flaky, out_path=target, attempts=3, sleep_fn=record) == "ok"
        assert calls["n"] == 3, calls
        assert delays == [1.0, 2.0], delays
        assert target.exists(), "成功那次应保留文件"

        # 2) 每次失败都要清掉半成品，否则断点续跑会把坏文件当有效音频复用
        target.unlink()

        async def always_fail(_attempt: int) -> None:
            target.write_bytes(b"broken")
            raise ValueError("无法读取有效音频时长")

        try:
            await call_with_retry(always_fail, out_path=target, attempts=2, sleep_fn=record)
        except RuntimeError as exc:
            assert "共尝试 2 次" in str(exc), exc
            assert "第 2 次 ValueError" in str(exc), exc
        else:
            raise AssertionError("全部失败时必须抛出 RuntimeError")
        assert not target.exists(), "失败后不得留下半成品"
        assert delays == [1.0, 2.0, 1.0], delays

        # 3) 首次即成功不应产生任何退避
        target.write_bytes(b"x")
        delays.clear()

        async def immediate(_attempt: int) -> int:
            return 42

        assert await call_with_retry(immediate, out_path=target, attempts=3, sleep_fn=record) == 42
        assert delays == [], delays
        assert target.exists()

    print("SELFTEST OK")


if __name__ == "__main__":
    if "--selftest" in sys.argv[1:]:
        asyncio.run(_selftest())
    else:
        print(__doc__)
