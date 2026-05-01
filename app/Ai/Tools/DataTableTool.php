<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request as ToolRequest;

class DataTableTool implements Tool
{
    public function description(): string
    {
        return 'Show a data table artifact. Call this when the user asks for a table, comparison, list, ranking, or top-N of something.';
    }

    public function schema(JsonSchema $schema): array
    {
        return $schema->object()
            ->property('topic', $schema->string()->required()
                ->description('What the table should show (e.g. "regolo models", "laravel ai providers").'))
            ->toArray();
    }

    public function handle(ToolRequest $request): string
    {
        $topic = strtolower((string) ($request['topic'] ?? ''));

        [$columns, $rows] = match (true) {
            str_contains($topic, 'provider') => [
                ['Provider', 'Built-in', 'Italian hosting', 'Streaming'],
                [
                    ['OpenAI',          'yes', 'no',  'yes'],
                    ['Anthropic',       'yes', 'no',  'yes'],
                    ['Gemini',          'yes', 'no',  'yes'],
                    ['Mistral',         'yes', 'no',  'yes'],
                    ['Regolo (this demo)', 'no — via padosoft/laravel-ai-regolo', 'yes', 'yes'],
                ],
            ],
            default => [
                ['Model', 'Family', 'Context', 'Hosted in'],
                [
                    ['Llama-3.3-70B-Instruct',  'Meta Llama',     '128k', 'Italy'],
                    ['Llama-3.1-8B-Instruct',   'Meta Llama',     '128k', 'Italy'],
                    ['Qwen3-Embedding-8B',      'Alibaba Qwen',   '8k',   'Italy'],
                    ['Qwen-Image',              'Alibaba Qwen',   'n/a',  'Italy'],
                    ['faster-whisper-large-v3', 'OpenAI Whisper', 'n/a',  'Italy'],
                ],
            ],
        };

        return (string) json_encode([
            '__artifact' => 'table',
            'topic'      => $topic,
            'columns'    => $columns,
            'rows'       => $rows,
        ]);
    }
}
