"""
Pytest configuration and fixtures
"""
import pytest
import sys
import os

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(scope="session")
def event_loop_policy():
    """Configure asyncio event loop for tests."""
    import asyncio
    return asyncio.DefaultEventLoopPolicy()
