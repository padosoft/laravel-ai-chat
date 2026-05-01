import { useMemo, useRef } from 'react';
import { useChat as sdkUseChat, type UseChatHelpers } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';

/**
 * Read the URL-decoded XSRF-TOKEN cookie value (set automatically by
 * Laravel on every web response) so we can echo it back in the
 * `X-XSRF-TOKEN` header on the streaming POST. Without this header,
 * Laravel's CSRF middleware rejects the request with 419.
 */
export function readXsrfCookie(): string | null {
    if (typeof document === 'undefined') {
        return null;
    }
    const match = document.cookie
        .split(';')
        .map((row) => row.trim())
        .find((row) => row.startsWith('XSRF-TOKEN='));
    if (match === undefined) {
        return null;
    }
    return decodeURIComponent(match.slice('XSRF-TOKEN='.length));
}

/**
 * Adapter hook over `@ai-sdk/react`'s `useChat()` that targets this
 * demo's `POST /api/chat/stream` endpoint. Three concerns wrapped:
 *
 *   1. Custom transport with `prepareSendMessagesRequest` that re-shapes
 *      the SDK default body `{ messages, ... }` → `{ content,
 *      conversation_id }` to match the controller's validation.
 *   2. CSRF: reads the `XSRF-TOKEN` cookie and forwards it as
 *      `X-XSRF-TOKEN` so Laravel's session-based CSRF middleware
 *      lets the POST through.
 *   3. Conversation id capture: the controller's response carries
 *      `conversationId` via the `withinConversation()` envelope; the
 *      `onData` callback intercepts the data part and lifts the id
 *      back into React state so subsequent turns target the same
 *      thread.
 */
export function useChatStream(
    conversationId: number | null,
    onConversationIdAssigned?: (id: number) => void,
): UseChatHelpers<UIMessage> {
    // Hold the latest assigned id in a ref so the transport (memoised
    // on the initial conversationId) reads the freshest value without
    // tearing down between turns.
    const conversationIdRef = useRef<number | null>(conversationId);
    conversationIdRef.current = conversationId;

    const onConversationIdRef = useRef(onConversationIdAssigned);
    onConversationIdRef.current = onConversationIdAssigned;

    const transport = useMemo(
        () =>
            new DefaultChatTransport<UIMessage>({
                api: '/api/chat/stream',
                credentials: 'same-origin',
                prepareSendMessagesRequest: ({ messages }) => {
                    const last = messages[messages.length - 1];
                    const content =
                        last?.parts
                            ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                            .map((p) => p.text)
                            .join('') ?? '';

                    const headers: Record<string, string> = {
                        Accept: 'text/event-stream, application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    };
                    const xsrf = readXsrfCookie();
                    if (xsrf !== null) {
                        headers['X-XSRF-TOKEN'] = xsrf;
                    }

                    return {
                        body: {
                            content,
                            conversation_id: conversationIdRef.current ?? undefined,
                        },
                        headers,
                    };
                },
            }),
        [],
    );

    return sdkUseChat<UIMessage>({
        transport,
        onData: (dataPart) => {
            // The Vercel UI Message Stream protocol embeds metadata
            // sent by the backend's `withinConversation()` envelope as
            // a "metadata" data-part. We watch for the conversation id
            // and lift it into React state so the next sendMessage
            // targets the right thread.
            if (
                typeof dataPart === 'object' &&
                dataPart !== null &&
                'data' in dataPart &&
                typeof (dataPart as { data?: unknown }).data === 'object'
            ) {
                const data = (dataPart as { data: Record<string, unknown> }).data;
                const id =
                    typeof data.conversationId === 'string'
                        ? Number(data.conversationId)
                        : typeof data.conversationId === 'number'
                          ? data.conversationId
                          : null;
                if (id !== null && Number.isFinite(id) && id !== conversationIdRef.current) {
                    onConversationIdRef.current?.(id);
                }
            }
        },
    });
}
