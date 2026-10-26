"""Bolna Voice provider implementation for outbound AI voice calls."""

import logging
from typing import Any
import httpx
from app.core.config import settings
from app.core.security import mask_phone
from app.providers.base import CommunicationProvider, ProviderRequest, ProviderResult

logger = logging.getLogger("tara.providers.bolna")


class BolnaVoiceProvider(CommunicationProvider):
    """Voice provider integrating with Bolna conversational AI platform."""

    name = "bolna_voice"
    channel = "voice"

    def __init__(
        self,
        api_key: str | None = None,
        api_base: str | None = None,
        agent_id: str | None = None,
        from_number: str | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        """Initialize Bolna voice provider with API credentials and optional HTTP client."""
        self.api_key = api_key or settings.bolna_api_key
        self.api_base = (api_base or settings.bolna_api_base).rstrip("/")
        self.agent_id = agent_id or settings.bolna_agent_id
        self.from_number = from_number or settings.bolna_from_number
        self._client = client

    async def send(self, request: ProviderRequest) -> ProviderResult:
        """
        Dispatch outbound phone call via Bolna Voice API.

        Enforces timeouts, safe retries (preventing double-dialing), and execution ID extraction.
        """
        # Resolve agent_id: server-side override from metadata allowed, but never user body
        agent_id = request.metadata.get("server_agent_id") or self.agent_id
        from_number = request.metadata.get("server_from_number") or self.from_number

        # Convert all user_data values strictly to strings
        flat_user_data: dict[str, str] = {
            str(k): str(v) for k, v in request.variables.items() if v is not None
        }

        payload: dict[str, Any] = {
            "agent_id": agent_id,
            "recipient_phone_number": request.recipient_phone,
            "from_phone_number": from_number,
            "user_data": flat_user_data,
        }

        masked_phone = mask_phone(request.recipient_phone)
        logger.info(
            "Dispatching Bolna voice call to %s (agent_id: %s)",
            masked_phone,
            agent_id,
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        url = f"{self.api_base}/call"
        timeout = httpx.Timeout(15.0, connect=5.0)

        # Execute dispatch with guarded retry policy
        return await self._dispatch_with_retry(url, headers, payload, timeout, masked_phone)

    async def _dispatch_with_retry(
        self,
        url: str,
        headers: dict[str, str],
        payload: dict[str, Any],
        timeout: httpx.Timeout,
        masked_phone: str,
    ) -> ProviderResult:
        """Execute request with strict safety checks to prevent duplicate dialing."""
        async with self._get_client(timeout) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
            except httpx.ConnectTimeout as exc:
                logger.warning("Connection timeout to Bolna for %s; retrying once: %s", masked_phone, exc)
                return await self._retry_once(client, url, headers, payload, masked_phone)
            except httpx.ConnectError as exc:
                logger.warning("Connection error to Bolna for %s; retrying once: %s", masked_phone, exc)
                return await self._retry_once(client, url, headers, payload, masked_phone)
            except (httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout) as exc:
                # Request may have reached Bolna: DO NOT retry to avoid double-dialing!
                logger.error(
                    "Read/Write timeout to Bolna after dispatch to %s. Flagging ambiguous dispatch: %s",
                    masked_phone,
                    exc,
                )
                return ProviderResult(
                    success=False,
                    status="FAILED",
                    error="ambiguous_dispatch",
                    ambiguous_dispatch=True,
                )
            except httpx.RequestError as exc:
                logger.error("Network request error to Bolna for %s: %s", masked_phone, exc)
                return ProviderResult(
                    success=False,
                    status="FAILED",
                    error=f"Bolna network error: {exc}",
                )

            # Response received from Bolna
            if 200 <= response.status_code < 300:
                return self._parse_success_response(response, masked_phone)

            if 500 <= response.status_code < 600:
                logger.warning(
                    "Bolna 5xx error (%d) for %s; attempting single retry",
                    response.status_code,
                    masked_phone,
                )
                return await self._retry_once(client, url, headers, payload, masked_phone)

            # 4xx client errors - NEVER retry
            logger.error(
                "Bolna client error %d for %s (no retry)",
                response.status_code,
                masked_phone,
            )
            return ProviderResult(
                success=False,
                status="FAILED",
                raw_response=self._safe_json(response),
                error=f"Bolna client error {response.status_code}: {response.text}",
            )

    async def _retry_once(
        self,
        client: httpx.AsyncClient,
        url: str,
        headers: dict[str, str],
        payload: dict[str, Any],
        masked_phone: str,
    ) -> ProviderResult:
        """Retry dispatch a single time after connection or 5xx failure."""
        try:
            response = await client.post(url, headers=headers, json=payload)
            if 200 <= response.status_code < 300:
                return self._parse_success_response(response, masked_phone)
            return ProviderResult(
                success=False,
                status="FAILED",
                raw_response=self._safe_json(response),
                error=f"Bolna server error after retry: {response.status_code} - {response.text}",
            )
        except Exception as exc:
            logger.error("Retry attempt to Bolna failed for %s: %s", masked_phone, exc)
            return ProviderResult(
                success=False,
                status="FAILED",
                error=f"Bolna retry connection failure: {exc}",
            )

    def _parse_success_response(self, response: httpx.Response, masked_phone: str) -> ProviderResult:
        """Defensively extract execution id and raw response from Bolna response."""
        data = self._safe_json(response)

        # TODO(verify-with-docs): Confirm exact Bolna /call response schema for execution ID.
        # Defensively checking 'execution_id', 'run_id', 'id', 'call_id'.
        execution_id = None
        for key in ("execution_id", "run_id", "id", "call_id"):
            val = data.get(key)
            if val:
                execution_id = str(val)
                break

        if not execution_id:
            logger.warning(
                "Bolna returned HTTP 200 for %s but no execution ID was found in response keys",
                masked_phone,
            )

        # TODO(verify-with-docs): Check if Bolna provides a status-polling endpoint GET /call/{id}.
        # Skipping polling as per spec to avoid inventing unverified endpoints.

        return ProviderResult(
            success=True,
            status="DISPATCHED",
            provider_ref=execution_id,
            raw_response=data,
        )

    def _safe_json(self, response: httpx.Response) -> dict[str, Any]:
        """Safely parse response JSON without raising unhandled exceptions."""
        try:
            parsed = response.json()
            if isinstance(parsed, dict):
                return parsed
            return {"data": parsed}
        except Exception:
            return {"raw_text": response.text}

    def _get_client(self, timeout: httpx.Timeout) -> httpx.AsyncClient:
        """Return provided client or instantiate a temporary AsyncClient."""
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=timeout)
