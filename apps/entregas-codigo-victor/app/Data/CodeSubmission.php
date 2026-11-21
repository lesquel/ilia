<?php

namespace App\Data;

final readonly class CodeSubmission
{
    public function __construct(
        public int $exerciseId,
        public string $code,
        public array $history,
        public string $aiUsage,
    ) {}

    public static function fromValidated(array $data): self
    {
        $history = array_map(function (array $step): array {
            $step['code'] ??= '';

            return $step;
        }, $data['history']);

        return new self($data['exercise_id'], $data['code'], $history, $data['ai_usage']);
    }

    public static function summary(array $history): array
    {
        $pastes = array_column(array_filter($history, fn ($step) => $step['kind'] === 'paste'), 'pasted_chars');

        return [
            'step_count' => count($history),
            'paste_count' => count($pastes),
            'largest_paste_chars' => max([0, ...$pastes]),
        ];
    }
}
