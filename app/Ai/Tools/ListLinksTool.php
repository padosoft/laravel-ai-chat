<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request as ToolRequest;

class ListLinksTool implements Tool
{
    public function description(): string
    {
        return 'Show a list of useful resource links. Call this when the user asks for links, references, resources, or where to learn more about a topic.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'topic' => $schema->string()->required()
                ->description('The topic the user wants links for (e.g. "regolo", "laravel ai", "padosoft").'),
        ];
    }

    public function handle(ToolRequest $request): string
    {
        $topic = strtolower((string) ($request['topic'] ?? ''));

        $links = match (true) {
            str_contains($topic, 'regolo') || str_contains($topic, 'seeweb') => [
                ['title' => 'Regolo.ai — Italian sovereign AI cloud', 'url' => 'https://regolo.ai',                                                'description' => 'The hosted catalog of 30+ open-weight models in Italy.'],
                ['title' => 'padosoft/laravel-ai-regolo (GitHub)',     'url' => 'https://github.com/padosoft/laravel-ai-regolo',                    'description' => 'The Regolo provider package for laravel/ai.'],
                ['title' => 'Packagist — laravel-ai-regolo',           'url' => 'https://packagist.org/packages/padosoft/laravel-ai-regolo',         'description' => 'Composer package, install with one line.'],
            ],
            str_contains($topic, 'padosoft') => [
                ['title' => 'Padosoft',              'url' => 'https://padosoft.com',                                  'description' => 'Italian software house behind this stack.'],
                ['title' => 'AskMyDocs',             'url' => 'https://github.com/lopadova/AskMyDocs',                 'description' => 'Enterprise RAG chat on Laravel — sister project.'],
                ['title' => 'laravel-flow',          'url' => 'https://github.com/padosoft/laravel-flow',              'description' => 'Saga / workflow orchestration for Laravel.'],
                ['title' => 'eval-harness',          'url' => 'https://github.com/padosoft/eval-harness',              'description' => 'RAG + agent evaluation harness.'],
            ],
            default => [
                ['title' => 'laravel/ai documentation',          'url' => 'https://laravel.com/docs/ai-sdk',                    'description' => 'Official SDK reference.'],
                ['title' => 'Vercel AI SDK',                      'url' => 'https://ai-sdk.dev',                                 'description' => 'TypeScript / React UI primitives for AI chat.'],
                ['title' => 'padosoft/laravel-ai-regolo',         'url' => 'https://github.com/padosoft/laravel-ai-regolo',      'description' => 'Default Regolo provider used by this demo.'],
                ['title' => 'Regolo.ai',                          'url' => 'https://regolo.ai',                                  'description' => 'Italian sovereign AI cloud.'],
            ],
        };

        return (string) json_encode([
            '__artifact' => 'links',
            'topic'      => $topic,
            'links'      => $links,
        ]);
    }
}
