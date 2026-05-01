import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the laravel-ai-chat demo.
 *
 * The `webServer` block boots a fresh `php artisan serve` and a Vite
 * build before the tests run, so the e2e suite is fully self-contained
 * — no need for the developer to start anything by hand.
 */
export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [['list']],
    use: {
        baseURL: 'http://127.0.0.1:8765',
        trace: 'retain-on-failure',
        viewport: { width: 1280, height: 800 },
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        // We deliberately use PHP's built-in server (`php -S`) instead
        // of `php artisan serve` because the latter is flaky on some
        // Herd / Windows setups (intermittent "Failed to listen
        // (reason: ?)"). Run `npm run build` and `php artisan migrate`
        // ONCE manually before `npm run e2e` — the README's Testing
        // section spells this out.
        command: 'php -S 127.0.0.1:8765 -t public public/_devserver.php',
        url: 'http://127.0.0.1:8765',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
