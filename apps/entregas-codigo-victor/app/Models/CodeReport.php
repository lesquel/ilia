<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CodeReport extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'message_id', 'correlation_id', 'exercise_id', 'requested_by',
        'mode', 'status', 'last_submission_id', 'attempts', 'row_count',
        'file_path', 'error_message', 'started_at', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'exercise_id' => 'integer', 'requested_by' => 'integer',
            'last_submission_id' => 'integer', 'attempts' => 'integer',
            'row_count' => 'integer', 'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
}
