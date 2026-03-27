import logging

from openai import APIConnectionError, OpenAI, RateLimitError
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o"

    @retry(
        wait=wait_exponential(multiplier=1, min=1, max=60),
        stop=stop_after_attempt(3),
        retry=lambda retry_state: isinstance(
            retry_state.outcome.exception(), (RateLimitError, APIConnectionError)
        ),
    )
    def parse(self, messages, response_model, temperature=0):
        response = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=messages,
            response_format=response_model,
            temperature=temperature,
        )
        logger.info(
            "Module call: %d in, %d out",
            response.usage.prompt_tokens,
            response.usage.completion_tokens,
        )
        return response.choices[0].message.parsed

    @retry(
        wait=wait_exponential(multiplier=1, min=1, max=60),
        stop=stop_after_attempt(3),
        retry=lambda retry_state: isinstance(
            retry_state.outcome.exception(), (RateLimitError, APIConnectionError)
        ),
    )
    def complete(self, messages, temperature=0):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
        )
        logger.info(
            "Module call: %d in, %d out",
            response.usage.prompt_tokens,
            response.usage.completion_tokens,
        )
        return response.choices[0].message.content


llm = LLMClient()
