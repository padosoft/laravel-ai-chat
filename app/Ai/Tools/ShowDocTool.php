<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request as ToolRequest;

class ShowDocTool implements Tool
{
    public function description(): string
    {
        return 'Show a document card artifact (PDF / contract / agreement preview). Call this when the user asks for a document, PDF, report, contract, or similar file reference.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'title'   => $schema->string()->required()
                ->description('Short title of the document.'),
            'snippet' => $schema->string()
                ->description('Short preview snippet (1-2 sentences) describing the document content.'),
            'pages'   => $schema->integer()
                ->description('Number of pages. Defaults to 4.'),
        ];
    }

    public function handle(ToolRequest $request): string
    {
        return (string) json_encode([
            '__artifact' => 'doc',
            'title'      => (string) ($request['title'] ?? 'Demo document'),
            'mime'       => 'application/pdf',
            'pages'      => (int) ($request['pages'] ?? 4),
            'snippet'    => (string) ($request['snippet'] ?? 'Demo document — full content not available in this demo.'),
            'fakeUrl'    => '#demo-doc',
        ]);
    }
}
