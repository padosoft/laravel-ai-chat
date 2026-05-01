<?php

namespace Tests\Unit;

use App\Ai\Tools\CodeSnippetTool;
use App\Ai\Tools\DataTableTool;
use App\Ai\Tools\ListLinksTool;
use App\Ai\Tools\ShowDocTool;
use App\Ai\Tools\ShowImageTool;
use Laravel\Ai\Tools\Request as ToolRequest;
use Tests\TestCase;

class ToolsTest extends TestCase
{
    public function test_show_image_tool_emits_an_image_artifact_payload(): void
    {
        $tool = new ShowImageTool();
        $output = $tool->handle(new ToolRequest([
            'subject' => 'Colosseum at sunset',
            'caption' => 'A wide shot of the Roman Colosseum at golden hour.',
        ]));

        $payload = json_decode($output, true);

        $this->assertSame('image', $payload['__artifact']);
        $this->assertStringContainsString('picsum.photos', $payload['url']);
        $this->assertSame('Colosseum at sunset', $payload['alt']);
        $this->assertSame('A wide shot of the Roman Colosseum at golden hour.', $payload['caption']);
    }

    public function test_show_image_tool_seeds_url_deterministically_from_subject(): void
    {
        $tool = new ShowImageTool();
        $a = json_decode($tool->handle(new ToolRequest(['subject' => 'Rome'])), true);
        $b = json_decode($tool->handle(new ToolRequest(['subject' => 'Rome'])), true);
        $c = json_decode($tool->handle(new ToolRequest(['subject' => 'Milan'])), true);

        $this->assertSame($a['url'], $b['url'], 'same subject must produce the same image url');
        $this->assertNotSame($a['url'], $c['url'], 'different subjects must produce different urls');
    }

    public function test_show_doc_tool_emits_doc_artifact_with_defaults(): void
    {
        $output = (new ShowDocTool())->handle(new ToolRequest(['title' => 'Demo NDA']));
        $payload = json_decode($output, true);

        $this->assertSame('doc', $payload['__artifact']);
        $this->assertSame('Demo NDA', $payload['title']);
        $this->assertSame('application/pdf', $payload['mime']);
        $this->assertSame(4, $payload['pages']);
    }

    public function test_list_links_tool_returns_topic_specific_link_set(): void
    {
        $regoloPayload = json_decode(
            (new ListLinksTool())->handle(new ToolRequest(['topic' => 'Regolo'])),
            true,
        );
        $padosoftPayload = json_decode(
            (new ListLinksTool())->handle(new ToolRequest(['topic' => 'Padosoft'])),
            true,
        );

        $this->assertSame('links', $regoloPayload['__artifact']);
        $this->assertNotEmpty($regoloPayload['links']);
        $this->assertStringContainsString('regolo', strtolower($regoloPayload['links'][0]['url']));

        $padosoftUrls = array_column($padosoftPayload['links'], 'url');
        $this->assertContains('https://padosoft.com', $padosoftUrls);
    }

    public function test_code_snippet_tool_returns_php_snippet(): void
    {
        $payload = json_decode(
            (new CodeSnippetTool())->handle(new ToolRequest([
                'language' => 'php',
                'topic'    => 'streaming a Regolo agent',
            ])),
            true,
        );

        $this->assertSame('code', $payload['__artifact']);
        $this->assertSame('php', $payload['language']);
        $this->assertStringContainsString('AnonymousAgent', $payload['code']);
        $this->assertStringContainsString('regolo', $payload['code']);
    }

    public function test_data_table_tool_returns_a_top5_models_table_by_default(): void
    {
        $payload = json_decode(
            (new DataTableTool())->handle(new ToolRequest(['topic' => 'top regolo models'])),
            true,
        );

        $this->assertSame('table', $payload['__artifact']);
        $this->assertCount(4, $payload['columns']);
        $this->assertCount(5, $payload['rows']);
        $this->assertSame('Llama-3.3-70B-Instruct', $payload['rows'][0][0]);
    }
}
