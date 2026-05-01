import { test, expect, type Route } from '@playwright/test';

/**
 * End-to-end smoke test for the demo chat. We intercept the streaming
 * endpoint with a synthetic Vercel-AI-SDK-protocol response so the
 * test runs offline without a real Regolo API key.
 */

const FAKE_STREAM_BODY = [
    'data: {"type":"start","messageId":"m1"}',
    'data: {"type":"text-start","id":"m1"}',
    'data: {"type":"text-delta","id":"m1","delta":"Ecco la foto:"}',
    'data: {"type":"text-end","id":"m1"}',
    'data: {"type":"tool-input-available","toolCallId":"c1","toolName":"ShowImageTool","input":{"subject":"Colosseum"}}',
    'data: {"type":"tool-output-available","toolCallId":"c1","output":"{\\"__artifact\\":\\"image\\",\\"url\\":\\"https://picsum.photos/seed/abc/800/450\\",\\"alt\\":\\"Colosseum\\",\\"caption\\":\\"Test image\\"}"}',
    'data: {"type":"finish"}',
    'data: [DONE]',
    '',
].join('\n\n');

async function fulfillSynthetic(route: Route) {
    await route.fulfill({
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'x-vercel-ai-ui-message-stream': 'v1',
        },
        body: FAKE_STREAM_BODY,
    });
}

test.describe('Laravel AI Chat — demo smoke', () => {
    test('home screen renders the welcome state with 5 suggested prompts', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByText('Cosa vuoi vedere oggi?')).toBeVisible();

        await expect(page.getByTestId('suggested-prompt-foto-del-colosseo')).toBeVisible();
        await expect(page.getByTestId('suggested-prompt-documento-nda')).toBeVisible();
        await expect(page.getByTestId('suggested-prompt-link-su-regolo')).toBeVisible();
        await expect(page.getByTestId('suggested-prompt-snippet-php')).toBeVisible();
        await expect(page.getByTestId('suggested-prompt-tabella-modelli')).toBeVisible();
    });

    test('clicking a suggested prompt streams an assistant reply with an inline image artifact', async ({
        page,
    }) => {
        // Intercept the streaming endpoint with a synthetic SSE body
        // that finishes with an image tool-output. This proves the
        // wiring (composer → stream → artifact rendering) without
        // touching the real Regolo API.
        await page.route('**/api/chat/stream', fulfillSynthetic);

        await page.goto('/');

        await page.getByTestId('suggested-prompt-foto-del-colosseo').click();

        // The user bubble appears immediately (optimistic).
        await expect(page.getByText('Mostrami una foto del Colosseo al tramonto')).toBeVisible();

        // The assistant text bubble streams in.
        await expect(page.getByText('Ecco la foto:')).toBeVisible();

        // The image artifact renders inline once the tool-output lands.
        const imageArtifact = page.getByTestId('artifact-image');
        await expect(imageArtifact).toBeVisible();
        await expect(imageArtifact.locator('img')).toHaveAttribute(
            'src',
            'https://picsum.photos/seed/abc/800/450',
        );
    });
});
