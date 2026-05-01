<?php

/*
 |--------------------------------------------------------------------------
 | PHP Built-in Server Router (Laravel front-controller fallback)
 |--------------------------------------------------------------------------
 |
 | Used by `php -S 127.0.0.1:8765 -t public public/_devserver.php` and by
 | the Playwright e2e webServer in playwright.config.ts. Static files
 | inside public/ pass through; everything else routes to public/index.php
 | so Laravel handles the request.
 |
 | Lives inside public/ so PHP's built-in server, with `-t public`,
 | resolves both this script and the static asset paths under the same
 | docroot.
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '');

if ($uri !== '/' && file_exists(__DIR__.$uri)) {
    return false;
}

require_once __DIR__.'/index.php';
