<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request as ToolRequest;

class ShowImageTool implements Tool
{
    public function description(): string
    {
        return 'Show an inline image artifact. Call this whenever the user asks to see/show/display a picture, photo, image, or visual of something.';
    }

    public function schema(JsonSchema $schema): array
    {
        return $schema->object()
            ->property('subject', $schema->string()->required()
                ->description('Short, vivid subject of the image (e.g. "Colosseum at sunset", "Italian espresso macchiato").'))
            ->property('caption', $schema->string()
                ->description('Optional caption rendered below the image.'))
            ->toArray();
    }

    public function handle(ToolRequest $request): string
    {
        $subject = (string) ($request['subject'] ?? 'demo');
        $caption = (string) ($request['caption'] ?? '');

        // Deterministic stub via Picsum, seeded on the subject.
        $seed = substr(md5($subject), 0, 8);

        return (string) json_encode([
            '__artifact' => 'image',
            'url'        => "https://picsum.photos/seed/{$seed}/800/450",
            'alt'        => $subject,
            'caption'    => $caption !== '' ? $caption : $subject,
        ]);
    }
}
